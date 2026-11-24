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
      metaDescription: 'DayForge — безкоштовний планувальник завдань і проєктів зі звичками, календарем, таймером із погодинними ставками, аналітикою заробітку, канбан-дошкою та нотатками. Працює офлайн, а необов’язковий вхід через Google синхронізує пристрої.',
      shortDescription: 'Безкоштовний планувальник завдань, звичок, календаря, обліку часу та заробітку. Працює офлайн. Необов’язковий вхід через Google синхронізує ваші пристрої.',
      skipLink: 'Перейти до вмісту',
      homeLabel: 'DayForge — на головну',
      sectionsLabel: 'Розділи сторінки',
      navWhy: 'Чому DayForge',
      navFeatures: 'Можливості',
      navFaq: 'Питання',
      openApp: 'Відкрити DayForge',
      heroEyebrow: 'Планувальник завдань, звичок і часу',
      heroLead: 'Почніть із завдань і проєктів. Увімкніть календар, таймер, звички, дошку або заробіток, коли цього потребує ваша робота.',
      seeHow: 'Як це працює',
      shotToday: 'Список завдань DayForge у різних проєктах: кольорові мітки проєктів, виконані завдання та найближчі часи',
      whyTitle: 'Починається просто. Росте разом із вашою роботою.',
      whyLead: 'У перший день у вас лише завдання і проєкти, нічого зайвого. Календар, таймер, звички, канбан-дошку чи заробіток вмикаєте тоді, коли вони справді потрібні. Нічого не треба будувати, ніщо не заважає.',
      modulesLabel: 'Модулі',
      modBaseTitle: 'Завдання і проєкти',
      modBaseHint: 'Завжди під рукою. Решта модулів необов’язкові.',
      modAlwaysOn: 'Завжди ввімкнено',
      modBoardTitle: 'Дошка',
      modBoardHint: 'Канбан-колонки для проєкту: «До виконання», «У роботі», «Готово» або власні.',
      modTimerTitle: 'Таймер',
      modTimerHint: 'Секундомір, зворотний відлік або помодоро з історією відстеженого часу.',
      modMoneyTitle: 'Заробіток і ставки',
      modMoneyHint: 'Погодинна ставка для кожного проєкту і місячна ціль доходу.',
      modHabitsTitle: 'Звички',
      modHabitsHint: 'Щоденні повтори з серіями, які видно.',
      mockLabel: 'Схема вікна DayForge, у якому з’являються панелі, коли вмикаються модулі',
      pillarPlanTitle: 'Просто з першого дня',
      pillarPlanBody: 'Нічого не треба налаштовувати. Додайте задачу, і ви вже плануєте, або почніть із шаблону.',
      pillarOfflineTitle: 'Спочатку офлайн',
      pillarOfflineBody: 'Ваші дані зберігаються на пристрої. Застосунок відкривається й працює без з’єднання.',
      pillarKeyboardTitle: 'Швидко з клавіатурою',
      pillarKeyboardBody: 'Швидке додавання клавішею <kbd>N</kbd>, дата на кшталт «завтра» і #проєкт, щоб одразу покласти завдання. Пошук через <kbd>Ctrl</kbd> + <kbd>K</kbd> або <kbd>/</kbd>.',
      pillarFreeTitle: 'Безкоштовно для старту',
      pillarFreeBody: 'Для початку обліковий запис не потрібен. Увійдіть через Google, лише коли хочете синхронізацію.',
      featuresTitle: 'Усе, що потрібно робочому дню',
      featTasksTitle: 'Завдання і проєкти',
      featTasksBody: 'Групуйте роботу в проєкти з власними кольорами. Завдання можуть мати дату, час, повтор, кроки, нотатки й нагадування.',
      featCalendarTitle: 'Календар',
      featCalendarBody: 'Перегляд за днями, тижнями й місяцями. Фільтруйте за проєктом, щоб бачити одну частину роботи за раз.',
      featTimerTitle: 'Таймер, ставки і бюджети',
      featTimerBody: 'Запускайте секундомір, зворотний відлік або помодоро на будь-якому завданні. Задавайте погодинні ставки для проєкту чи завдання та необов’язкові бюджети, які попередять при 80%.',
      featHabitsTitle: 'Звички і серії',
      featHabitsBody: 'Відстежуйте звички, які хочете зберегти. Кожен день, коли ви виконуєте звичку, додає до серії, а місячний вигляд показує закономірність.',
      featBoardTitle: 'Необов’язкова канбан-дошка',
      featBoardBody: 'Увімкніть дошку для будь-якого проєкту. Переміщуйте завдання між колонками «До виконання», «У роботі» і «Готово» або додайте власні.',
      featClientsTitle: 'Клієнти і рахунки',
      featClientsBody: 'Виставляйте проєкти клієнтам. Експортуйте години та суми у CSV або PDF і позначайте, що вже виставлено в рахунку.',
      featSearchTitle: 'Пошук через Ctrl+K',
      featSearchBody: 'Знаходьте проєкти, завдання й завершену роботу з будь-якого місця в застосунку. Ctrl+K або / відкриває пошук.',
      featAppTitle: 'Застосунок для встановлення і синхронізація',
      featAppBody: 'Встановіть DayForge з браузера й користуйтеся ним як застосунком. Увійдіть через Google, щоб синхронізувати пристрої.',
      howEyebrow: 'Як це працює',
      howTitle: 'Від порожньої сторінки до запланованого дня',
      step1Title: 'Старт за хвилину',
      step1Body: 'Назвіть проєкт або виберіть шаблон: Проєкт для клієнта, Ритм дня, План навчання чи Звички. Перші завдання вже готові.',
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
      faq3A: 'На вашому пристрої, у вашому браузері. Якщо ви ввійдете через Google, ваші проєкти, завдання й відстежений час також синхронізуються з базою даних, щоб пристрої могли ними обмінюватися. Без входу ваші дані лишаються в браузері. Звіти про збої, які не містять вмісту проєктів і завдань, можуть надсилатися, щоб ми могли виправляти помилки.',
      faq4Q: 'Чи можна користуватися на телефоні?',
      faq4A: 'Так. Відкрийте DayForge у браузері телефона й встановіть його через меню браузера (наприклад, «Додати на початковий екран»). Далі він відкриватиметься як застосунок.',
      faq5Q: 'Як видалити мої дані?',
      faq5A: 'Відкрийте «Налаштування», перейдіть до «Резервна копія і дані» й оберіть «Видалити всі проєкти й завдання». Є короткий час на скасування, а якщо ви ввійшли, дані зникають на всіх пристроях. Щоб видалити обліковий запис і всі дані на сервері, скористайтеся кнопкою «Видалити обліковий запис» у профілі або в розділі даних у «Налаштуваннях». Якщо не можете ввійти, напишіть на <a href="mailto:thetotemofficial@gmail.com">thetotemofficial@gmail.com</a>. Очищення даних сайту в браузері видаляє локальну копію.',
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
      metaDescription: 'DayForge to darmowy planer zadań i projektów z nawykami, kalendarzem, timerem ze stawkami godzinowymi, analityką zarobków, tablicą kanban i notatkami. Działa offline, a opcjonalne logowanie przez Google synchronizuje urządzenia.',
      shortDescription: 'Darmowy planer zadań, nawyków, kalendarza, śledzenia czasu i zarobków. Działa offline. Opcjonalne logowanie przez Google synchronizuje Twoje urządzenia.',
      skipLink: 'Przejdź do treści',
      homeLabel: 'DayForge — strona główna',
      sectionsLabel: 'Sekcje strony',
      navWhy: 'Dlaczego DayForge',
      navFeatures: 'Funkcje',
      navFaq: 'FAQ',
      openApp: 'Otwórz DayForge',
      heroEyebrow: 'Planer zadań, nawyków i czasu',
      heroLead: 'Zacznij od zadań i projektów. Włącz kalendarz, timer, nawyki, tablicę lub zarobki, gdy twoja praca tego wymaga.',
      seeHow: 'Zobacz, jak to działa',
      shotToday: 'Lista zadań DayForge z różnych projektów, z kolorowymi etykietami projektów, zrobionymi zadaniami i nadchodzącymi terminami',
      whyTitle: 'Zaczyna się prosto. Rośnie razem z twoją pracą.',
      whyLead: 'Pierwszego dnia masz tylko zadania i projekty, nic więcej. Kalendarz, timer, nawyki, tablicę kanban lub zarobki włączasz dopiero wtedy, gdy są naprawdę potrzebne. Nic do budowania, nic nie przeszkadza.',
      modulesLabel: 'Moduły',
      modBaseTitle: 'Zadania i projekty',
      modBaseHint: 'Zawsze pod ręką. Każdy inny moduł jest opcjonalny.',
      modAlwaysOn: 'Zawsze włączone',
      modBoardTitle: 'Tablica',
      modBoardHint: 'Kolumny kanban dla projektu: Do zrobienia, W trakcie, Zrobione lub własne.',
      modTimerTitle: 'Timer',
      modTimerHint: 'Stoper, minutnik lub pomodoro, z historią zmierzonego czasu.',
      modMoneyTitle: 'Zarobki i stawki',
      modMoneyHint: 'Stawka godzinowa dla każdego projektu i miesięczny cel przychodu.',
      modHabitsTitle: 'Nawyki',
      modHabitsHint: 'Codzienne powtórki z widocznymi seriami.',
      mockLabel: 'Szkic okna DayForge, w którym pojawiają się panele po włączeniu modułów',
      pillarPlanTitle: 'Prosto od pierwszego dnia',
      pillarPlanBody: 'Nic do konfigurowania. Dodaj zadanie i już planujesz albo zacznij od szablonu.',
      pillarOfflineTitle: 'Najpierw offline',
      pillarOfflineBody: 'Twoje dane są na urządzeniu. Aplikacja otwiera się i działa bez połączenia.',
      pillarKeyboardTitle: 'Szybko z klawiaturą',
      pillarKeyboardBody: 'Szybkie dodawanie klawiszem <kbd>N</kbd>, data typu „jutro” i #projekt, aby od razu przypisać zadanie. Wyszukiwanie przez <kbd>Ctrl</kbd> + <kbd>K</kbd> lub <kbd>/</kbd>.',
      pillarFreeTitle: 'Darmowy start',
      pillarFreeBody: 'Na start nie potrzebujesz konta. Zaloguj się przez Google dopiero wtedy, gdy chcesz synchronizować.',
      featuresTitle: 'Wszystko, czego potrzebuje dzień pracy',
      featTasksTitle: 'Zadania i projekty',
      featTasksBody: 'Grupuj pracę w projekty z własnymi kolorami. Zadania mogą mieć datę, godzinę, powtarzanie, kroki, notatki i przypomnienia.',
      featCalendarTitle: 'Kalendarz',
      featCalendarBody: 'Widoki dnia, tygodnia i miesiąca. Filtruj według projektu, by widzieć jedną część pracy naraz.',
      featTimerTitle: 'Timer, stawki i budżety',
      featTimerBody: 'Uruchamiaj stoper, minutnik lub pomodoro przy dowolnym zadaniu. Ustaw stawki godzinowe dla projektu lub zadania oraz opcjonalne budżety, które ostrzegą przy 80%.',
      featHabitsTitle: 'Nawyki i serie',
      featHabitsBody: 'Śledź nawyki, które chcesz utrzymać. Każdy dzień, w którym wykonasz nawyk, wydłuża serię, a widok miesięczny pokazuje wzorzec.',
      featBoardTitle: 'Opcjonalna tablica kanban',
      featBoardBody: 'Włącz tablicę dla dowolnego projektu. Przesuwaj zadania między kolumnami Do zrobienia, W trakcie i Zrobione albo dodaj własne.',
      featClientsTitle: 'Klienci i rozliczenia',
      featClientsBody: 'Przypisuj projekty do klientów. Eksportuj godziny i kwoty do CSV lub PDF i oznaczaj, co zostało zafakturowane.',
      featSearchTitle: 'Szukaj przez Ctrl+K',
      featSearchBody: 'Znajdź projekty, zadania i zakończoną pracę z dowolnego miejsca w aplikacji. Ctrl+K lub / otwiera wyszukiwanie.',
      featAppTitle: 'Aplikacja do instalacji i synchronizacja',
      featAppBody: 'Zainstaluj DayForge z przeglądarki i używaj go jak aplikacji. Zaloguj się przez Google, by synchronizować urządzenia.',
      howEyebrow: 'Jak to działa',
      howTitle: 'Od pustej strony do zaplanowanego dnia',
      step1Title: 'Start w minutę',
      step1Body: 'Nazwij projekt albo wybierz szablon: Projekt dla klienta, Rytm dnia, Plan nauki lub Nawyki. Pierwsze zadania są gotowe do wypróbowania.',
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
      faq3A: 'Na twoim urządzeniu, w przeglądarce. Jeśli zalogujesz się przez Google, twoje projekty, zadania i czas pracy są też synchronizowane z bazą danych, aby urządzenia mogły je udostępniać. Bez logowania twoje dane zostają w przeglądarce. Raporty o błędach, które nie zawierają treści projektów ani zadań, mogą być wysyłane, abyśmy mogli naprawiać błędy.',
      faq4Q: 'Czy mogę używać tego na telefonie?',
      faq4A: 'Tak. Otwórz DayForge w przeglądarce telefonu i zainstaluj go z menu przeglądarki (na przykład „Dodaj do ekranu głównego”). Od tej pory otwiera się jak aplikacja.',
      faq5Q: 'Jak usunąć swoje dane?',
      faq5A: 'Otwórz Ustawienia, przejdź do Kopia zapasowa i dane i wybierz „Usuń wszystkie projekty i zadania”. Jest krótki czas na cofnięcie, a jeśli jesteś zalogowany, zniknie to na wszystkich urządzeniach. Aby usunąć konto i wszystkie dane na serwerze, użyj przycisku „Usuń konto” w profilu lub w sekcji danych w Ustawieniach. Jeśli nie możesz się zalogować, napisz na <a href="mailto:thetotemofficial@gmail.com">thetotemofficial@gmail.com</a>. Wyczyszczenie danych witryny w przeglądarce usuwa lokalną kopię.',
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
      metaDescription: 'DayForge ist ein kostenloser Planer für Aufgaben und Projekte mit Gewohnheiten, Kalender, Timer mit Stundensätzen, Verdienst-Auswertung, Kanban-Board und Notizen. Er funktioniert offline, und die optionale Google-Anmeldung synchronisiert deine Geräte.',
      shortDescription: 'Ein kostenloser Planer für Aufgaben, Gewohnheiten, Kalender, Zeiterfassung und Verdienst. Funktioniert offline. Eine optionale Google-Anmeldung synchronisiert deine Geräte.',
      skipLink: 'Zum Inhalt springen',
      homeLabel: 'DayForge – Startseite',
      sectionsLabel: 'Seitenabschnitte',
      navWhy: 'Warum DayForge',
      navFeatures: 'Funktionen',
      navFaq: 'FAQ',
      openApp: 'DayForge öffnen',
      heroEyebrow: 'Planer für Aufgaben, Gewohnheiten und Zeit',
      heroLead: 'Starte mit Aufgaben und Projekten. Schalte Kalender, Timer, Gewohnheiten, Board oder Verdienst ein, wenn deine Arbeit sie braucht.',
      seeHow: 'So funktioniert’s',
      shotToday: 'DayForge-Aufgabenliste über mehrere Projekte, mit farbigen Projektmarkierungen, erledigten Aufgaben und anstehenden Zeiten',
      whyTitle: 'Startet einfach. Wächst mit deiner Arbeit.',
      whyLead: 'Am ersten Tag hast du nur Aufgaben und Projekte, nichts mehr. Kalender, Timer, Gewohnheiten, Kanban-Board oder Verdienst schaltest du erst ein, wenn du sie wirklich brauchst. Nichts einzurichten, nichts im Weg.',
      modulesLabel: 'Module',
      modBaseTitle: 'Aufgaben und Projekte',
      modBaseHint: 'Immer da. Alle anderen Module sind optional.',
      modAlwaysOn: 'Immer an',
      modBoardTitle: 'Board',
      modBoardHint: 'Kanban-Spalten für ein Projekt: Zu erledigen, In Arbeit, Erledigt oder eigene.',
      modTimerTitle: 'Timer',
      modTimerHint: 'Stoppuhr, Countdown oder Pomodoro, mit Verlauf der erfassten Zeit.',
      modMoneyTitle: 'Verdienst und Sätze',
      modMoneyHint: 'Ein Stundensatz pro Projekt und ein monatliches Einkommensziel.',
      modHabitsTitle: 'Gewohnheiten',
      modHabitsHint: 'Tägliche Wiederholungen mit sichtbaren Serien.',
      mockLabel: 'Skizze des DayForge-Fensters, das beim Einschalten von Modulen neue Bereiche bekommt',
      pillarPlanTitle: 'Einfach ab dem ersten Tag',
      pillarPlanBody: 'Nichts einzurichten. Füge eine Aufgabe hinzu und du planst schon, oder starte mit einer Vorlage.',
      pillarOfflineTitle: 'Offline zuerst',
      pillarOfflineBody: 'Deine Daten liegen auf deinem Gerät. Die App öffnet sich und funktioniert ohne Verbindung.',
      pillarKeyboardTitle: 'Schnell per Tastatur',
      pillarKeyboardBody: 'Schnell hinzufügen mit <kbd>N</kbd>, Datum wie „morgen“ und #Projekt zum Zuordnen. Suche mit <kbd>Ctrl</kbd> + <kbd>K</kbd> oder <kbd>/</kbd>.',
      pillarFreeTitle: 'Kostenlos starten',
      pillarFreeBody: 'Zum Start brauchst du kein Konto. Melde dich nur mit Google an, wenn du synchronisieren möchtest.',
      featuresTitle: 'Alles, was ein Arbeitstag braucht',
      featTasksTitle: 'Aufgaben und Projekte',
      featTasksBody: 'Gliedere die Arbeit in Projekte mit eigenen Farben. Aufgaben können Datum, Uhrzeit, Wiederholung, Schritte, Notizen und Erinnerungen haben.',
      featCalendarTitle: 'Kalender',
      featCalendarBody: 'Tages-, Wochen- und Monatsansicht. Filtere nach Projekt, um jeweils einen Teil deiner Arbeit zu sehen.',
      featTimerTitle: 'Timer, Sätze und Budgets',
      featTimerBody: 'Starte Stoppuhr, Countdown oder Pomodoro bei jeder Aufgabe. Lege Stundensätze pro Projekt oder Aufgabe fest und optionale Budgets, die ab 80 % warnen.',
      featHabitsTitle: 'Gewohnheiten und Serien',
      featHabitsBody: 'Verfolge die Gewohnheiten, die du beibehalten willst. Jeder Tag, an dem du eine erledigst, verlängert deine Serie, und die Monatsansicht zeigt das Muster.',
      featBoardTitle: 'Optionales Kanban-Board',
      featBoardBody: 'Schalte ein Board für ein beliebiges Projekt ein. Verschiebe Aufgaben zwischen Zu erledigen, In Arbeit und Erledigt oder füge eigene Spalten hinzu.',
      featClientsTitle: 'Kunden und Abrechnung',
      featClientsBody: 'Rechne Projekte mit Kunden ab. Exportiere Stunden und Beträge als CSV oder PDF und markiere, was bereits in Rechnung gestellt ist.',
      featSearchTitle: 'Suche mit Strg+K',
      featSearchBody: 'Finde Projekte, Aufgaben und erledigte Arbeit von überall in der App. Ctrl+K oder / öffnet die Suche.',
      featAppTitle: 'Installierbare App und Synchronisierung',
      featAppBody: 'Installiere DayForge direkt aus dem Browser und nutze es wie eine App. Melde dich mit Google an, um deine Geräte synchron zu halten.',
      howEyebrow: 'So funktioniert’s',
      howTitle: 'Von der leeren Seite zum geplanten Tag',
      step1Title: 'In einer Minute starten',
      step1Body: 'Benenne ein Projekt oder wähle eine Vorlage: Kundenprojekt, Tagesrhythmus, Lernplan oder Gewohnheiten. Die ersten Aufgaben sind bereit zum Ausprobieren.',
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
      faq3A: 'Auf deinem Gerät, im Browser. Wenn du dich mit Google anmeldest, werden deine Projekte, Aufgaben und erfasste Zeit zusätzlich in eine Datenbank synchronisiert, damit deine Geräte sie teilen können. Ohne Anmeldung bleiben deine Daten im Browser. Fehlerberichte ohne Inhalte aus Projekten und Aufgaben können trotzdem gesendet werden, damit wir Fehler beheben können.',
      faq4Q: 'Kann ich es auf dem Handy nutzen?',
      faq4A: 'Ja. Öffne DayForge im Browser deines Handys und installiere es über das Browser-Menü (zum Beispiel „Zum Home-Bildschirm hinzufügen“). Danach öffnet es sich wie eine App.',
      faq5Q: 'Wie lösche ich meine Daten?',
      faq5A: 'Öffne die Einstellungen, gehe zu Backup und Daten und wähle „Alle Projekte und Aufgaben löschen“. Es gibt eine kurze Rückgängig-Option, und wenn du angemeldet bist, werden die Daten auf allen Geräten entfernt. Um dein Konto und alle Daten auf dem Server zu löschen, nutze „Konto löschen“ im Profil oder im Bereich Daten in den Einstellungen. Wenn du dich nicht anmelden kannst, schreib an <a href="mailto:thetotemofficial@gmail.com">thetotemofficial@gmail.com</a>. Das Löschen der Website-Daten im Browser entfernt die lokale Kopie.',
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
      metaDescription: 'DayForge 是一款免费的任务与项目规划工具，包含习惯、日历、带小时费率的计时器、收入分析、看板和笔记。离线可用，可选的 Google 登录用于同步设备。',
      shortDescription: '一款免费的任务、习惯、日历、时间记录和收入规划工具。可离线使用。可选的 Google 登录用于同步设备。',
      skipLink: '跳到正文',
      homeLabel: 'DayForge 首页',
      sectionsLabel: '页面导航',
      navWhy: '为什么选 DayForge',
      navFeatures: '功能',
      navFaq: '常见问题',
      openApp: '打开 DayForge',
      heroEyebrow: '任务、习惯与时间的规划工具',
      heroLead: '从任务和项目开始。需要时再打开日历、计时器、习惯、看板或收入功能。',
      seeHow: '了解用法',
      shotToday: 'DayForge 跨项目任务列表，包含彩色项目标签、已完成任务和即将到来的时间',
      whyTitle: '起步简单，随工作一起成长。',
      whyLead: '第一天你只有任务和项目，没有多余的东西。需要时再打开日历、计时器、习惯、看板或收入功能。无需搭建，不会碍事。',
      modulesLabel: '模块',
      modBaseTitle: '任务和项目',
      modBaseHint: '始终可用。其他模块均为可选。',
      modAlwaysOn: '始终开启',
      modBoardTitle: '看板',
      modBoardHint: '项目的看板列：待办、进行中、已完成，或自定义。',
      modTimerTitle: '计时器',
      modTimerHint: '秒表、倒计时或番茄钟，并保存计时历史。',
      modMoneyTitle: '收入与费率',
      modMoneyHint: '为每个项目设置小时费率，以及每月收入目标。',
      modHabitsTitle: '习惯',
      modHabitsHint: '每日重复，连续记录一目了然。',
      mockLabel: 'DayForge 窗口示意图，开启模块后会出现新的面板',
      pillarPlanTitle: '第一天就很简单',
      pillarPlanBody: '无需任何设置。添加一个任务就开始规划，或者从模板开始。',
      pillarOfflineTitle: '离线优先',
      pillarOfflineBody: '你的数据保存在设备上。应用无需联网即可打开和使用。',
      pillarKeyboardTitle: '键盘操作高效',
      pillarKeyboardBody: '用 <kbd>N</kbd> 快速添加，输入“明天”等日期和 #项目名即可归类。按 <kbd>Ctrl</kbd> + <kbd>K</kbd> 或 <kbd>/</kbd> 搜索。',
      pillarFreeTitle: '免费开始',
      pillarFreeBody: '无需账号即可开始。只有需要同步时，再用 Google 登录。',
      featuresTitle: '工作日所需的一切',
      featTasksTitle: '任务与项目',
      featTasksBody: '按项目组织工作，并为每个项目设置颜色。任务可以设置日期、时间、重复、步骤、笔记和提醒。',
      featCalendarTitle: '日历',
      featCalendarBody: '支持日、周、月视图。按项目筛选，一次只看工作的一部分。',
      featTimerTitle: '计时器、费率和预算',
      featTimerBody: '可在任何任务上使用秒表、倒计时或番茄钟。为项目或任务设置小时费率，并可选择预算，达到 80% 时提醒。',
      featHabitsTitle: '习惯与连续记录',
      featHabitsBody: '记录你想坚持的习惯。每完成一次，连续记录就增加一天，月视图则展示你的规律。',
      featBoardTitle: '可选的看板',
      featBoardBody: '为任何项目开启看板。在待办、进行中和已完成之间移动任务，也可以添加自定义列。',
      featClientsTitle: '客户与账单',
      featClientsBody: '为客户开具账单。将时长和金额导出为 CSV 或 PDF，并标记已开票的部分。',
      featSearchTitle: '用 Ctrl+K 搜索',
      featSearchBody: '在应用的任何位置查找项目、任务和已完成的工作。按 Ctrl+K 或 / 打开搜索。',
      featAppTitle: '可安装的应用与同步',
      featAppBody: '直接从浏览器安装 DayForge，像应用一样使用。用 Google 登录即可让设备保持同步。',
      howEyebrow: '使用方法',
      howTitle: '从空白页到计划好的一天',
      step1Title: '一分钟上手',
      step1Body: '为项目命名，或选择模板：客户项目、每日节奏、学习计划或习惯。模板中的第一批任务已准备好，可直接尝试。',
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
      faq3A: '数据保存在你的设备和浏览器中。如果你使用 Google 登录，你的项目、任务和计时记录也会同步到数据库，以便设备之间共享。未登录时，数据只保留在浏览器中。错误报告不包含项目或任务内容，仍可能被发送，以便我们修复问题。',
      faq4Q: '可以在手机上用吗？',
      faq4A: '可以。在手机浏览器中打开 DayForge，然后从浏览器菜单中安装（例如选择“添加到主屏幕”）。之后它就会像应用一样打开。',
      faq5Q: '如何删除我的数据？',
      faq5A: '打开“设置”，进入“备份和数据”，选择“删除所有项目和任务”。之后有短暂的撤销时间；如果你已登录，它也会在所有设备上清除。若要删除账户及服务器上的全部数据，请使用个人资料或“设置”中数据部分的“删除账户”按钮。无法登录时，请发邮件至 <a href="mailto:thetotemofficial@gmail.com">thetotemofficial@gmail.com</a>。清除浏览器中的网站数据会删除本地副本。',
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
      metaDescription: 'DayForge es un planificador gratuito de tareas y proyectos con hábitos, calendario, temporizador con tarifas por hora, análisis de ganancias, tablero kanban y notas. Funciona sin conexión, y el inicio de sesión opcional con Google sincroniza tus dispositivos.',
      shortDescription: 'Un planificador gratuito de tareas, hábitos, calendario, control de tiempo y ganancias. Funciona sin conexión. El inicio de sesión opcional con Google sincroniza tus dispositivos.',
      skipLink: 'Saltar al contenido',
      homeLabel: 'DayForge, inicio',
      sectionsLabel: 'Secciones de la página',
      navWhy: 'Por qué DayForge',
      navFeatures: 'Funciones',
      navFaq: 'Preguntas',
      openApp: 'Abrir DayForge',
      heroEyebrow: 'Planificador de tareas, hábitos y tiempo',
      heroLead: 'Empieza con tareas y proyectos. Activa el calendario, el temporizador, los hábitos, el tablero o las ganancias cuando tu trabajo los necesite.',
      seeHow: 'Ver cómo funciona',
      shotToday: 'Lista de tareas de DayForge de varios proyectos, con etiquetas de color, tareas completadas y horas próximas',
      whyTitle: 'Empieza simple. Crece con tu trabajo.',
      whyLead: 'El primer día solo tienes tareas y proyectos, nada más. Activa el calendario, el temporizador, los hábitos, el tablero kanban o las ganancias solo cuando los necesites. Nada que construir, nada en el camino.',
      modulesLabel: 'Módulos',
      modBaseTitle: 'Tareas y proyectos',
      modBaseHint: 'Siempre disponibles. Cualquier otro módulo es opcional.',
      modAlwaysOn: 'Siempre activo',
      modBoardTitle: 'Tablero',
      modBoardHint: 'Columnas kanban para un proyecto: Por hacer, En curso, Hecho o las tuyas.',
      modTimerTitle: 'Temporizador',
      modTimerHint: 'Cronómetro, cuenta atrás o pomodoro, con historial del tiempo registrado.',
      modMoneyTitle: 'Ganancias y tarifas',
      modMoneyHint: 'Una tarifa por hora por proyecto y una meta mensual de ingresos.',
      modHabitsTitle: 'Hábitos',
      modHabitsHint: 'Repeticiones diarias con rachas visibles.',
      mockLabel: 'Esquema de la ventana de DayForge, que gana paneles al activar módulos',
      pillarPlanTitle: 'Simple desde el primer día',
      pillarPlanBody: 'Nada que configurar. Añade una tarea y ya estás planificando, o empieza con una plantilla.',
      pillarOfflineTitle: 'Primero sin conexión',
      pillarOfflineBody: 'Tus datos viven en tu dispositivo. La aplicación se abre y funciona sin conexión.',
      pillarKeyboardTitle: 'Rápido con el teclado',
      pillarKeyboardBody: 'Añade rápido con <kbd>N</kbd>, fechas como «mañana» y #proyecto para asignar la tarea. Busca con <kbd>Ctrl</kbd> + <kbd>K</kbd> o <kbd>/</kbd>.',
      pillarFreeTitle: 'Gratis para empezar',
      pillarFreeBody: 'No necesitas cuenta para empezar. Inicia sesión con Google solo si quieres sincronizar.',
      featuresTitle: 'Todo lo que necesita un día de trabajo',
      featTasksTitle: 'Tareas y proyectos',
      featTasksBody: 'Agrupa el trabajo en proyectos con sus propios colores. Las tareas pueden tener fecha, hora, repetición, pasos, notas y recordatorios.',
      featCalendarTitle: 'Calendario',
      featCalendarBody: 'Vistas de día, semana y mes. Filtra por proyecto para ver una parte de tu trabajo a la vez.',
      featTimerTitle: 'Temporizador, tarifas y presupuestos',
      featTimerBody: 'Inicia un cronómetro, una cuenta atrás o un pomodoro en cualquier tarea. Define tarifas por hora por proyecto o tarea y presupuestos opcionales que avisan al 80 %.',
      featHabitsTitle: 'Hábitos y rachas',
      featHabitsBody: 'Registra los hábitos que quieres mantener. Cada día que completas uno suma a tu racha, y una vista mensual muestra el patrón.',
      featBoardTitle: 'Tablero kanban opcional',
      featBoardBody: 'Activa un tablero en cualquier proyecto. Mueve las tareas entre Por hacer, En curso y Hecho, o añade tus propias columnas.',
      featClientsTitle: 'Clientes y facturación',
      featClientsBody: 'Factura proyectos a clientes. Exporta horas e importes en CSV o PDF y marca lo que ya has facturado.',
      featSearchTitle: 'Buscar con Ctrl+K',
      featSearchBody: 'Encuentra proyectos, tareas y trabajo terminado desde cualquier parte de la app. Ctrl+K o / abre la búsqueda.',
      featAppTitle: 'App instalable y sincronización',
      featAppBody: 'Instala DayForge desde el navegador y úsalo como una app. Inicia sesión con Google para mantener sincronizados tus dispositivos.',
      howEyebrow: 'Cómo funciona',
      howTitle: 'De una página en blanco a un día planificado',
      step1Title: 'Empieza en un minuto',
      step1Body: 'Pon nombre a un proyecto o elige una plantilla: Proyecto de cliente, Ritmo diario, Plan de estudio o Hábitos. Las primeras tareas están listas para probar.',
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
      faq3A: 'En tu dispositivo, en tu navegador. Si inicias sesión con Google, tus proyectos, tareas y tiempo registrado también se sincronizan con una base de datos para que tus dispositivos los compartan. Sin iniciar sesión, tus datos se quedan en el navegador. Los informes de errores, que no contienen contenido de proyectos ni tareas, pueden enviarse para que podamos corregir fallos.',
      faq4Q: '¿Puedo usarlo en el móvil?',
      faq4A: 'Sí. Abre DayForge en el navegador de tu teléfono e instálalo desde el menú del navegador (por ejemplo, «Añadir a la pantalla de inicio»). Después se abrirá como una app.',
      faq5Q: '¿Cómo borro mis datos?',
      faq5A: 'Abre Ajustes, ve a Copia de seguridad y datos y elige «Eliminar todos los proyectos y tareas». Hay un breve tiempo para deshacerlo, y si has iniciado sesión, también se borra en todos los dispositivos. Para eliminar tu cuenta y todos sus datos del servidor, usa «Eliminar cuenta» en tu perfil o en la sección de datos de Ajustes. Si no puedes iniciar sesión, escribe a <a href="mailto:thetotemofficial@gmail.com">thetotemofficial@gmail.com</a>. Borrar los datos del sitio en el navegador elimina la copia local.',
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
