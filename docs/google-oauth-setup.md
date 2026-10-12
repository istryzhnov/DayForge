# Налаштування Google OAuth для DayForge

Мета: екран згоди Google показує назву «DayForge», логотип, посилання на політику та умови, і не показує попередження «Google hasn't verified this app».

Це інструкція для власника. Усі заглушки в файлах репозиторію треба замінити на свої значення (список у кінці).

## 0. Що перевірено, а що з пам'яті

- **Перевірено** (офіційні сторінки Google, звірено цього разу): scopes `openid`, `email`, `profile` є non-sensitive, тож повна верифікація з відео не потрібна. Але щоб показувати назву й логотип на екрані згоди, потрібна **brand verification** (облегшена перевірка). Домашня сторінка має бути на домені, який ти володієш, не може бути лише сторінкою входу, і має містити посилання на політику конфіденційності, ідентичне з тим, що вказане на екрані згоди. Політика має бути на тому самому домені, що й домашня сторінка. Усі authorized domains треба підтвердити. Для облікового запису, що є owner або editor проєкту, підтвердження домену робиться через Google Search Console. Вимоги Limited Use (розділ Google API Services User Data Policy) застосовуються до даних, отриманих через Google API.
- **Перевірено через пошукову видачу, не через повну сторінку Google**: логотип 120×120 px, до 1 МБ, формати JPG, PNG або BMP; brand verification зазвичай займає 2–3 робочі дні після подачі. Перед подачею перевір актуальні цифри на сторінці Google.
- **З пам'яті, перевір у консолі**: Testing дозволяє до 100 тестових користувачів і короткий термін дії refresh token (близько 7 днів). Точні назви пунктів меню в консолі можуть відрізнятися.

## 1. Передумови

1. Домен `{{APP_DOMAIN}}` куплений і вказує на хостинг застосунку (HTTPS).
2. Домен підтверджено в Google Search Console як власний (Domain property). Зроби це з того Google-акаунта, який є owner або editor проєкту в Google Cloud. Підтвердження через DNS TXT-запис найнадійніше.
3. Створено проєкт Google Cloud і Supabase-проєкт. Ref Supabase-проєкту: `<project-ref>`, адреса `https://<project-ref>.supabase.co`.
4. Сторінки вже доступні на тому самому домені:
   - `https://{{APP_DOMAIN}}/` (домашня сторінка)
   - `https://{{APP_DOMAIN}}/privacy.html`
   - `https://{{APP_DOMAIN}}/terms.html`
5. Логотип: `frontend/dayforge-app/public/logo-120.png` (120×120 px, PNG). Після вибору варіанта логотипу його буде згенеровано саме в цей файл. Файл 512×512 можна використати в Supabase або в інших місцях, але для екрана згоди потрібен саме 120×120.

## 2. Google Cloud Console: екран згоди

Шлях: **APIs & Services → OAuth consent screen** (у новій консолі: **Google Auth Platform**, розділи Branding, Audience, Data Access).

### Branding

| Поле | Значення |
|---|---|
| App name | `DayForge` |
| User support email | `{{CONTACT_EMAIL}}` |
| App logo | файл `frontend/dayforge-app/public/logo-120.png` (120×120 PNG, до 1 МБ) |
| Application home page | `https://{{APP_DOMAIN}}/` |
| Application privacy policy link | `https://{{APP_DOMAIN}}/privacy.html` |
| Application terms of service link | `https://{{APP_DOMAIN}}/terms.html` |
| Authorized domains | `{{APP_DOMAIN}}` і `<project-ref>.supabase.co` |
| Developer contact information | `{{CONTACT_EMAIL}}` |

Натисни **Save**. Google може попросити підтвердити власність на authorized domains. Якщо домен уже підтверджено в Search Console з того ж акаунта, це пройде автоматично.

### Audience

- **User type: External.** Internal доступний лише з Google Workspace, тут він не підходить.
- **Publishing status:** спочатку залиш **Testing** і додай себе в **Test users**. Коли все працює, перейди на **In production** (кнопка **Publish app**). Для non-sensitive scopes це не потребує повної верифікації застосунку, але brand verification для назви й логотипу треба подати окремо.

### Data Access (scopes)

Додай **тільки** ці три scopes:

- `.../auth/userinfo.email`
- `.../auth/userinfo.profile`
- `openid`

Більше нічого. Перевір у коді: застосунок запитує лише їх (Supabase за замовчуванням додає `openid email profile`, і більше scopes у `src/composables/useAuth.ts` не вказано). Якщо в списку є Gmail, Drive, Calendar або будь-який sensitive/restricted scope, видали його, бо інакше знадобиться повна верифікація з відео.

## 3. Brand verification

1. Після того як Branding заповнено, у консолі з'явиться **Submit for verification** (або повідомлення про brand verification).
2. Подай заявку. Google перевірить:
   - логотип (120×120, без порушення брендингу, не імітує чужий бренд);
   - домашню сторінку (на домені, описує застосунок, не лише логін);
   - політику конфіденційності (доступна за посиланням з домашньої сторінки і з екрана згоди, містить розділ про Google API Services User Data Policy);
   - підтвердження власності на домени.
3. Зазвичай це 2–3 робочі дні. Якщо Google просить уточнення, відповідай на листи з адреси `{{CONTACT_EMAIL}}` швидко, інакше заявка «застрягає».
4. Після схвалення назва й логотип з'являться на екрані згоди. Попередження «unverified app» зникає.

Важливо: якщо змінити логотип після схвалення, його треба перевіряти знову.

## 4. Google Cloud: OAuth client ID

Шлях: **APIs & Services → Credentials → Create credentials → OAuth client ID**.

1. Application type: **Web application**. Name: `DayForge web`.
2. **Authorized JavaScript origins:**
   - `https://{{APP_DOMAIN}}`
   - `http://localhost:5173` (для розробки, опційно; для локального dev-сервера з фронтенду використовуй порт з твого `.env`, наприклад `http://127.0.0.1:5207`, якщо запускаєш так)
3. **Authorized redirect URIs:** лише один:
   - `https://<project-ref>.supabase.co/auth/v1/callback`

   Це адреса, на яку Google повертає користувача. Supabase сам обробляє її і далі перенаправляє в застосунок. Не додавай сюди адреси застосунку.
4. Create. Скопіюй **Client ID** і **Client secret**.

Client secret ніде не коміть і не вставляй у фронтенд. Він потрібен лише Supabase.

## 5. Supabase: провайдер Google

1. Supabase Dashboard → твій проєкт → **Authentication → Sign In / Providers → Google**.
2. Увімкни **Google enabled**.
3. Встав **Client ID** і **Client Secret** з кроку 4.
4. Збережи.

## 6. Supabase: URL Configuration

Шлях: **Authentication → URL Configuration**.

- **Site URL:** `https://{{APP_DOMAIN}}/`
- **Redirect URLs** (додай кожен рядок):
  - `https://{{APP_DOMAIN}}/**`
  - `http://localhost:5173/**` (для розробки)
  - `http://127.0.0.1:5207/**` (для локального dev-сервера, якщо використовуєш його)

Застосунок передає `redirectTo` як `window.location.origin + window.location.pathname`, тож усі адреси, з яких може стартувати вхід, мають бути в цьому списку. Інакше Supabase поверне на Site URL.

Також перевір у Supabase, що в `.env` (або в змінних збірки) стоять `VITE_SUPABASE_URL=https://<project-ref>.supabase.co` і `VITE_SUPABASE_ANON_KEY` (anon key, не service role).

## 7. Перевірка

1. Відкрий `https://{{APP_DOMAIN}}/` в режимі інкогніто.
2. Профіль → Continue with Google. На екрані згоди має бути назва DayForge і логотип, без попередження «unverified».
3. Переконайся, що після входу повертаєшся на `https://{{APP_DOMAIN}}/`, а не на Site URL.
4. Посилання «Terms» і «Privacy Policy» під кнопкою входу і в Settings → Backup and data мають відкриватися.
5. Якщо бачиш помилку `redirect_uri_mismatch` від Google, перевір кроки 4 і 6. Якщо `Invalid redirect` від Supabase, перевір Redirect URLs.

## 8. Заглушки для заміни

У репозиторії (усі файли, які треба підправити перед продакшеном):

| Заглушка | Де | Що вписати |
|---|---|---|
| `{{APP_DOMAIN}}` | `public/privacy.html`, `public/terms.html`, цей документ | домен застосунку, наприклад `dayforge.example` |
| `{{CONTACT_EMAIL}}` | `public/privacy.html`, `public/terms.html`, цей документ | контактна адреса |
| `{{OWNER_NAME}}` | `public/privacy.html`, `public/terms.html` | ім'я або назва особи чи компанії, яка керує застосунком |
| `{{EFFECTIVE_DATE}}` | `public/privacy.html`, `public/terms.html` | дата набрання чинності, наприклад `12 October 2026` |
| `{{COUNTRY}}` | `public/privacy.html`, `public/terms.html` | країна, законодавство якої застосовується |
| `{{SUPABASE_REGION}}` | `public/privacy.html` | регіон Supabase-проєкту, наприклад `eu-central-1` (Frankfurt) |

Заміна робиться пошуком по `{{` у `frontend/dayforge-app/public` і в цьому файлі.

## 9. Що зробити руками (короткий чеклист)

1. Підтвердити домен `{{APP_DOMAIN}}` у Google Search Console.
2. Заповнити Branding у Google Auth Platform (розділ 2).
3. Додати Scopes `email`, `profile`, `openid` і більше нічого.
4. Створити OAuth client ID (Web application) і вписати redirect URI Supabase (розділ 4).
5. Вписати Client ID і Secret у Supabase Google provider і налаштувати URL Configuration (розділи 5 і 6).
6. Замінити всі заглушки (розділ 8).
7. Подати brand verification і дочекатися схвалення (розділ 3).
8. Перевести застосунок з Testing у In production.
