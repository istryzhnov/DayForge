# Деплой MVP: Netlify + Supabase + Google

Ціль: робоча версія DayForge на `https://day-forge-app-is.netlify.app` (перевір точну адресу в Netlify → Site overview), з входом через Google і синхронізацією між компом і телефоном.

У репозиторії вже є:
- `netlify.toml`: Netlify збирає `frontend/dayforge-app` командою `npm run build`, публікує `dist`, Node 22.
- `frontend/dayforge-app/public/_headers`: заголовки безпеки (CSP, X-Frame-Options, HSTS тощо) і довгий кеш для `/assets/*`. Netlify підхоплює цей файл автоматично.
- `public/privacy.html`, `public/terms.html`, логотипи.

Далі `SITE` = адреса сайту на Netlify, `REF` = ідентифікатор проєкту Supabase (піддомен у `VITE_SUPABASE_URL`).

---

## 1. Код на GitHub (2 хв)

```bash
cd ~/code/DayForge
git push git@github.com:istryzhnov/DayForge.git feature/timer:feature/timer
```

Потім на GitHub відкрий PR `feature/timer` → `main` і змерджи його. `main` повністю входить у `feature/timer`, конфліктів не буде. Netlify зазвичай деплоїть саме `main`.

## 2. Supabase (5 хв)

1. **SQL Editor** → встав увесь вміст `supabase/schema.sql` → **Run**. Повторний запуск безпечний: додасться таблиця `active_timer` (синхронізація таймера), а також `settings`, якщо її ще немає. Перевір у **Table Editor**, що є таблиці `goals`, `task_templates`, `daily_tasks`, `time_entries`, `settings`, `active_timer` і `deletions`.
2. **Authentication → URL Configuration**:
   - **Site URL**: `SITE`.
   - **Redirect URLs**: додай `SITE/**` і `http://localhost:5173/**`.
3. **Authentication → Providers → Google**: увімкнено, Client ID і Client Secret з Google Cloud (крок 3). Callback URL, який показує Supabase (`https://REF.supabase.co/auth/v1/callback`), знадобиться в кроці 3.

## 3. Google Cloud (5–10 хв)

**APIs & Services → Credentials → OAuth 2.0 Client ID (Web application)**:
- **Authorized JavaScript origins**: `SITE` і `http://localhost:5173`.
- **Authorized redirect URIs**: `https://REF.supabase.co/auth/v1/callback`.

**OAuth consent screen** для MVP:
- Найшвидше: лишити **Testing** і додати свої акаунти (і акаунти тестувальників) у **Test users**. Вхід працює одразу, без перевірки.
- Для всіх людей: **Publish app → In production**. Scopes у нас лише email, profile і openid (non-sensitive), тож повна верифікація не потрібна. Але поки не пройдеш brand verification, Google показуватиме екран без логотипа. Деталі в `docs/google-oauth-setup.md`; логотип 120×120 лежить у `frontend/dayforge-app/public/logo-120.png`.
- Перед подачею на brand verification заміни заглушки `{{APP_DOMAIN}}`, `{{CONTACT_EMAIL}}`, `{{OWNER_NAME}}`, `{{COUNTRY}}`, `{{EFFECTIVE_DATE}}`, `{{SUPABASE_REGION}}` у `public/privacy.html` і `public/terms.html`.

## 4. Netlify (5 хв)

У проєкті `day-forge-app-is`:
1. **Site configuration → Build & deploy → Continuous deployment**: репозиторій `istryzhnov/DayForge` під'єднано, **Production branch** = `main`. Base directory, build command і publish directory не заповнюй: їх задає `netlify.toml`. Якщо там уже щось вписано вручну, очисти, щоб не конфліктувало.
2. **Site configuration → Environment variables** → додай (scope: Builds; значення з `frontend/dayforge-app/.env.local`):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   Anon key публічний, його можна віддавати в браузер: дані захищає RLS у Supabase. Service-role ключ НІКОЛИ сюди не додавай.
3. **Deploys → Trigger deploy → Clear cache and deploy site**. Збірка має пройти за 1–2 хвилини.

## 5. Перевірка після деплою (10 хв)

- [ ] `SITE` відкривається, у вкладці логотип і назва «DayForge».
- [ ] DevTools → Console: немає червоних помилок, зокрема «Content Security Policy».
- [ ] `curl -sI SITE | grep -i -E "content-security|x-frame|strict-transport"`: заголовки на місці.
- [ ] Вхід через Google на компі працює, після повернення ти залогінений (адреса без `?code=`).
- [ ] Створи задачу на компі → увійди тим самим акаунтом на телефоні → задача з'явилась.
- [ ] Відміть задачу на телефоні → за кілька секунд відмічена на компі.
- [ ] Запусти таймер на компі → за кілька секунд він іде на телефоні; пауза з телефона зупиняє його на компі; в історії один запис.
- [ ] Увімкни авіарежим на телефоні, зміни щось, вимкни авіарежим → зміна доїхала на комп.
- [ ] `SITE/privacy.html` і `SITE/terms.html` відкриваються.

Якщо щось не так: **Deploys → вибрати попередній деплой → Publish deploy** миттєво повертає стару версію.

## 6. Відомі обмеження MVP

- Немає кнопки «Delete account» (видалення серверних даних). У Privacy Policy зараз написано, що видалення робиться через запит на email. Для публічного запуску й Google варто додати цю кнопку.
- Без brand verification на екрані входу Google немає логотипа.
- Основний JS-файл ~600 kB (працює, але можна пришвидшити розбиттям на частини).
