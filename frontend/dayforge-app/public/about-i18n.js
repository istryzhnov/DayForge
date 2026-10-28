/*
 * Language for the About page (public/about.html). A plain script with no
 * build step, loaded with defer, so it works under the strict CSP
 * (script-src 'self', no inline scripts).
 *
 * Language, first match wins:
 *   1. ?lang=xx in the URL
 *   2. format.language in the app settings (localStorage dayforge-settings-v1)
 *   3. the browser languages (navigator.languages)
 *   4. English
 *
 * English is the text already in about.html, so the page reads correctly with
 * JavaScript off and for crawlers. DICT holds every other language, keyed by
 * the data-i18n names used in the page:
 *   data-i18n="key"          sets textContent
 *   data-i18n-html="key"     sets innerHTML (our own strings only, may hold <kbd>, <a>)
 *   data-i18n-attr="a:key"   sets attribute a (comma-separated pairs allowed)
 */
(function () {
  'use strict';

  var SUPPORTED = ['en', 'uk', 'pl', 'de', 'zh', 'es'];
  var SETTINGS_KEY = 'dayforge-settings-v1';
  var DEFAULT_LANG = 'en';
  var HTML_LANG = { zh: 'zh-Hans' };

  var DICT = {
    uk: {
      pageTitle: 'DayForge · Плануйте день, відстежуйте час, тримайте звички',
      metaDescription: 'DayForge — безкоштовний планувальник, який поєднує завдання й проєкти, звички, календар, облік часу з погодинними ставками та аналітику, канбан-дошку і нотатки. Працює офлайн і синхронізується між пристроями.',
      shortDescription: 'Безкоштовний планувальник завдань, звичок, календаря, обліку часу та заробітку. Працює офлайн і синхронізується між вашими пристроями.',
      skipLink: 'Перейти до вмісту',
      homeLabel: 'DayForge — на головну',
      sectionsLabel: 'Розділи сторінки',
      navWhy: 'Чому DayForge',
      navFeatures: 'Можливості',
      navFaq: 'Питання',
      openApp: 'Відкрити DayForge',
      heroEyebrow: 'Планувальник завдань, звичок і часу',
      heroLead: 'Плануйте день, відстежуйте час, тримайте звички — в одному місці, яке працює офлайн.',
      seeHow: 'Як це працює',
      shotToday: 'Список завдань DayForge у різних проєктах: кольорові мітки проєктів, виконані завдання та найближчі часи',
      whyTitle: 'Одне місце для плану, годин і звичок',
      whyLead: 'Більшість інструментів покривають одну частину роботи. DayForge тримає їх разом, тож записаний час завжди пов’язаний зі справою, для якої його витратили.',
      compareToggl: 'Порівняно з Toggl',
      togglVerdict: 'Toggl фіксує час. DayForge ще показує, на що він був витрачений.',
      togglBody: 'Завдання, проєкти, календар і звички розташовані поруч із таймером, а заробіток рахується за погодинними ставками та фіксованими цінами, які ви задаєте для кожного проєкту.',
      compareNotion: 'Порівняно з Notion',
      notionVerdict: 'Notion — це чистий аркуш. DayForge готовий уже в перший день.',
      notionBody: 'Систему не потрібно будувати самостійно. Планувальник, таймер і аналітика працюють одразу, і вони лишаються робочими офлайн, без з’єднання.',
      pillarPlanTitle: 'План + звички + час + заробіток',
      pillarPlanBody: 'Усе про ваш день в одному застосунку, а цифри поруч із планом.',
      pillarOfflineTitle: 'Спочатку офлайн',
      pillarOfflineBody: 'Ваші дані зберігаються на пристрої. Застосунок відкривається й працює без з’єднання.',
      pillarKeyboardTitle: 'Швидко з клавіатурою',
      pillarKeyboardBody: 'Швидке додавання, пошук через <kbd>Ctrl</kbd> + <kbd>K</kbd> і гарячі клавіші для найчастіших дій.',
      pillarFreeTitle: 'Безкоштовно для старту',
      pillarFreeBody: 'Для початку обліковий запис не потрібен. Увійдіть через Google, лише коли хочете синхронізацію.',
      featuresTitle: 'Усе, що потрібно робочому дню',
      featTasksTitle: 'Завдання і проєкти',
      featTasksBody: 'Групуйте роботу в проєкти з власними кольорами. Додавайте завдання з датою, часом і повтором і бачте, що далі.',
      featCalendarTitle: 'Календар',
      featCalendarBody: 'Перегляд за днями, тижнями й місяцями. Фільтруйте за проєктом, щоб бачити одну частину роботи за раз.',
      featTimerTitle: 'Таймер, ставки та аналітика',
      featTimerBody: 'Запустіть таймер на будь-якому завданні. Задайте погодинну ставку або фіксовану ціну для проєкту й дізнайтеся, скільки коштують ваші години.',
      featHabitsTitle: 'Звички і серії',
      featHabitsBody: 'Відстежуйте звички, які хочете зберегти. Кожен день, коли ви виконуєте звичку, додає до серії, а місячний вигляд показує закономірність.',
      featBoardTitle: 'Необов’язкова канбан-дошка',
      featBoardBody: 'Увімкніть дошку для будь-якого проєкту й переміщуйте завдання між колонками. Перетягуйте картки між ними.',
      featNotesTitle: 'Нотатки',
      featNotesBody: 'Пишіть нотатки до завдань і проєктів, щоб контекст був поруч із роботою, до якої він належить.',
      featSearchTitle: 'Пошук через Ctrl+K',
      featSearchBody: 'Знайдіть будь-яке завдання, проєкт чи нотатку з будь-якого місця в застосунку. Одна комбінація клавіш, жодних меню.',
      featAppTitle: 'Застосунок для встановлення і синхронізація',
      featAppBody: 'Встановіть DayForge з браузера й користуйтеся ним як застосунком. Увійдіть через Google, щоб синхронізувати пристрої.',
      howEyebrow: 'Як це працює',
      howTitle: 'Від порожньої сторінки до запланованого дня',
      step1Title: 'Налаштуйте свій день',
      step1Body: 'Початкове налаштування ставить кілька запитань і додає стартові завдання, тож ви починаєте з плану, а не з порожнього списку.',
      step2Title: 'Плануйте і відстежуйте',
      step2Body: 'Ставте завдання в календар, запускайте таймер, коли починаєте, і відмічайте звички щодня.',
      step3Title: 'Перегляньте результати',
      step3Body: 'Переглядайте тиждень у календарі, а години та заробіток в аналітиці. Коригуйте план на основі побаченого.',
      calendarAlt: 'Тижневий календар DayForge: завдання з часом позначені кольорами проєктів',
      calendarTitle: 'Тижневий календар',
      calendarCaption: 'Завдання з часом за проєктами — тиждень одним поглядом.',
      analyticsAlt: 'Аналітика DayForge: відстежені години, заробіток за погодинною ставкою та частка часу за проєктами',
      analyticsTitle: 'Аналітика',
      analyticsCaption: 'Відстежені години та заробіток за проєктами: фіксовані ціни поруч із погодинними ставками.',
      boardAlt: 'Канбан-дошка проєкту в DayForge: завдання в колонках «До виконання», «У роботі» і «Готово»',
      boardTitle: 'Дошка проєкту',
      boardCaption: 'Необов’язковий канбан-вигляд для будь-якого проєкту.',
      faqTitle: 'Про що найчастіше питають',
      faq1Q: 'Це безкоштовно?',
      faq1A: 'Так. Почати можна безкоштовно, і обліковий запис не потрібен. Вхід через Google необов’язковий і лише додає синхронізацію між вашими пристроями.',
      faq2Q: 'Чи працює без інтернету?',
      faq2A: 'Так. Застосунок відкривається і працює без з’єднання, а ваші зміни зберігаються на пристрої. Коли ви онлайн і ввійшли в обліковий запис, зміни синхронізуються з іншими пристроями.',
      faq3Q: 'Де зберігаються мої дані?',
      faq3A: 'На вашому пристрої, у вашому браузері. Якщо ви ввійдете через Google, ваші проєкти, завдання й відстежений час також синхронізуються з базою даних, щоб пристрої могли ними обмінюватися. Без входу нічого не покидає ваш браузер.',
      faq4Q: 'Чи можна користуватися на телефоні?',
      faq4A: 'Так. Відкрийте DayForge у браузері телефона й встановіть його через меню браузера (наприклад, «Додати на початковий екран»). Далі він відкриватиметься як застосунок.',
      faq5Q: 'Як видалити мої дані?',
      faq5A: 'Відкрийте «Налаштування», перейдіть до «Резервна копія і дані» й оберіть «Видалити всі проєкти й завдання». Є короткий час на скасування. Якщо ви ввійшли в обліковий запис, дані очищаються і на всіх пристроях. Щоб видалити обліковий запис і дані на сервері, напишіть на <a href="mailto:thetotemofficial@gmail.com">thetotemofficial@gmail.com</a>. Очищення даних сайту у вашому браузері видаляє локальну копію.',
      finalTitle: 'Почніть із сьогодні',
      finalBody: 'Відкрийте DayForge, налаштуйте перший день і побачте, як план, таймер і звички працюють разом.',
      backFeatures: 'Назад до можливостей',
      footerLegalLabel: 'Юридичні посилання та застосунок',
      footerPrivacy: 'Політика конфіденційності',
      footerTerms: 'Умови використання',
      footerApp: 'Відкрити застосунок',
      copyright: '© 2026 DayForge',
      langLabel: 'Мова',
    },
    pl: {
      pageTitle: 'DayForge · Planuj dzień, mierz czas, utrzymuj nawyki',
      metaDescription: 'DayForge to darmowy planer, który łączy zadania i projekty, nawyki, kalendarz, śledzenie czasu ze stawkami godzinowymi i analitykę, tablicę kanban oraz notatki. Działa offline i synchronizuje się między urządzeniami.',
      shortDescription: 'Darmowy planer zadań, nawyków, kalendarza, śledzenia czasu i zarobków. Działa offline i synchronizuje się między Twoimi urządzeniami.',
      skipLink: 'Przejdź do treści',
      homeLabel: 'DayForge — strona główna',
      sectionsLabel: 'Sekcje strony',
      navWhy: 'Dlaczego DayForge',
      navFeatures: 'Funkcje',
      navFaq: 'FAQ',
      openApp: 'Otwórz DayForge',
      heroEyebrow: 'Planer zadań, nawyków i czasu',
      heroLead: 'Planuj dzień, mierz czas, utrzymuj nawyki — w jednym miejscu, które działa offline.',
      seeHow: 'Zobacz, jak to działa',
      shotToday: 'Lista zadań DayForge z różnych projektów, z kolorowymi etykietami projektów, zrobionymi zadaniami i nadchodzącymi terminami',
      whyTitle: 'Jedno miejsce na plan, godziny i nawyki',
      whyLead: 'Większość narzędzi obejmuje tylko jedną część pracy. DayForge trzyma je razem, więc zapisany czas jest powiązany z zadaniem, do którego należy.',
      compareToggl: 'W porównaniu z Toggl',
      togglVerdict: 'Toggl mierzy czas. DayForge pokazuje też, na co ten czas poszedł.',
      togglBody: 'Zadania, projekty, kalendarz i nawyki są obok timera, a zarobki wynikają ze stawek godzinowych i stałych cen, które ustawiasz dla każdego projektu.',
      compareNotion: 'W porównaniu z Notion',
      notionVerdict: 'Notion to czysta kartka. DayForge jest gotowy od pierwszego dnia.',
      notionBody: 'Nie musisz budować systemu sam. Planer, timer i analityka działają od razu i nadal działają offline, bez połączenia.',
      pillarPlanTitle: 'Plan + nawyki + czas + zarobki',
      pillarPlanBody: 'Wszystko o Twoim dniu w jednej aplikacji, z liczbami obok planu.',
      pillarOfflineTitle: 'Najpierw offline',
      pillarOfflineBody: 'Twoje dane są na urządzeniu. Aplikacja otwiera się i działa bez połączenia.',
      pillarKeyboardTitle: 'Szybko z klawiaturą',
      pillarKeyboardBody: 'Szybkie dodawanie, wyszukiwanie przez <kbd>Ctrl</kbd> + <kbd>K</kbd> i skróty do najczęstszych czynności.',
      pillarFreeTitle: 'Darmowy start',
      pillarFreeBody: 'Na start nie potrzebujesz konta. Zaloguj się przez Google dopiero wtedy, gdy chcesz synchronizować.',
      featuresTitle: 'Wszystko, czego potrzebuje dzień pracy',
      featTasksTitle: 'Zadania i projekty',
      featTasksBody: 'Grupuj pracę w projekty z własnymi kolorami. Dodawaj zadania z datą, godziną i powtarzaniem i zobacz, co jest następne.',
      featCalendarTitle: 'Kalendarz',
      featCalendarBody: 'Widoki dnia, tygodnia i miesiąca. Filtruj według projektu, by widzieć jedną część pracy naraz.',
      featTimerTitle: 'Timer, stawki i analityka',
      featTimerBody: 'Uruchom timer przy dowolnym zadaniu. Ustaw stawkę godzinową lub stałą cenę za projekt i zobacz, ile warte są Twoje godziny.',
      featHabitsTitle: 'Nawyki i serie',
      featHabitsBody: 'Śledź nawyki, które chcesz utrzymać. Każdy dzień, w którym wykonasz nawyk, wydłuża serię, a widok miesięczny pokazuje wzorzec.',
      featBoardTitle: 'Opcjonalna tablica kanban',
      featBoardBody: 'Włącz tablicę dla dowolnego projektu i przenoś zadania między kolumnami. Przeciągaj zadania między nimi.',
      featNotesTitle: 'Notatki',
      featNotesBody: 'Pisz notatki do zadań i projektów, aby kontekst był obok pracy, do której należy.',
      featSearchTitle: 'Szukaj przez Ctrl+K',
      featSearchBody: 'Znajdź dowolne zadanie, projekt lub notatkę z dowolnego miejsca w aplikacji. Jeden skrót, bez przeklikiwania menu.',
      featAppTitle: 'Aplikacja do instalacji i synchronizacja',
      featAppBody: 'Zainstaluj DayForge z przeglądarki i używaj go jak aplikacji. Zaloguj się przez Google, by synchronizować urządzenia.',
      howEyebrow: 'Jak to działa',
      howTitle: 'Od pustej strony do zaplanowanego dnia',
      step1Title: 'Ustaw swój dzień',
      step1Body: 'Konfiguracja pierwszego dnia zadaje kilka pytań i dodaje zadania startowe, więc zaczynasz od planu, a nie od pustej listy.',
      step2Title: 'Planuj i śledź',
      step2Body: 'Planuj zadania w kalendarzu, uruchamiaj timer, gdy zaczynasz, i odhaczaj nawyki każdego dnia.',
      step3Title: 'Przejrzyj wyniki',
      step3Body: 'Sprawdzaj tydzień w kalendarzu, a godziny i zarobki w analityce. Koryguj plan na podstawie tego, co widzisz.',
      calendarAlt: 'Tygodniowy kalendarz DayForge z zadaniami o określonej godzinie, oznaczonymi kolorami projektów',
      calendarTitle: 'Kalendarz tygodnia',
      calendarCaption: 'Zadania z godzinami według projektów — tydzień na pierwszy rzut oka.',
      analyticsAlt: 'Analityka DayForge: zarejestrowane godziny, zarobki według stawki godzinowej i udział czasu w projektach',
      analyticsTitle: 'Analityka',
      analyticsCaption: 'Zarejestrowane godziny i zarobki w każdym projekcie, z cenami stałymi obok stawek godzinowych.',
      boardAlt: 'Tablica kanban projektu w DayForge z zadaniami w kolumnach „Do zrobienia”, „W trakcie” i „Zrobione”',
      boardTitle: 'Tablica projektu',
      boardCaption: 'Opcjonalny widok kanban dla dowolnego projektu.',
      faqTitle: 'O co ludzie najczęściej pytają',
      faq1Q: 'Czy to jest darmowe?',
      faq1A: 'Tak. Możesz zacząć za darmo i nie potrzebujesz konta. Logowanie przez Google jest opcjonalne i służy tylko do synchronizacji między urządzeniami.',
      faq2Q: 'Czy działa offline?',
      faq2A: 'Tak. Aplikacja otwiera się i działa bez połączenia, a Twoje zmiany są zapisywane na urządzeniu. Gdy jesteś online i zalogowany, trafiają na Twoje inne urządzenia.',
      faq3Q: 'Gdzie są przechowywane moje dane?',
      faq3A: 'Na Twoim urządzeniu, w przeglądarce. Jeśli zalogujesz się przez Google, Twoje projekty, zadania i zarejestrowany czas są też synchronizowane z bazą danych, aby urządzenia mogły je udostępniać. Bez logowania nic nie opuszcza przeglądarki.',
      faq4Q: 'Czy mogę używać tego na telefonie?',
      faq4A: 'Tak. Otwórz DayForge w przeglądarce telefonu i zainstaluj go z menu przeglądarki (na przykład „Dodaj do ekranu głównego”). Od tej pory otwiera się jak aplikacja.',
      faq5Q: 'Jak usunąć swoje dane?',
      faq5A: 'Otwórz Ustawienia, przejdź do „Kopia zapasowa i dane” i wybierz „Usuń wszystkie projekty i zadania”. Krótko można cofnąć tę operację, a jeśli jesteś zalogowany, konto zostaje wyczyszczone na wszystkich urządzeniach. Aby usunąć konto i dane na serwerze, napisz na <a href="mailto:thetotemofficial@gmail.com">thetotemofficial@gmail.com</a>. Wyczyszczenie danych witryny w przeglądarce usuwa lokalną kopię.',
      finalTitle: 'Zacznij od dziś',
      finalBody: 'Otwórz DayForge, ustaw pierwszy dzień i zobacz, jak plan, timer i nawyki współgrają ze sobą.',
      backFeatures: 'Wróć do funkcji',
      footerLegalLabel: 'Linki prawne i aplikacja',
      footerPrivacy: 'Polityka prywatności',
      footerTerms: 'Regulamin',
      footerApp: 'Otwórz aplikację',
      copyright: '© 2026 DayForge',
      langLabel: 'Język',
    },
    de: {
      pageTitle: 'DayForge · Plane deinen Tag, erfasse deine Zeit, halte deine Gewohnheiten',
      metaDescription: 'DayForge ist ein kostenloser Planer, der Aufgaben und Projekte, Gewohnheiten, Kalender, Zeiterfassung mit Stundensätzen und Auswertung, ein Kanban-Board und Notizen vereint. Er funktioniert offline und synchronisiert sich zwischen den Geräten.',
      shortDescription: 'Ein kostenloser Planer für Aufgaben, Gewohnheiten, Kalender, Zeiterfassung und Einnahmen. Funktioniert offline und synchronisiert sich über alle deine Geräte.',
      skipLink: 'Zum Inhalt springen',
      homeLabel: 'DayForge – Startseite',
      sectionsLabel: 'Seitenabschnitte',
      navWhy: 'Warum DayForge',
      navFeatures: 'Funktionen',
      navFaq: 'FAQ',
      openApp: 'DayForge öffnen',
      heroEyebrow: 'Planer für Aufgaben, Gewohnheiten und Zeit',
      heroLead: 'Plane deinen Tag, erfasse deine Zeit, halte deine Gewohnheiten – an einem Ort, der auch offline funktioniert.',
      seeHow: 'So funktioniert’s',
      shotToday: 'DayForge-Aufgabenliste über mehrere Projekte, mit farbigen Projektmarkierungen, erledigten Aufgaben und anstehenden Zeiten',
      whyTitle: 'Ein Ort für Plan, Stunden und Gewohnheiten',
      whyLead: 'Die meisten Tools decken nur einen Teil der Arbeit ab. DayForge hält alles zusammen, sodass die erfasste Zeit immer zu der Arbeit gehört, für die du sie aufgewendet hast.',
      compareToggl: 'Im Vergleich zu Toggl',
      togglVerdict: 'Toggl erfasst die Zeit. DayForge zeigt außerdem, wofür sie war.',
      togglBody: 'Deine Aufgaben, Projekte, dein Kalender und deine Gewohnheiten liegen direkt neben dem Timer. Einnahmen ergeben sich aus den Stundensätzen und Festpreisen, die du pro Projekt festlegst.',
      compareNotion: 'Im Vergleich zu Notion',
      notionVerdict: 'Notion ist eine leere Leinwand. DayForge ist vom ersten Tag an einsatzbereit.',
      notionBody: 'Du musst das System nicht selbst bauen. Planer, Timer und Auswertung funktionieren direkt nach dem Start und auch offline, ohne Verbindung.',
      pillarPlanTitle: 'Plan + Gewohnheiten + Zeit + Einnahmen',
      pillarPlanBody: 'Alles über deinen Tag in einer App, mit den Zahlen direkt neben dem Plan.',
      pillarOfflineTitle: 'Offline zuerst',
      pillarOfflineBody: 'Deine Daten liegen auf deinem Gerät. Die App öffnet sich und funktioniert ohne Verbindung.',
      pillarKeyboardTitle: 'Schnell per Tastatur',
      pillarKeyboardBody: 'Schnelles Hinzufügen, Suche mit <kbd>Strg</kbd> + <kbd>K</kbd> und Kurzbefehle für die häufigsten Aktionen.',
      pillarFreeTitle: 'Kostenlos starten',
      pillarFreeBody: 'Zum Start brauchst du kein Konto. Melde dich nur mit Google an, wenn du synchronisieren möchtest.',
      featuresTitle: 'Alles, was ein Arbeitstag braucht',
      featTasksTitle: 'Aufgaben und Projekte',
      featTasksBody: 'Fasse Arbeit in Projekten mit eigenen Farben zusammen. Lege Aufgaben mit Datum, Uhrzeit und Wiederholung an und sieh, was als Nächstes ansteht.',
      featCalendarTitle: 'Kalender',
      featCalendarBody: 'Tages-, Wochen- und Monatsansicht. Filtere nach Projekt, um jeweils einen Teil deiner Arbeit zu sehen.',
      featTimerTitle: 'Timer, Stundensätze und Auswertung',
      featTimerBody: 'Starte einen Timer bei jeder Aufgabe. Lege einen Stundensatz oder einen Festpreis pro Projekt fest und sieh, was deine Stunden wert sind.',
      featHabitsTitle: 'Gewohnheiten und Serien',
      featHabitsBody: 'Verfolge die Gewohnheiten, die du beibehalten willst. Jeder Tag, an dem du eine erledigst, verlängert deine Serie, und die Monatsansicht zeigt das Muster.',
      featBoardTitle: 'Optionales Kanban-Board',
      featBoardBody: 'Schalte für jedes Projekt ein Board ein und verschiebe Aufgaben zwischen den Spalten. Ziehe sie einfach per Drag & Drop.',
      featNotesTitle: 'Notizen',
      featNotesBody: 'Schreibe Notizen zu Aufgaben und Projekten, damit der Kontext immer neben der Arbeit steht, zu der er gehört.',
      featSearchTitle: 'Suche mit Strg+K',
      featSearchBody: 'Finde jede Aufgabe, jedes Projekt und jede Notiz von überall in der App. Ein Kurzbefehl, keine Menüs, durch die du dich klicken musst.',
      featAppTitle: 'Installierbare App und Synchronisierung',
      featAppBody: 'Installiere DayForge direkt aus dem Browser und nutze es wie eine App. Melde dich mit Google an, um deine Geräte synchron zu halten.',
      howEyebrow: 'So funktioniert’s',
      howTitle: 'Von der leeren Seite zum geplanten Tag',
      step1Title: 'Richte deinen Tag ein',
      step1Body: 'Die Ersteinrichtung stellt ein paar Fragen und legt Starter-Aufgaben an. So beginnst du mit einem Plan statt mit einer leeren Liste.',
      step2Title: 'Planen und erfassen',
      step2Body: 'Plane Aufgaben im Kalender, starte den Timer, sobald du anfängst, und hake deine Gewohnheiten jeden Tag ab.',
      step3Title: 'Ergebnisse prüfen',
      step3Body: 'Sieh dir deine Woche im Kalender und deine Stunden und Einnahmen in der Auswertung an. Passe den Plan an, was du siehst.',
      calendarAlt: 'DayForge-Wochenkalender mit zeitgebundenen Aufgaben, farblich nach Projekt markiert',
      calendarTitle: 'Wochenkalender',
      calendarCaption: 'Zeitgebundene Aufgaben nach Projekt – eine Woche auf einen Blick.',
      analyticsAlt: 'DayForge-Auswertung mit erfassten Stunden, Einnahmen nach Stundensatz und Zeitanteil pro Projekt',
      analyticsTitle: 'Auswertung',
      analyticsCaption: 'Erfasste Stunden und Einnahmen pro Projekt, Festpreise neben Stundensätzen.',
      boardAlt: 'DayForge-Kanban-Board eines Projekts mit Aufgaben in den Spalten „Zu erledigen“, „In Arbeit“ und „Erledigt“',
      boardTitle: 'Projekt-Board',
      boardCaption: 'Eine optionale Kanban-Ansicht für jedes Projekt.',
      faqTitle: 'Was Leute oft fragen',
      faq1Q: 'Ist es kostenlos?',
      faq1A: 'Ja. Du kannst kostenlos starten, ein Konto brauchst du nicht. Die Anmeldung mit Google ist optional und fügt nur die Synchronisierung zwischen deinen Geräten hinzu.',
      faq2Q: 'Funktioniert es offline?',
      faq2A: 'Ja. Die App öffnet sich und funktioniert ohne Verbindung, und deine Änderungen werden auf dem Gerät gespeichert. Wenn du online und angemeldet bist, werden sie auf deine anderen Geräte übertragen.',
      faq3Q: 'Wo werden meine Daten gespeichert?',
      faq3A: 'Auf deinem Gerät, im Browser. Wenn du dich mit Google anmeldest, werden deine Projekte, Aufgaben und erfasste Zeit zusätzlich in eine Datenbank synchronisiert, damit deine Geräte sie teilen können. Ohne Anmeldung verlässt nichts deinen Browser.',
      faq4Q: 'Kann ich es auf dem Handy nutzen?',
      faq4A: 'Ja. Öffne DayForge im Browser deines Handys und installiere es über das Browser-Menü (zum Beispiel „Zum Home-Bildschirm hinzufügen“). Danach öffnet es sich wie eine App.',
      faq5Q: 'Wie lösche ich meine Daten?',
      faq5A: 'Öffne die Einstellungen, wechsle zu „Backup und Daten“ und wähle „Alle Projekte und Aufgaben löschen“. Danach gibt es eine kurze Frist zum Rückgängigmachen. Bist du angemeldet, werden auch dein Konto und die Daten auf allen Geräten geleert. Um dein Konto und die Serverdaten zu löschen, schreib an <a href="mailto:thetotemofficial@gmail.com">thetotemofficial@gmail.com</a>. Das Löschen der Website-Daten im Browser entfernt die lokale Kopie.',
      finalTitle: 'Fang heute an',
      finalBody: 'Öffne DayForge, richte deinen ersten Tag ein und sieh, wie Plan, Timer und Gewohnheiten zusammenpassen.',
      backFeatures: 'Zurück zu den Funktionen',
      footerLegalLabel: 'Rechtliches und App-Links',
      footerPrivacy: 'Datenschutzerklärung',
      footerTerms: 'Nutzungsbedingungen',
      footerApp: 'App öffnen',
      copyright: '© 2026 DayForge',
      langLabel: 'Sprache',
    },
    zh: {
      pageTitle: 'DayForge · 规划每一天，记录每一小时，坚持每个习惯',
      metaDescription: 'DayForge 是一款免费规划工具，集任务与项目、习惯、日历、按时薪计算的时间跟踪与数据分析、看板和备注于一体。支持离线使用，并可在多台设备间同步。',
      shortDescription: '免费的任务、习惯、日历、时间跟踪与收入规划工具。支持离线使用，并在你的所有设备间同步。',
      skipLink: '跳到正文',
      homeLabel: 'DayForge 首页',
      sectionsLabel: '页面导航',
      navWhy: '为什么选 DayForge',
      navFeatures: '功能',
      navFaq: '常见问题',
      openApp: '打开 DayForge',
      heroEyebrow: '任务、习惯与时间的规划工具',
      heroLead: '规划每一天，记录每一小时，坚持每个习惯，一切尽在一处，离线也能用。',
      seeHow: '了解用法',
      shotToday: 'DayForge 跨项目任务列表，包含彩色项目标签、已完成任务和即将到来的时间',
      whyTitle: '规划、工时与习惯，一处搞定',
      whyLead: '大多数工具只覆盖工作的一部分。DayForge 把它们放在一起，让你记录的时间始终与对应的工作相连。',
      compareToggl: '与 Toggl 相比',
      togglVerdict: 'Toggl 记录时间，DayForge 还告诉你这些时间用在了什么地方。',
      togglBody: '任务、项目、日历和习惯都与计时器放在一起；收入则根据你为每个项目设定的时薪或固定价格计算。',
      compareNotion: '与 Notion 相比',
      notionVerdict: 'Notion 是一张白纸，DayForge 第一天就能用。',
      notionBody: '无需自己搭建系统。规划、计时和数据分析开箱即用，离线、无网络时同样可用。',
      pillarPlanTitle: '计划 + 习惯 + 时间 + 收入',
      pillarPlanBody: '关于你每一天的一切都在一个应用里，数字与计划并排显示。',
      pillarOfflineTitle: '离线优先',
      pillarOfflineBody: '你的数据保存在设备上。应用无需联网即可打开和使用。',
      pillarKeyboardTitle: '键盘操作高效',
      pillarKeyboardBody: '快速添加，按 <kbd>Ctrl</kbd> + <kbd>K</kbd> 搜索，并为常用操作提供快捷键。',
      pillarFreeTitle: '免费开始',
      pillarFreeBody: '无需账号即可开始。只有需要同步时，再用 Google 登录。',
      featuresTitle: '工作日所需的一切',
      featTasksTitle: '任务与项目',
      featTasksBody: '把工作归入带有各自颜色的项目。为任务设置日期、时间和重复规则，并看到接下来要做什么。',
      featCalendarTitle: '日历',
      featCalendarBody: '支持日、周、月视图。按项目筛选，一次只看工作的一部分。',
      featTimerTitle: '计时器、费率与数据分析',
      featTimerBody: '为任意任务启动计时器。为每个项目设置时薪或固定价格，看看你的时间值多少钱。',
      featHabitsTitle: '习惯与连续记录',
      featHabitsBody: '记录你想坚持的习惯。每完成一次，连续记录就增加一天，月视图则展示你的规律。',
      featBoardTitle: '可选的看板',
      featBoardBody: '为任意项目开启看板，在各列之间移动任务，直接拖动即可。',
      featNotesTitle: '备注',
      featNotesBody: '为任务和项目写备注，让背景信息始终与对应的工作放在一起。',
      featSearchTitle: '用 Ctrl+K 搜索',
      featSearchBody: '在应用任何位置查找任务、项目或备注。一个快捷键，无需翻找菜单。',
      featAppTitle: '可安装的应用与同步',
      featAppBody: '直接从浏览器安装 DayForge，像应用一样使用。用 Google 登录即可让设备保持同步。',
      howEyebrow: '使用方法',
      howTitle: '从空白页到计划好的一天',
      step1Title: '设置你的一天',
      step1Body: '首日设置会问你几个问题并添加入门任务，让你从计划开始，而不是面对空白列表。',
      step2Title: '规划并记录',
      step2Body: '把任务安排到日历上，开始工作时启动计时器，并每天打卡你的习惯。',
      step3Title: '回顾成果',
      step3Body: '在日历中查看一周安排，在数据分析中查看工时和收入。根据所见调整计划。',
      calendarAlt: 'DayForge 周日历，按项目颜色标记的定时任务',
      calendarTitle: '周日历',
      calendarCaption: '按项目展示定时任务，一周一览无余。',
      analyticsAlt: 'DayForge 数据分析：已记录的工时、按时薪计算的收入以及各项目的时间占比',
      analyticsTitle: '数据分析',
      analyticsCaption: '每个项目的已记录工时和收入，固定价格与时薪并列显示。',
      boardAlt: 'DayForge 项目看板，任务分布在“待办”“进行中”和“已完成”列中',
      boardTitle: '项目看板',
      boardCaption: '任意项目都可选用的看板视图。',
      faqTitle: '大家常问的问题',
      faq1Q: '免费吗？',
      faq1A: '是的。你可以免费开始，无需账号。使用 Google 登录是可选的，只为设备之间的同步而用。',
      faq2Q: '离线能用吗？',
      faq2A: '能。应用无需联网即可打开和使用，你的更改会保存在设备上。联网并登录后，更改会同步到你的其他设备。',
      faq3Q: '我的数据存在哪里？',
      faq3A: '保存在你的设备上，即浏览器中。如果你用 Google 登录，你的项目、任务和记录的时间也会同步到数据库，以便设备之间共享。不登录的话，数据不会离开你的浏览器。',
      faq4Q: '可以在手机上用吗？',
      faq4A: '可以。在手机浏览器中打开 DayForge，然后从浏览器菜单中安装（例如选择“添加到主屏幕”）。之后它就会像应用一样打开。',
      faq5Q: '如何删除我的数据？',
      faq5A: '打开“设置”，进入“备份和数据”，选择“删除所有项目和任务”。之后有一小段时间可以撤销；如果你已登录，它还会在所有设备上清除你的账号数据。要删除账号和服务器数据，请发邮件至 <a href="mailto:thetotemofficial@gmail.com">thetotemofficial@gmail.com</a>。在浏览器中清除网站数据会删除本地副本。',
      finalTitle: '从今天开始',
      finalBody: '打开 DayForge，设置你的第一天，看看计划、计时器和习惯如何协同工作。',
      backFeatures: '返回功能介绍',
      footerLegalLabel: '法律条款与应用链接',
      footerPrivacy: '隐私政策',
      footerTerms: '服务条款',
      footerApp: '打开应用',
      copyright: '© 2026 DayForge',
      langLabel: '语言',
    },
    es: {
      pageTitle: 'DayForge · Planifica tu día, registra tu tiempo, mantén tus hábitos',
      metaDescription: 'DayForge es un planificador gratuito que reúne tareas y proyectos, hábitos, calendario, control de tiempo con tarifas por hora y análisis, un tablero kanban y notas. Funciona sin conexión y se sincroniza entre dispositivos.',
      shortDescription: 'Un planificador gratuito para tareas, hábitos, calendario, control de tiempo e ingresos. Funciona sin conexión y se sincroniza entre tus dispositivos.',
      skipLink: 'Saltar al contenido',
      homeLabel: 'DayForge, inicio',
      sectionsLabel: 'Secciones de la página',
      navWhy: 'Por qué DayForge',
      navFeatures: 'Funciones',
      navFaq: 'Preguntas',
      openApp: 'Abrir DayForge',
      heroEyebrow: 'Planificador de tareas, hábitos y tiempo',
      heroLead: 'Planifica tu día, registra tu tiempo y mantén tus hábitos en un solo lugar que funciona sin conexión.',
      seeHow: 'Ver cómo funciona',
      shotToday: 'Lista de tareas de DayForge de varios proyectos, con etiquetas de color, tareas completadas y horas próximas',
      whyTitle: 'Un solo lugar para el plan, las horas y los hábitos',
      whyLead: 'La mayoría de las herramientas cubren una parte del trabajo. DayForge lo reúne todo, así que el tiempo que registras queda ligado al trabajo al que pertenece.',
      compareToggl: 'Comparado con Toggl',
      togglVerdict: 'Toggl registra el tiempo. DayForge también muestra para qué fue ese tiempo.',
      togglBody: 'Tus tareas, proyectos, calendario y hábitos están junto al temporizador, y los ingresos salen de las tarifas por hora y los precios fijos que defines por proyecto.',
      compareNotion: 'Comparado con Notion',
      notionVerdict: 'Notion es un lienzo en blanco. DayForge está listo desde el primer día.',
      notionBody: 'No tienes que montar el sistema tú mismo. El planificador, el temporizador y el análisis funcionan desde el primer momento, y siguen funcionando sin conexión.',
      pillarPlanTitle: 'Plan + hábitos + tiempo + ingresos',
      pillarPlanBody: 'Todo sobre tu día en una sola aplicación, con las cifras junto al plan.',
      pillarOfflineTitle: 'Primero sin conexión',
      pillarOfflineBody: 'Tus datos viven en tu dispositivo. La aplicación se abre y funciona sin conexión.',
      pillarKeyboardTitle: 'Rápido con el teclado',
      pillarKeyboardBody: 'Añadir rápido, buscar con <kbd>Ctrl</kbd> + <kbd>K</kbd> y atajos para lo que más haces.',
      pillarFreeTitle: 'Gratis para empezar',
      pillarFreeBody: 'No necesitas cuenta para empezar. Inicia sesión con Google solo si quieres sincronizar.',
      featuresTitle: 'Todo lo que necesita un día de trabajo',
      featTasksTitle: 'Tareas y proyectos',
      featTasksBody: 'Agrupa el trabajo en proyectos con sus propios colores. Añade tareas con fecha, hora y repetición, y mira qué viene después.',
      featCalendarTitle: 'Calendario',
      featCalendarBody: 'Vistas de día, semana y mes. Filtra por proyecto para ver una parte de tu trabajo a la vez.',
      featTimerTitle: 'Temporizador, tarifas y análisis',
      featTimerBody: 'Inicia un temporizador en cualquier tarea. Define una tarifa por hora o un precio fijo por proyecto y mira lo que valen tus horas.',
      featHabitsTitle: 'Hábitos y rachas',
      featHabitsBody: 'Registra los hábitos que quieres mantener. Cada día que completas uno suma a tu racha, y una vista mensual muestra el patrón.',
      featBoardTitle: 'Tablero kanban opcional',
      featBoardBody: 'Activa un tablero para cualquier proyecto y mueve las tareas entre columnas. Arrástralas de una a otra.',
      featNotesTitle: 'Notas',
      featNotesBody: 'Escribe notas en tareas y proyectos, para que el contexto esté junto al trabajo al que pertenece.',
      featSearchTitle: 'Buscar con Ctrl+K',
      featSearchBody: 'Encuentra cualquier tarea, proyecto o nota desde cualquier lugar de la app. Un solo atajo, sin menús que revisar.',
      featAppTitle: 'App instalable y sincronización',
      featAppBody: 'Instala DayForge desde el navegador y úsalo como una app. Inicia sesión con Google para mantener sincronizados tus dispositivos.',
      howEyebrow: 'Cómo funciona',
      howTitle: 'De una página en blanco a un día planificado',
      step1Title: 'Configura tu día',
      step1Body: 'La configuración del primer día hace unas preguntas y añade tareas de inicio, así empiezas con un plan y no con una lista vacía.',
      step2Title: 'Planifica y registra',
      step2Body: 'Programa tareas en el calendario, inicia el temporizador al empezar y marca tus hábitos cada día.',
      step3Title: 'Revisa los resultados',
      step3Body: 'Revisa tu semana en el calendario y tus horas e ingresos en el análisis. Ajusta el plan según lo que veas.',
      calendarAlt: 'Calendario semanal de DayForge con tareas programadas codificadas por color según el proyecto',
      calendarTitle: 'Calendario semanal',
      calendarCaption: 'Tareas programadas por proyecto, toda una semana de un vistazo.',
      analyticsAlt: 'Análisis de DayForge con horas registradas, ingresos según la tarifa por hora y reparto de tiempo por proyecto',
      analyticsTitle: 'Análisis',
      analyticsCaption: 'Horas registradas e ingresos por proyecto, con precios fijos junto a las tarifas por hora.',
      boardAlt: 'Tablero kanban de un proyecto en DayForge, con tareas en las columnas «Por hacer», «En curso» y «Hecho»',
      boardTitle: 'Tablero del proyecto',
      boardCaption: 'Una vista kanban opcional para cualquier proyecto.',
      faqTitle: 'Preguntas frecuentes de la gente',
      faq1Q: '¿Es gratis?',
      faq1A: 'Sí. Puedes empezar gratis y no necesitas cuenta. Iniciar sesión con Google es opcional y solo añade la sincronización entre tus dispositivos.',
      faq2Q: '¿Funciona sin conexión?',
      faq2A: 'Sí. La aplicación se abre y funciona sin conexión, y tus cambios se guardan en el dispositivo. Cuando estés en línea y con sesión iniciada, se sincronizan con tus otros dispositivos.',
      faq3Q: '¿Dónde se guardan mis datos?',
      faq3A: 'En tu dispositivo, en tu navegador. Si inicias sesión con Google, tus proyectos, tareas y tiempo registrado también se sincronizan con una base de datos para que tus dispositivos los compartan. Sin iniciar sesión, nada sale de tu navegador.',
      faq4Q: '¿Puedo usarlo en el móvil?',
      faq4A: 'Sí. Abre DayForge en el navegador de tu teléfono e instálalo desde el menú del navegador (por ejemplo, «Añadir a la pantalla de inicio»). Después se abrirá como una app.',
      faq5Q: '¿Cómo borro mis datos?',
      faq5A: 'Abre Ajustes, ve a «Copia de seguridad y datos» y elige «Eliminar todos los proyectos y tareas». Hay un breve margen para deshacerlo, y si has iniciado sesión, también borra tu cuenta en todos los dispositivos. Para eliminar tu cuenta y los datos del servidor, escribe a <a href="mailto:thetotemofficial@gmail.com">thetotemofficial@gmail.com</a>. Borrar los datos del sitio en tu navegador elimina la copia local.',
      finalTitle: 'Empieza hoy',
      finalBody: 'Abre DayForge, configura tu primer día y comprueba cómo encajan el plan, el temporizador y tus hábitos.',
      backFeatures: 'Volver a las funciones',
      footerLegalLabel: 'Enlaces legales y de la app',
      footerPrivacy: 'Política de privacidad',
      footerTerms: 'Condiciones del servicio',
      footerApp: 'Abrir la app',
      copyright: '© 2026 DayForge',
      langLabel: 'Idioma',
    },
  };

  function supported(code) {
    return SUPPORTED.indexOf(code) !== -1;
  }

  /** The two-letter language of a tag such as uk-UA or zh-Hans. */
  function codeOf(tag) {
    return String(tag || '').slice(0, 2).toLowerCase();
  }

  function fromQuery() {
    try {
      var match = /[?&]lang=([^&#]*)/.exec(window.location.search);
      var code = match ? codeOf(decodeURIComponent(match[1])) : '';
      return supported(code) ? code : null;
    } catch (e) {
      return null;
    }
  }

  function fromSettings() {
    try {
      var raw = window.localStorage.getItem(SETTINGS_KEY);
      var settings = raw ? JSON.parse(raw) : null;
      var code = settings && settings.format ? codeOf(settings.format.language) : '';
      return supported(code) ? code : null;
    } catch (e) {
      return null;
    }
  }

  function fromBrowser() {
    var nav = window.navigator || {};
    var tags = nav.languages && nav.languages.length ? nav.languages : [nav.language];
    for (var i = 0; i < tags.length; i++) {
      var code = codeOf(tags[i]);
      if (supported(code)) return code;
    }
    return null;
  }

  function pickLanguage() {
    return fromQuery() || fromSettings() || fromBrowser() || DEFAULT_LANG;
  }

  function has(dict, key) {
    return Object.prototype.hasOwnProperty.call(dict, key);
  }

  function apply(lang) {
    var doc = document;
    var dict = DICT[lang];

    doc.documentElement.lang = HTML_LANG[lang] || lang;

    if (dict) {
      var i;
      var nodes = doc.querySelectorAll('[data-i18n]');
      for (i = 0; i < nodes.length; i++) {
        var key = nodes[i].getAttribute('data-i18n');
        if (has(dict, key)) nodes[i].textContent = dict[key];
      }

      nodes = doc.querySelectorAll('[data-i18n-html]');
      for (i = 0; i < nodes.length; i++) {
        var htmlKey = nodes[i].getAttribute('data-i18n-html');
        if (has(dict, htmlKey)) nodes[i].innerHTML = dict[htmlKey];
      }

      nodes = doc.querySelectorAll('[data-i18n-attr]');
      for (i = 0; i < nodes.length; i++) {
        var pairs = nodes[i].getAttribute('data-i18n-attr').split(',');
        for (var p = 0; p < pairs.length; p++) {
          var pair = pairs[p].split(':');
          if (pair.length === 2 && has(dict, pair[1])) {
            nodes[i].setAttribute(pair[0], dict[pair[1]]);
          }
        }
      }
    }

    var links = doc.querySelectorAll('.lang a[data-lang]');
    for (var l = 0; l < links.length; l++) {
      if (links[l].getAttribute('data-lang') === lang) {
        links[l].setAttribute('aria-current', 'true');
      } else {
        links[l].removeAttribute('aria-current');
      }
    }
  }

  var api = { SUPPORTED: SUPPORTED, DICT: DICT, pickLanguage: pickLanguage, apply: apply };

  if (typeof window !== 'undefined') window.DayForgeAbout = api;

  if (typeof document !== 'undefined' && document.querySelector('[data-i18n]')) {
    apply(pickLanguage());
  }
})();
