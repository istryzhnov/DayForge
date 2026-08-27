# Docker guide

Everything DayForge needs runs in containers. A machine with Docker (and the
Compose plugin) can start the whole project — no local Node.js, no local
PostgreSQL, no version juggling.

This document is both a reference and an explanation: every setting below says
*why* it is there, so the setup can be changed confidently later.

---

## 1. Commands you actually need

```bash
# development, hot reload
docker compose up --build            # start (rebuild if the Dockerfile changed)
docker compose up -d                 # start in the background
docker compose logs -f frontend      # follow logs
docker compose down                  # stop, keep the database
docker compose down -v               # stop AND delete the database volume

# production-like
POSTGRES_PASSWORD=secret docker compose -f docker-compose.prod.yml up -d --build
```

Dev: http://localhost:5173 · Prod: http://localhost:8080

> A local `.env` in this checkout moves the dev ports to **5174** and **5433**,
> because this machine already runs a Vite dev server on 5173 and PostgreSQL on
> 5432. `.env` is gitignored; delete it to use the defaults.

---

## 2. The mental model

Four concepts, and nothing else, explain the whole setup:

| Concept       | What it is                                          | Here                                   |
| ------------- | --------------------------------------------------- | -------------------------------------- |
| **Image**     | A frozen filesystem + a start command. Read-only.    | Built from `Dockerfile`                |
| **Container** | A running instance of an image. Disposable.          | `dayforge-frontend-1`, `dayforge-db-1` |
| **Volume**    | Storage that outlives containers.                    | `dayforge_db-data`                     |
| **Network**   | A private LAN where services find each other by name | `dayforge_default`                     |

The single most important rule: **a container's own filesystem is thrown away
when it is removed.** Anything that must survive — the database — lives in a
volume. Everything else is rebuilt from the image.

The second most important: **inside the compose network, a service's name is a
hostname.** The frontend reaches the database at `db:5432`, not `localhost`.
`localhost` inside a container means *that container*, not your machine.

---

## 3. The Dockerfile — why four stages

`frontend/dayforge-app/Dockerfile` is *multi-stage*: several `FROM` blocks in
one file. Each `FROM` starts a fresh image; `--from=<stage>` copies files out of
an earlier one. Only the last stage (or the one named with `--target`) ends up
in the final image — everything else is build-time scaffolding that gets thrown
away.

```
deps ──┬──> dev     (target: dev)   Node + vite dev server
       └──> build ──> prod (target: prod)  nginx + dist/, no Node at all
```

**`deps`** — copies *only* `package.json` and `package-lock.json`, then runs
`npm ci`.

Why only the manifests? Docker caches each instruction as a layer and reuses it
while its inputs are unchanged. If we copied the whole source first, editing any
`.vue` file would invalidate the cache and re-run `npm ci` (slow) on every
build. Copying manifests first means dependencies are reinstalled only when
dependencies actually change.

`npm ci` rather than `npm install`: it installs exactly what `package-lock.json`
pins and fails if the lockfile disagrees with `package.json`. Reproducible.

**`dev`** — the dev server. Copies `node_modules` out of `deps`, copies the
source, drops to the non-root `node` user, runs `vite --host 0.0.0.0`.

`--host 0.0.0.0` is not optional. By default Vite binds to `127.0.0.1`, which
inside a container means "only reachable from this container" — the published
port would answer with nothing. Binding to all interfaces lets Docker forward
the host port in.

**`build`** — runs `npm run build` (which is `vue-tsc -b && vite build`, so a
type error fails the image build) and produces `/app/dist`.

**`prod`** — an nginx image that copies in `dist/` from `build` and nothing
else. No Node.js, no `node_modules`, no source. That is the entire point of
multi-stage: the toolchain needed to *build* the app never ships with it.

### Image pinning

```dockerfile
ARG NODE_IMAGE=node:22.23.2-alpine3.24@sha256:c610fcdf...
```

The tag says what it is at a glance; the digest is a cryptographic hash of the
exact image. Tags are mutable — `node:22-alpine` points at different bytes month
to month — so a tag alone means a build today and a build next year can produce
different results. Tag **and** digest gives both readability and
reproducibility. Refresh them deliberately:

```bash
docker pull node:22-alpine
docker image inspect node:22-alpine --format '{{index .RepoDigests 0}}'
```

`alpine` variants are used throughout because they are small (~50 MB vs ~400 MB).

---

## 4. `docker-compose.yml` — the dev stack

### `frontend`

```yaml
build:
  context: ./frontend/dayforge-app
  target: dev
```

`context` is the directory sent to the Docker daemon and the root of every
`COPY` in the Dockerfile. `target` picks which stage to stop at — the same
Dockerfile serves dev and prod.

`.dockerignore` (next to the Dockerfile) excludes things from that context.
`node_modules` is excluded above all: shipping a host `node_modules` into the
build would be slow and, worse, could carry native binaries compiled for the
host's OS into an Alpine container.

```yaml
volumes:
  - ./frontend/dayforge-app:/app
  - /app/node_modules
```

The first line is a **bind mount**: the host folder *replaces* `/app` in the
container, so an edit on the host is instantly visible inside — that is what
makes hot reload work.

The second line looks strange and is essential. The bind mount hides everything
the image had at `/app`, including the `node_modules` installed during the
build. Declaring `/app/node_modules` with no host path creates an **anonymous
volume** at that exact path, which takes precedence over the bind mount and is
seeded from the image. Result: the host's source is used, the container's
`node_modules` is used. Without this line the app cannot start.

Consequence to remember: adding a dependency means rebuilding
(`docker compose up --build`), because `npm ci` runs at build time.

```yaml
environment:
  CHOKIDAR_USEPOLLING: 'true'
```

File-change events do not always cross the bind-mount boundary on macOS and
Windows. Polling costs a little CPU and works everywhere. On native Linux it can
be removed.

### `db`

```yaml
ports:
  - '127.0.0.1:${POSTGRES_PORT:-5432}:5432'
```

`HOST:CONTAINER`. The `127.0.0.1:` prefix binds the host side to loopback only —
the database is reachable from this machine and from other containers, but not
from anyone else on the Wi-Fi. Without the prefix Docker binds `0.0.0.0`.

`${POSTGRES_PORT:-5432}` means "the env var, or 5432 if unset". Every port in
both compose files is written this way, so a port clash is fixed by editing
`.env` rather than the compose file.

```yaml
healthcheck:
  test: ['CMD-SHELL', 'pg_isready -U ... -d ...']
```

A container being "up" does not mean PostgreSQL is accepting connections —
first boot runs `initdb` and takes seconds. The healthcheck runs `pg_isready`
until it succeeds, which is what `depends_on: condition: service_healthy` (in
the commented-out backend service) waits for. Plain `depends_on` only waits for
the container to *start*, which is almost always the wrong thing.

---

## 5. `docker-compose.prod.yml` — the production stack

Deliberately a **standalone file**, not an overlay. Compose supports
`-f base.yml -f prod.yml` merging, but merged semantics are subtle (lists append,
maps merge) and a deploy is the worst place to be surprised. This file is read
top to bottom as-is.

Differences from dev:

- `target: prod` — static files under nginx, no dev server, no bind mount, so
  the image is self-contained and can be shipped anywhere.
- `POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:?set POSTGRES_PASSWORD in .env}` — the
  `:?` form makes Compose **refuse to start** with a clear error if the variable
  is missing, instead of silently using a default password in production.
- **No `ports:` on `db`.** The database is reachable only inside the compose
  network. Nothing on the host can connect to it. This is the strongest possible
  setting and costs nothing, because only the backend needs it.
- Resource limits (`deploy.resources.limits`) so one runaway container cannot
  take the host down.

Both files declare `name: dayforge`, so they share the same project — and
therefore the same `db-data` volume. Dev and prod see the same data on this
machine.

---

## 6. Container hardening — what and why

Applied to the prod frontend and verified in a running container:

| Setting                        | Effect                                                       |
| ------------------------------ | ------------------------------------------------------------ |
| `nginx-unprivileged` image     | Runs as uid 101, not root. Listens on 8080 (>1024) so it needs no privileged-port capability. |
| `read_only: true`              | The container's filesystem is mounted read-only. A compromise cannot drop a file anywhere. |
| `tmpfs: [/tmp, /var/cache/nginx]` | The two paths nginx must write to, backed by RAM and wiped on restart. Required for `read_only` to work. |
| `cap_drop: [ALL]`              | Removes every Linux capability. nginx here needs none.       |
| `no-new-privileges:true`       | A process inside can never gain more privileges than it started with, even via setuid binaries. |

The dev frontend also runs non-root, as the `node` user. That user is uid 1000
in the Node image, which matches a typical Linux host user, so the bind-mounted
source stays writable. On a host where `id -u` is not 1000, either add
`user: "${UID}:${GID}"` to the dev service or keep dev as root — it is a local
dev server, and prod is the part that matters.

Note that `read_only` is *not* applied to PostgreSQL: it writes to its data
directory and to runtime paths by design.

---

## 7. `nginx.conf` — three things it does

```nginx
location / { try_files $uri $uri/ /index.html; }
```

**SPA fallback.** A Vue app owns its routing client-side, so a hard refresh on
`/settings` asks nginx for a file that does not exist. `try_files` says: try the
file, try a directory, otherwise serve `index.html` and let the app route. Skip
this and every deep link 404s.

```nginx
location /assets/ { add_header Cache-Control "public, max-age=31536000, immutable"; }
```

Vite puts a content hash in every built filename (`index-BBMwpNBh.js`). Change
the code and the filename changes, so the old URL can be cached forever.
`immutable` also stops browsers from sending revalidation requests. `index.html`
is deliberately `no-cache` — it is the small file that points at the hashed
ones, and it must always be fresh.

The `/api/` proxy block is present but commented out. Leave it that way until a
backend exists: nginx resolves `proxy_pass` hostnames at startup, so pointing at
a missing `backend` host makes nginx refuse to boot.

---

## 8. The database

Data lives in the named volume `dayforge_db-data` and survives
`docker compose down`. Only `down -v` deletes it.

`db/init/` is mounted at `/docker-entrypoint-initdb.d`. The Postgres image runs
`*.sql` and `*.sh` from there **once — only when the data directory is empty.**
Put schema bootstrap there.

**The gotcha that costs an hour:** `POSTGRES_PASSWORD` is applied only at that
first initialization. Change it later and the container starts fine but the old
password still works, because the credentials live in the volume, not the
environment. To genuinely reset:

```bash
docker compose down -v && docker compose up -d
```

Useful:

```bash
docker compose exec db psql -U dayforge -d dayforge
docker compose exec db pg_dump -U dayforge dayforge > backup.sql
```

---

## 9. Ports

| Variable        | Default | Used by                |
| --------------- | ------- | ---------------------- |
| `FRONTEND_PORT` | 5173    | dev — Vite             |
| `POSTGRES_PORT` | 5432    | dev — PostgreSQL       |
| `HTTP_PORT`     | 8080    | prod — nginx           |
| `BACKEND_PORT`  | 3000    | dev — backend (future) |

Only the *host* side is configurable. Ports inside containers are fixed, which
is fine — each container has its own network namespace, so nothing collides.

---

## 10. Adding the Node.js backend

1. Create `./backend` with a `Dockerfile` shaped like the frontend's: a `deps`
   stage, a `dev` stage running the watcher, a `build` stage, and a `prod` stage
   running `node dist/server.js` as a non-root user.
2. Uncomment the `backend:` service in **both** compose files.
3. Uncomment the `/api/` block in `frontend/dayforge-app/nginx.conf`.

The connection string is already written into the commented service:

```
postgres://dayforge:dayforge@db:5432/dayforge
```

`db` — the service name, resolved by Docker's DNS. `5432` — the port *inside*
the container, unaffected by whatever `POSTGRES_PORT` maps on the host.

`depends_on: db: condition: service_healthy` is wired, so the backend starts
only after PostgreSQL passes `pg_isready`. Still make the app retry its first
connection: healthy at start does not mean reachable forever.

In dev the browser talks to Vite on 5173 and needs a proxy for `/api` — add one
in `vite.config.ts` (`server.proxy`) pointing at `http://backend:3000`. In prod
nginx does that job. Two different mechanisms, same URL shape for the app code.

---

## 11. Debugging

```bash
docker compose ps                       # what is running, on which ports
docker compose logs -f <service>        # follow logs
docker compose exec <service> sh        # shell inside a running container
docker compose exec db psql -U dayforge -d dayforge
docker compose config                   # the fully resolved config, .env applied
docker compose config -q                # validate only; silent means valid
docker compose build --no-cache frontend  # rebuild ignoring layer cache
docker compose exec frontend nslookup db  # does service DNS resolve?
docker stats                            # live CPU/memory
```

`docker compose config` is the first thing to run when a variable does not seem
to apply — it shows exactly what Compose resolved.

### Things that actually went wrong here

- **A published port silently did not appear.** `docker compose ps` showed an
  empty `PORTS` column because the host port was already taken by a local
  PostgreSQL. Check with `ss -ltnp | grep 5432` and change the port in `.env`.
- **`password authentication failed` right after changing `.env`.** The volume
  had been initialized with the old password. See §8.
- **DNS resolution failing between services.** A container left over from an
  aborted `up` was not attached to the network. `docker compose down` and up
  again fixes it.
- **Verifying HMR needs a client.** Vite only logs `hmr update` when a browser
  is connected. To test without one, open a websocket to `ws://localhost:5173/`
  with the `vite-hmr` subprotocol and watch for messages after touching a file.

---

## 12. File map

| Path                                | Purpose                                  |
| ----------------------------------- | ---------------------------------------- |
| `docker-compose.yml`                | dev stack                                |
| `docker-compose.prod.yml`           | prod stack                               |
| `.env` / `.env.example`             | host ports and DB credentials            |
| `frontend/dayforge-app/Dockerfile`  | `deps` → `dev`, `build` → `prod`         |
| `frontend/dayforge-app/nginx.conf`  | SPA serving, caching, future `/api` proxy |
| `frontend/dayforge-app/.dockerignore` | what never enters the build context    |
| `db/init/`                          | one-time SQL bootstrap                   |
