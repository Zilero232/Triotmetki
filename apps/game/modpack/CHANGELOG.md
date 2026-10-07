# Changelog

The modpack's release notes, read by the manager («Помощь» → «Что нового») and the site through the server's parser (`apps/web/server/src/modules/modpack-releases/lib/changelog`).

- Every package has its own entry, `## <id> <version>`: `<id>` is its key in `catalog/catalog.json`, `<version>` the `VERSION` of its package. A modpack-wide `## <version>` entry describes a release; `<version>` is `version` in `package.json`.
- Each entry has a `### ru` and a `### en` section with the same content. `tools/build/tests/test_changelog.py` fails when a catalogued component has no entry for its current version or an entry lacks a language.
- Entries are short: one line per change, saying what the player sees or gets — no implementation details.
- Add the new entry on top of the component's previous ones when you bump a `VERSION`.

## 0.3.8

### ru

- Панели боя снова в отдельном окне: встраивание в экран боя могло ронять игру.
- Окно настроек в стиле клиента: цвета и кнопки лобби, кнопки действий справа внизу, сброс отдельно.
- Значок «Три отметки» стоит после ника и не закрывает значок достижения.
- Автосообщения в чат боя: арта по мне, урон от союзника, засвет и ещё десяток событий на выбор.

### en

- Battle panels are back in their own window: building them into the battle screen could crash the game.
- The settings window in the client's style: the lobby's colours and buttons, actions at the bottom right, reset set apart.
- The Three Marks badge sits after the name and no longer covers the achievement badge.
- Battle chat auto messages: artillery on me, ally damage, spotted and a dozen more events to pick.

## ui 0.9.7

### ru

- Окно в стиле клиента: тёмные панели, текст и кнопки лобби 1.45, оранжевая главная кнопка.
- Кнопки действий справа внизу, «Сбросить» слева; профили: создание сверху, «Загрузить» последней.
- В меню слева: Редактор HUD, Профили, Данные и сайт.

### en

- The window in the client's style: dark panels, the 1.45 lobby's text and buttons, an orange primary button.
- Actions at the bottom right, «Reset» on the left; profiles: creating on top, «Load» last.
- Left menu order: HUD editor, Profiles, Data and site.

## 0.3.7

### ru

- Панели боя и ангара встроены в интерфейс игры: больше нет отдельного окна поверх игры, фокус, чат и Alt+Tab не ломаются.
- Если панели не удалось встроить, остаётся стандартный интерфейс игры.

### en

- The battle and hangar panels are built into the game interface: no separate window over the game any more, so focus, the chat and Alt+Tab keep working.
- When the panels cannot be built in, the stock game interface stays.

## 0.3.6

### ru

- Настройки открываются только из списка модов (ModsList): кнопка «///» и Ctrl+Shift+T убраны, расстановка панелей завершается по Esc.
- GUIFlash больше не нужен: панели рисуются через OpenWG Gameface.
- В менеджере появился набор «Все компоненты».
- Панели больше не раскрываются по Alt: пояснения в журнале боя включаются настройкой.
- Стандартный журнал боя больше не появляется после гибели.
- Стандартная панель счёта больше не видна рядом с ХП команд в начале боя.
- Названия техники и последние места на мини-карте снова включаются, где первое включение не сработало.

### en

- Settings open only from the mods list (ModsList): the «///» button and Ctrl+Shift+T are gone, placing the panels ends with Esc.
- GUIFlash is no longer needed: the panels are drawn through OpenWG Gameface.
- The manager has a new «All components» set.
- No panel expands on Alt any more: the battle log notes are a setting.
- The stock battle log no longer shows after death.
- The stock score strip no longer shows next to the team HP strip at the start of a battle.
- Minimap vehicle names and last-seen spots are switched on again where the first switch misfired.

## 0.3.5

### ru

- Новый компонент «Значок модпака»: значок «Три отметки» у ника в ушах, по Tab и на загрузке — у вас и у игроков с привязанным модом.
- «Карточка танка» в ангаре переделана: отметки на стволе, крупный процент, тренд и шкала до 100 %.
- «Журнал боя» в новом виде: итоги плашками, ровные столбцы, снаряды по цветам, ХП цели и криты.
- Тени текста и рамки панелей HUD снова рисуются в бою.
- «Уменьшенный круг сведения» — отдельный компонент; таймер перезарядки у прицела крупнее и читается на любом фоне.
- Мини-карта один раз включает последние места и названия техники; ХП команд по умолчанию — полоска на каждый танк.
- «Отзывчивый прицел» сводится плавно и не подтормаживает при низком FPS.
- Нажатия по HUD на 4K, перетаскивание с Alt, чат и возврат по Alt+Tab работают надёжнее.
- Ряд оборудования поднят над номерами слотов, превью ангаров снимаются прямо в игре.
- Связь с сайтом только по проверенному HTTPS, секрет привязки хранится зашифрованным.
- HUD работает плавнее, в конце боя меньше подтормаживаний.

### en

- New component «Modpack badge»: the Three Marks badge by the name in the player panels, the Tab stats and the loading screen, on you and on players who bound the mod.
- The hangar «Tank card» is redesigned: gun marks, a large percentage, the trend and a scale up to 100 %.
- The «Battle log» has a new look: totals as chips, even columns, shells by colour, the target HP bar and crits.
- HUD text shadows and panel outlines are drawn in battle again.
- The «Reduced aim circle» is its own component; the reload timer by the reticle is bigger and reads on any background.
- The minimap switches on last-seen spots and vehicle names once; team HP is a bar per tank by default.
- The «Responsive reticle» shrinks smoothly and no longer stutters at low FPS.
- HUD clicks on 4K screens, Alt dragging, the chat and coming back with Alt+Tab work more reliably.
- The equipment row sits above the slot numbers, hangar previews are captured in the game.
- The site is reached only over verified HTTPS, the binding secret is stored encrypted.
- The HUD runs smoother, with fewer hitches at the end of a battle.

## 0.3.4

### ru

- Клики по ангару и чату больше не теряются, чат печатается, после Alt+Tab ангар сразу нажимается; подсказки HUD не зависают над прицелом.
- «Просмотр попаданий»: танк и камера стоят на месте, карточка не уходит под нижнюю панель лобби.
- «Просмотр попаданий»: новый выбор боя с картой и итогом, обновлённые таблица и карточка попадания.
- Смена ангара действительно переключает ангар и вид, а в логе видно, что выбрано.
- Новый компонент «Виды ангара «Три отметки»»: «Ночь», «Закат», «Сталь» и «Студия», менеджер собирает их из файлов вашей игры.
- «Отметки в бою» больше не раздвигаются по Alt и стоят вровень с расходниками.
- Прицел: уменьшенный круг сведения, настройка переехала из «Прицела и снарядов».
- Прицел: один таймер перезарядки на барабанах и автодозарядке, значки снарядов магазина не пропадают.
- Кнопка «///» под меню Esc убрана, Ctrl+Shift+T в бою ничего не делает: окно настроек открывается только в ангаре.
- Часы в бою убраны: время, сервер и пинг показываются только в ангаре.

### en

- Clicks on the hangar and the chat are no longer lost, the chat takes keys, the hangar takes clicks right after Alt+Tab; HUD tooltips no longer hang over the reticle.
- «Hit viewer»: the tank and camera stay in place, the card no longer slides under the lobby's bottom bar.
- «Hit viewer»: a new battle picker with the map and result, a redesigned hit table and card.
- The hangar switcher really switches the hangar and look, and the log shows what is chosen.
- New component «Three Marks hangar looks»: «Night», «Sunset», «Steel» and «Studio», built by the manager from your game's own files.
- «Marks in battle» no longer grows on Alt and sits level with the consumables.
- Crosshair: a smaller aim circle, the setting moved from «Aim and shells».
- Crosshair: one reload timer on drum and auto-reloader guns, the magazine's shell icons no longer vanish.
- The «///» button under the Esc menu is gone and Ctrl+Shift+T does nothing in battle: the settings window opens only in the hangar.
- The battle clock is gone: the time, server and ping show only in the hangar.

## 0.3.3

### ru

- После боя и после закрытия окна настроек ангар снова нажимается, а чат печатается.
- «Просмотр попаданий»: метка держится на модели, список не сжимается, страница подстраивается под экран, камера подлетает к попаданию.
- «Просмотр попаданий»: закрытие и смена вкладки больше не оставляют ангар на «обновлении ангара».
- Лампа «Шестого чувства»: секунды стоят по её центру, кольцо таймера видно.
- Ряд оборудования стоит по центру над панелью расходников.
- Мини-карта предлагает «Рекомендуемые настройки», если в игре стоит «Никогда».
- Окно настроек: разделы «Отметки и статистика» и «Стримерам» вошли в «Бой» и «Ангар», реплеи занимают всё окно, строки списка ровные.
- Прицел: кратность зума включена по умолчанию.
- Смена ангара: раздел «Вид» — освещение ангара из игры.

### en

- After a battle and after closing the settings window the hangar takes clicks and the chat takes keys again.
- «Hit viewer»: the marker stays on the model, the list is not squashed, the page fits the screen, the camera flies to the hit.
- «Hit viewer»: closing it or switching tabs no longer leaves the hangar «updating».
- «Sixth sense» lamp: the seconds sit centred under it, the timer ring shows.
- The equipment row sits centred above the consumables panel.
- The minimap offers «Recommended settings» when the game has «Never».
- Settings window: «Marks and stats» and «Streamers» fold into Battle and Hangar, replays fill the window, list rows are even.
- Crosshair: the zoom readout is on by default.
- Hangar switcher: a «Look» section with hangar lighting from the game.

## 0.3.2

### ru

- Окно настроек: у каждого компонента своя страница, ровный список, стрелка «назад» и выпадающие списки.
- Окно настроек помещается на экран, вкладок «Все/Ангар/Бой» больше нет, подсказка отмены скрывается сама.
- Реплеи: список и подробности прокручиваются отдельно, значки читаются.
- Редактор HUD: новый макет экрана боя под панелями.
- «Отметки» разделены на «Отметки в бою» и «Карточку танка» со своими страницами; настройки переносятся сами.
- Лампа «Шестого чувства» стоит ровно по центру.
- Ряд оборудования стоит над панелью расходников.
- Мини-карта снова показывает технику и места, где её потеряли из виду; «Никогда» убрано, по умолчанию «Постоянно».
- «Просмотр попаданий» открывается и без записанного боя, снаряд, угол и броня рисуются на модели.
- 12-часовые часы показывают AM/PM на русской Windows.
- Файлы настроек заменяются за один шаг: сбой игры во время сохранения их не теряет.
- Сообщение об ошибке запуска в python.log больше не ломается на русских ошибках Windows.

### en

- The settings window: every component opens its own page, an aligned list, a back arrow and dropdowns.
- The settings window fits the screen, the «All/Hangar/Battle» tabs are gone, the undo toast hides itself.
- Replays: the list and the details scroll separately, the icons are readable.
- HUD editor: a new battle screen mock under the panels.
- «Marks of Excellence» is split into «Marks in battle» and the «Tank card», each with its own page; settings move over.
- The «Sixth sense» lamp sits exactly centred.
- The equipment row sits above the consumables panel.
- The minimap shows vehicles and their last-seen points again; «Never» is gone, «Always» is the default.
- The «Hit viewer» opens without a recorded battle too and draws the shell, angle and armour on the model.
- The 12-hour clock shows AM/PM on Russian Windows.
- Settings files are replaced in one step: a game crash while saving no longer loses them.
- The start-up error message in python.log no longer breaks on Russian Windows errors.

## 0.3.1

### ru

- «Шестое чувство»: секунды под лампой отсчитывают засвет от 10 с (8,5 или 8 с с улучшенным радио), на нуле лампа гаснет.
- «Шестое чувство»: дуга таймера больше не съезжает с кольца и не наезжает на секунды.
- Исправлено: в бою пропадал таймер перезарядки, и стандартный, и наш. Наша рамка теперь видна весь бой во всех прицелах.
- Стандартный таймер перезарядки, журнал урона, ХП команд, таймер боя и лампа скрываются, только пока наша замена на экране.
- «Отметки»: панель в бою как у ПРОТанки и Lebwa: процент с изменением, полоса урона с риской среднего, вспышка новой отметки.
- После гибели ряд оборудования скрывается вместе со стандартной панелью снарядов, панель отметок не наезжает на подсказки.
- «Просмотр попаданий» переделан по образцу «Боевых ран»: полноэкранная модель танка, снаряд вдоль траектории, облёт камерой.
- «Прицелы»: барабан рисуется значками снарядов, у автозаряжания виден отсчёт до следующего. Новая опция «Кратность прицела».
- Исправлено: «Просмотр попаданий» мог терять попадания идущего боя.

### en

- «Sixth sense»: the seconds under the lamp count the spot time down from 10 s (8.5 or 8 s with better radio); the lamp goes out at zero.
- «Sixth sense»: the timer's arc no longer slides off the ring and over the seconds.
- Fixed: the reload timer vanished in battle, both the stock one and ours. Our frame now stays all battle in every reticle.
- The stock reload timer, damage log, team HP, battle timer and lamp hide only while our replacement is on screen.
- «Marks of Excellence»: the battle panel works like PROTanki's and Lebwa's: percent with change, damage bar, a flash at a new mark.
- After death the equipment row hides with the stock shells panel, and the marks panel no longer covers the spectator tips.
- «Hit viewer» is rebuilt after BattleHits: a full-screen tank model, the shell along its path, the camera flying to the hit.
- «Crosshairs»: the magazine is drawn as shell icons, auto-reloaders show the countdown to the next shell. New «Zoom level» option.
- Fixed: the «Hit viewer» could lose the hits of the battle in progress.

## 0.3.0

### ru

- «Прицел и снаряды»: броня под прицелом удалена, так как Леста запрещает анализ бронирования в бою.
- Прицел, камера и мини-карта больше не меняют настройки игры сами; рекомендуемые ставит кнопка на карточке.
- Панели боя скрываются вместе со стандартным интерфейсом под любым окном игры поверх боя, как в XVM.
- Убраны повторы стандартного интерфейса и компонент «Резервная копия настроек»; итоги прошлого боя — только если игра их не показывает.
- Исправлено: горячие клавиши в чате боя, настройки из меню боя, сброс настроек игры, отметка после смены аккаунта, сбои окна настроек.
- Картинки компонентов в менеджере перерисованы с крупными читаемыми подписями.

### en

- «Aim and shells»: the armour under the reticle is gone, as Lesta forbids in-battle armour analysis.
- The crosshair, camera and minimap no longer change the game's settings by themselves; a card button sets the recommended ones.
- The battle panels hide with the stock interface under every game window over the battle, as in XVM.
- Stock interface repeats and the «Settings backup» component are gone; the previous battle's card shows only if the game does not.
- Fixed: hotkeys in the battle chat, settings from the battle menu, reset game settings, the mark after an account switch, settings window crashes.
- The component pictures in the manager are redrawn with large, readable labels.

## 0.2.2

### ru

- Окно настроек: меньше лишних настроек, редакторы с живым превью, новая шапка с поиском по Ctrl+F.
- «Просмотр попаданий» (новый): попадания по вам и ваши попадания после боя видны на модели танка в ангаре.
- «Итоги боёв» в бою: карточка итогов после гибели и в конце боя, короткая карточка итогов прошлого боя.
- «Прицел и снаряды»: броня цели и пробитие вашего снаряда под прицелом.
- Новый вид панелей «Планшет наводчика»; у «Отметок» компактная плашка и вид «Силуэт танка», у прицела новые метки и таймер перезарядки.
- Исправлено: снова играет звук засвета.

### en

- The settings window: fewer needless settings, editors with a live preview, a new header with Ctrl+F search.
- «Hit viewer» (new): the hits on you and your hits are shown on the tank model in the hangar after the battle.
- «Battle results» in battle: a results card on death and at the end, a short card for the previous battle's results.
- «Aim and shells»: the target's armour and your shell's penetration under the reticle.
- A new «Gunner's range card» panel look; «Marks» gets a compact plate and a «Tank silhouette» style, the crosshair new marks and a reload timer.
- Fixed: the detection sound plays again.

## 0.2.0

### ru

- Один компонент на задачу: «Журнал боя», «Прогресс боя», «Отметки» и другие вобрали прежние компоненты; настройки переносятся сами.
- Удалены компоненты, повторявшие стандартный клиент, и все собственные звуки мода.
- Единый вид панелей; часть компонентов выключена по умолчанию, но у тех, кто их включал, остаётся.
- Исправлено: «Отметки» показывали неверный процент вроде «0,67 %»; испорченные записи исправляются сами.
- «Оборудование в бою» берётся из комплекта, с которым вы вышли в бой, и ряд не прыгает; «Журнал боя» виден с начала боя.

### en

- One component per job: «Battle log», «Battle progress», «Marks of Excellence» and others absorb the old ones; settings move over.
- The components that copied the stock client are removed, and so is every sound of the mod's own.
- One look for every panel; some components are off by default, but stay on for whoever turned them on.
- Fixed: «Marks of Excellence» showed a wrong percent such as «0.67 %»; broken entries repair themselves.
- «Equipment in battle» comes from the setup you took into battle and no longer jumps; the «Battle log» shows from the start.

## 0.1.8

### ru

- Окно настроек стало легче; редактор HUD сохраняет положение панели и после паузы в перетаскивании.

### en

- The settings window is lighter; the HUD editor saves a panel's position after a pause in a drag too.

## 0.1.7

### ru

- Окно настроек и панели HUD обновлены внутри; внешний вид и настройки не изменились.

### en

- The settings window and the HUD panels are updated internally; the look and the settings stay the same.

## 0.1.6

### ru

- Компонент «Снаряжение и снаряды» удалён: то же показывает стандартная панель игры.
- «Оборудование в бою»: только значки предметов из игры в лёгкой рамке; описание — в подсказке с Ctrl.

### en

- The «Consumables and shells» component is removed: the game's stock panel shows the same.
- «Equipment in battle»: only the game's item icons in a light frame; the description is in the Ctrl tooltip.

## 0.1.5

### ru

- Ряд оборудования над панелью снарядов снова показывается всегда; повторная панель расходников выключена.
- С зажатым Tab панели остаются на месте и не прыгают; наведение на любой наш блок показывает подсказку.
- Колесо мыши прокручивает списки реплеев и выпадающие списки; ХП команд стали компактнее.
- Превью в настройках и менеджере рисуются теми же панелями, что в бою.

### en

- The equipment row above the shells panel always shows again; the duplicate consumables bar is switched off.
- With Tab held the panels stay in place and do not jump; hovering any of our blocks shows a tooltip.
- The mouse wheel scrolls the replay lists and drop-downs; team HP is more compact.
- The previews in the settings and the manager are drawn by the same panels as in battle.

## 0.1.4

### ru

- Боевые панели больше не закрывают полосы захвата баз и прогресс боевых задач.
- В отчёте по отметкам снова видно цвет изменения процента.

### en

- The battle panels no longer cover the base capture bars and the quest progress.
- The marks report shows the colour of the percent change again.

## 0.1.3

### ru

- Новое окно настроек: разделы, карточки компонентов, поиск, отмена изменений и сброс к стандартным.
- Окно двигается, меняет размер и масштаб и запоминает их.
- Кнопка «///» в правом нижнем ряду кнопок ангара.

### en

- A new settings window: sections, component cards, search, undo and reset to defaults.
- The window moves, resizes and zooms and remembers it.
- The «///» button in the hangar's bottom-right button row.

## 0.1.2

### ru

- Новые боевые панели с иконками клиента: ХП команд и счёт, логи урона и попаданий, отметка, шестое чувство, часы и другие.
- Новые компоненты: «Артометр» и «Очки взвода».
- Исправлены ошибки в логе урона, «Личном рекорде», менеджере реплеев, режиме стримера и фильтре чата.
- Горячие клавиши работают с правыми Ctrl, Shift и Alt; быстрые действия ангара и автопополнение снова срабатывают.

### en

- New battle panels with the client's icons: team HP and score, damage and hit logs, marks, sixth sense, clock and more.
- New components: «Arty meter» and «Platoon points».
- Fixes in the damage log, «Personal best», the replay manager, streamer mode and the chat filter.
- Hotkeys work with the right Ctrl, Shift and Alt; hangar quick actions and auto-resupply work again.

## 0.1.1

### ru

- Окно настроек открывается на весь экран; Ctrl+Shift+T открывает и закрывает его.
- Боевой интерфейс и кнопка «///» надёжно появляются в ангаре и в бою.
- Панели двигаются только с зажатым Alt, не уходят за экран и не дёргаются.

### en

- The settings window opens full-screen; Ctrl+Shift+T opens and closes it.
- The HUD and the «///» button reliably appear in the hangar and in battle.
- Panels move only while Alt is held, stay on screen and no longer jitter.

## 0.1.0

### ru

- Первый выпуск «Трёх отметок» для «Мира танков» 1.45: 22 компонента, у каждого свой переключатель.
- Итоги боёв, отметки и статистика сессии по своим боям; на сайт — только после привязки кодом с triotmetki.ru.
- Боевой интерфейс: лог урона и попаданий, часы и таймер боя, ХП команд, шестое чувство, фильтр чата.
- Компоненты ангара: итоги боя, история отметок, рейтинги, менеджер реплеев, быстрые действия и другие.
- Окно настроек с профилями и редактором боевого интерфейса; настройки переживают очистку папки модов.

### en

- The first release of Три отметки for «Мир танков» 1.45: 22 components, each with its own switch.
- Battle results, marks and session stats of your own battles; sent to the site only after binding with a triotmetki.ru code.
- Battle HUD: damage and hit logs, clock and battle timer, team HP, sixth sense, a chat filter.
- Hangar components: battle summary, marks history, ratings, replay manager, quick actions and more.
- A settings window with profiles and a HUD editor; settings survive a wiped mods folder.

## pack_badge 0.1.2

### ru

- Значок стоит после ника и больше не заменяет нашивку игрока; настройка «Если у игрока выбрана своя нашивка» убрана.

### en

- The badge sits after the name and no longer replaces the player's own badge; the «When a player has a badge of their own» setting is gone.

## pack_badge 0.1.1

### ru

- Свой значок виден и без привязки мода к сайту.

### en

- Your own badge shows without binding the mod to the site.

## pack_badge 0.1.0

### ru

- Новый компонент: значок «Три отметки» у ника в ушах, по Tab и на экране загрузки — у вас и у игроков, которые привязали мод и не выключили свой значок.

### en

- New component: the Three Marks badge by the name in the player panels, the Tab stats and the loading screen, on you and on players who bound the mod and left their badge on.

## hangar_looks 0.1.1

### ru

- Обновлены сведения о лицензиях на изображения модпака.

### en

- The modpack's image licence notices are updated.

## hangar_looks 0.1.0

### ru

- Новый компонент «Виды ангара «Три отметки»» (выключен): «Ночь», «Закат», «Сталь» и «Студия» для основного ангара.
- Менеджер собирает виды на вашем ПК из файлов вашей игры и пересобирает их после обновления клиента.

### en

- New component «Three Marks hangar looks» (off): «Night», «Sunset», «Steel» and «Studio» for the main hangar.
- The manager builds the looks on your PC from your game's own files and rebuilds them after a client update.

## hit_viewer 0.3.4

### ru

- Меньше подтормаживаний в конце боя: попадания записываются в ангаре.

### en

- Fewer hitches at the end of a battle: the hits are written in the hangar.

## hit_viewer 0.3.3

### ru

- Снаряд и метка стоят на танке и после смены танка; камера смотрит на попадание, а не в пол.
- Карточка попадания больше не уходит под нижнюю панель лобби.
- Новый вид: бои с картой, итогом, уровнем и числом попаданий, цветные метки исхода, деталь и урон в списке.

### en

- The shell and marker stay on the tank after a tank swap; the camera looks at the hit, not at the floor.
- The hit card no longer slides under the lobby's bottom bar.
- New look: battles with the map, result, tier and hit counts, coloured outcome chips, part and damage in the list.

## hit_viewer 0.3.2

### ru

- Попадание отмечено только на модели: метка больше не прыгает при вращении камеры.
- Список попаданий растёт по числу строк и масштабируется под экран.
- Закрытие просмотра и смена вкладки больше не оставляют ангар на «обновлении», камера снова подлетает к попаданию.

### en

- The hit is marked on the model only: the marker no longer jumps while the camera turns.
- The hit list grows with its rows and scales with the screen.
- Closing the viewer or switching tabs no longer leaves the hangar «updating»; the camera flies to the hit again.

## hit_viewer 0.3.1

### ru

- Открывается и без записанного боя: экран подсказывает сыграть бой.
- Снаряд, угол и броня теперь рисуются на модели для каждого попадания.
- Сообщение об ошибке запуска в логе больше не ломается на русских ошибках Windows.

### en

- Opens without a recorded battle too: the screen asks you to play one.
- The shell, angle and armour are now drawn on the model for every hit.
- The start-up error message in the log no longer breaks on Russian Windows errors.

## hit_viewer 0.3.0

### ru

- «Просмотр попаданий» переделан по образцу «Боевых ран»: отдельный полноэкранный ангар с моделью танка и компактным списком сбоку.
- На модели виден снаряд по траектории и метка исхода, башня и орудие стоят как в момент выстрела, камера облетает попадание.
- Мышь вращает камеру, колесо приближает, ←/→ и ↑/↓ листают попадания, Tab переключает вкладку «По мне / По врагам».
- «Снаряд» всегда показывает тип и калибр, «Угол» — угол встречи, «Броня» — приведённую и номинальную броню.
- Кнопка в списке модов открывает просмотр всегда; до первого боя он подсказывает сыграть бой.
- Исправлено: попадания снова отображаются на модели, а запись не теряет идущий бой.

### en

- «Hit viewer» is rebuilt after BattleHits: a separate full-screen hangar with the tank model and a compact list at the side.
- The model shows the shell along its path and the outcome marker, the turret and gun stand as at the shot, the camera flies to the hit.
- The mouse turns the camera, the wheel zooms, ←/→ and ↑/↓ step through hits, Tab switches «On me / On enemies».
- «Shell» always shows type and calibre, «Angle» the impact angle, «Armour» the effective and nominal armour.
- The mods list entry always opens the viewer; before the first battle it suggests playing one.
- Fixed: hits are drawn on the model again, and recording no longer loses the battle in progress.

## hit_viewer 0.2.0

### ru

- «Просмотр попаданий» открывается своей кнопкой в списке модов: последний бой в одно нажатие; в очереди кнопка неактивна.
- Окно, закрытое самим клиентом, больше не оставляет в ангаре подменённый танк.
- Бой после переподключения остаётся одним боем, а не двумя строками.
- Переход к другому бою больше не оставляет модель и попадания прошлого; повторное открытие не зависает в «загрузке».

### en

- «Hit viewer» opens from its own mods list entry: the last battle in one click; greyed out in the battle queue.
- A window the client closes itself no longer leaves the swapped tank in the hangar.
- A battle rejoined after a disconnect stays one battle instead of two rows.
- Switching battles no longer keeps the previous model and hits; reopening no longer gets stuck loading.

## hit_viewer 0.1.0

### ru

- Новый компонент «Просмотр попаданий» (включён): после боя попадания по вам и ваши попадания видны на модели танка в ангаре.
- Список «По мне / По врагам» с углом встречи и приведённой бронёй, выбор боя; хранит последние 20 боёв.
- Открывается кнопкой компонента, из истории «Итогов боёв» и из «Менеджера реплеев».

### en

- New component «Hit viewer» (on): after a battle the hits on you and your hits show on the tank model in the hangar.
- An «On me / On enemies» list with impact angle and effective armour, a battle picker; keeps the last 20 battles.
- Opens from the component's button, the «Battle results» history and the «Replay manager».

## battle_progress 0.2.3

### ru

- Доля в уроне команды больше не появляется по Alt, только с её настройкой.

### en

- The share of the team damage no longer shows on Alt, only with its setting.

## battle_progress 0.2.2

### ru

- Внутренняя доработка: компонент работает как раньше.

### en

- Internal cleanup: the component works as before.

## battle_progress 0.2.1

### ru

- Сообщение об ошибке запуска в логе больше не ломается на русских ошибках Windows.

### en

- The start-up error message in the log no longer breaks on Russian Windows errors.

## battle_progress 0.2.0

### ru

- Плашка стоит справа от полосы ХП команд, как у Battle Observer; на узких экранах — под ней.
- «Основной калибр» показывает, сколько урона осталось до медали («−1 090») или превышение («+160»); только в случайных боях.
- Строка рекорда танка убрана.

### en

- The plate sits right of the team HP strip, as in Battle Observer; under it on narrow screens.
- High Caliber shows the damage still needed for the medal («−1 090») or the excess («+160»); random battles only.
- The tank record row is gone.

## battle_progress 0.1.0

### ru

- Новый компонент «Прогресс боя» (выключен): одна плашка с «Основным калибром», рекордом танка и WN8 боя.
- Заменяет «Основной калибр», «Эффективность боя» и «Личный рекорд»; рекорды танков сохранены.

### en

- New component «Battle progress» (off): one plate with High Caliber, the tank record and this battle’s WN8.
- Replaces High Caliber, Battle efficiency and Personal best; tank records are kept.

## preset_advisor 0.1.3

### ru

- Внутренняя доработка: компонент работает как раньше.

### en

- Internal cleanup: the component works as before.

## preset_advisor 0.1.2

### ru

- Сообщение об ошибке запуска в логе больше не ломается на русских ошибках Windows.

### en

- The start-up error message in the log no longer breaks on Russian Windows errors.

## preset_advisor 0.1.1

### ru

- Менеджер теперь сам ставит всё, что нужно для работы подсказок.

### en

- The manager now installs everything the hints need.

## preset_advisor 0.1.0

### ru

- Новый компонент: в окне снаряжения подсвечиваются оборудование и инструкции, которые ставят лучшие 10 % игроков на этом танке.
- Расходники включаются отдельно. Мод ничего не ставит и не покупает сам; работает только в ангаре.

### en

- New component: the loadout window marks the equipment and directives the top 10 % of players fit on this tank.
- Consumables can be switched on separately. The mod never fits or buys anything itself; hangar only.

## free_camera 0.1.3

### ru

- Свободная камера не перехватывает клавиши и мышь, пока не летает.

### en

- The free camera no longer takes the keys and the mouse while it is not flying.

## free_camera 0.1.2

### ru

- Сообщение об ошибке запуска в логе больше не ломается на русских ошибках Windows.

### en

- The start-up error message in the log no longer breaks on Russian Windows errors.

## free_camera 0.1.1

### ru

- Бой, начавшийся во время полёта над ангаром, получает свою камеру.

### en

- A battle that starts while flying over the hangar keeps its own camera.

## free_camera 0.1.0

### ru

- Новый компонент «Свободная камера» (выключен): Ctrl+Shift+F в реплеях и в ангаре, управление WASD, Q/E, мышью и колесом.
- В полёте интерфейс игры и панели мода прячутся (можно отключить).
- В живом бою камера не включается.

### en

- New component «Free camera» (off): Ctrl+Shift+F in replays and the hangar, controlled with WASD, Q/E, the mouse and wheel.
- While flying, the game interface and mod panels hide (can be turned off).
- It never works in a live battle.

## aim_info 0.1.4

### ru

- Внутренняя доработка: компонент работает как раньше.

### en

- Internal cleanup: the component works as before.

## aim_info 0.1.3

### ru

- Уменьшенный круг сведения переехал в компонент «Прицел».

### en

- The smaller aim circle moved to the «Crosshair» component.

## aim_info 0.1.2

### ru

- Сообщение об ошибке запуска в логе больше не ломается на русских ошибках Windows.

### en

- The start-up error message in the log no longer breaks on Russian Windows errors.

## aim_info 0.1.1

### ru

- Броня под прицелом удалена: Леста запрещает анализ бронирования в бою.
- Остались дистанция у прицела, подсказки снарядов и круг сведения (выключен по умолчанию).

### en

- Armour under the reticle is removed: Lesta forbids in-battle armour analysis.
- The reticle distance, shell tooltips and the aim circle (off by default) stay.

## aim_info 0.1.0

### ru

- Дистанция у прицела до любой техники под ним.
- Подсказка снаряда показывает урон модулям, а без технической информации игры — ещё урон, пробитие и скорость.
- Круг сведения меньше стандартного (40–100 %, по умолчанию 70 %), выключен по умолчанию.

### en

- The reticle distance to any vehicle under it.
- The shell tooltip shows module damage, and with the game's technical info off also damage, penetration and speed.
- An aim circle smaller than stock (40–100 %, 70 % by default), off by default.

## responsive_reticle 0.1.2

### ru

- Круг сведения снова сужается плавно, маркер не подтормаживает при низком FPS и не отстаёт на кадр.
- Пока прицел и танк стоят, компонент не нагружает игру; ствол на модели поспевает за маркером.

### en

- The aim circle shrinks smoothly again, the marker no longer stutters at low FPS or lags a frame behind.
- While the reticle and the tank are still the component costs nothing; the gun on the model keeps up with the marker.

## responsive_reticle 0.1.1

### ru

- Сообщение об ошибке запуска в логе больше не ломается на русских ошибках Windows.

### en

- The start-up error message in the log no longer breaks on Russian Windows errors.

## responsive_reticle 0.1.0

### ru

- «Отзывчивый прицел»: маркер орудия следует за орудием каждый кадр и больше не «плывёт» за мышью.
- Догонять сразу или плавно — на выбор. Включён; сам отключается для арты и в реплеях.

### en

- «Responsive reticle»: the gun marker follows the gun every frame and no longer lags behind the mouse.
- Catch up at once or smoothly, your choice. On; turns itself off for SPGs and in replays.

## battle_hotkeys 0.1.2

### ru

- Внутренняя доработка: компонент работает как раньше.

### en

- Internal cleanup: the component works as before.

## battle_hotkeys 0.1.1

### ru

- Сообщение об ошибке запуска в логе больше не ломается на русских ошибках Windows.

### en

- The start-up error message in the log no longer breaks on Russian Windows errors.

## battle_hotkeys 0.1.0

### ru

- Горячие клавиши в бою для серверного прицела и увеличенного зума x16/x25 (Ctrl+Shift+J и Ctrl+Shift+K) с подсказкой над прицелом.
- Выключен по умолчанию: меняет настройки игры.

### en

- Battle hotkeys for the server reticle and extended zoom x16/x25 (Ctrl+Shift+J and Ctrl+Shift+K) with a notice over the reticle.
- Off by default: it changes your game settings.

## quick_demount 0.1.2

### ru

- Внутренняя доработка: компонент работает как раньше.

### en

- Internal cleanup: the component works as before.

## quick_demount 0.1.1

### ru

- Сообщение об ошибке запуска в логе больше не ломается на русских ошибках Windows.

### en

- The start-up error message in the log no longer breaks on Russian Windows errors.

## quick_demount 0.1.0

### ru

- «Быстрый демонтаж» в меню оборудования: снимает его с выбранного вашего танка во всех комплектах.
- Платный демонтаж игра подтверждает сама. Выключен по умолчанию.

### en

- «Quick demount» in the equipment menu: takes the device off a chosen tank of yours in every setup.
- The game confirms a paid demount itself. Off by default.

## hud_layouts 0.1.3

### ru

- Внутренняя доработка: компонент работает как раньше.

### en

- Internal cleanup: the component works as before.

## hud_layouts 0.1.2

### ru

- «Только основные» показывает отметку и лог урона: часов в бою больше нет.

### en

- «Essentials only» shows the marks and the damage log: the battle clock is gone.

## hud_layouts 0.1.1

### ru

- Сообщение об ошибке запуска в логе больше не ломается на русских ошибках Windows.

### en

- The start-up error message in the log no longer breaks on Russian Windows errors.

## hud_layouts 0.1.0

### ru

- Новый компонент «Раскладка по типу боя»: свой набор панелей для случайных боёв, «Натиска», «Линии фронта», событий и «Стального охотника».
- Варианты: «Все панели», «Только основные» или «Без панелей»; тип боя определяется сам.
- Места панелей можно задать отдельно для каждого типа боя в «Редакторе HUD».

### en

- New component «Layout per battle type»: a panel set for random battles, Onslaught, Frontline, events and Steel Hunter.
- Options: «All panels», «Essentials only» or «No panels»; the battle type is detected automatically.
- Panel places can be set per battle type in the «HUD editor».

## depot_seller 0.1.3

### ru

- Внутренняя доработка: компонент работает как раньше.

### en

- Internal cleanup: the component works as before.

## depot_seller 0.1.2

### ru

- Сообщение об ошибке запуска в логе больше не ломается на русских ошибках Windows.

### en

- The start-up error message in the log no longer breaks on Russian Windows errors.

## depot_seller 0.1.1

### ru

- Если склад или цены изменились при открытом подтверждении, продажа отменяется.
- Кнопка «Продать» больше не зависает после ошибки.

### en

- If the depot or prices change while the confirmation is open, the sale is cancelled.
- «Sell» no longer gets stuck after an error.

## depot_seller 0.1.0

### ru

- Новый компонент «Продажа со склада»: продаёт ненужные снаряды, модули, оборудование и снаряжение, демобилизует танкистов без навыков из резерва.
- Все категории выключены по умолчанию; премиум-экипаж не демобилизуется никогда.
- «Продать» показывает список и сумму в кредитах для подтверждения.

### en

- New component «Depot seller»: sells unneeded shells, modules, equipment and consumables, dismisses reserve crew without skills.
- Every category is off by default; premium crew is never dismissed.
- «Sell» shows the list and the credits for confirmation.

## auto_reserves 0.1.3

### ru

- Внутренняя доработка: компонент работает как раньше.

### en

- Internal cleanup: the component works as before.

## auto_reserves 0.1.2

### ru

- Сообщение об ошибке запуска в логе больше не ломается на русских ошибках Windows.

### en

- The start-up error message in the log no longer breaks on Russian Windows errors.

## auto_reserves 0.1.1

### ru

- После смены аккаунта резервы включаются в его первом ангаре.
- Включение «в начале сессии» больше не срабатывает впустую на экране входа; отказ по одному резерву не блокирует остальные.

### en

- After an account switch the reserves are turned on in its first hangar.
- «At the start of the session» no longer fires uselessly on the login screen; one refused reserve no longer blocks the others.

## auto_reserves 0.1.0

### ru

- Новый компонент «Автоактивация резервов» (выключен): включает выбранные личные резервы при запуске игры и, по желанию, по окончании.
- Сначала самые сильные, не больше свободных слотов; есть кнопка «Включить выбранные сейчас».

### en

- New component «Auto personal reserves» (off): turns the chosen personal reserves on at game start and, optionally, when one runs out.
- Strongest first, never more than the free slots; a «Turn the chosen ones on now» button.

## crew_xp 0.2.2

### ru

- Внутренняя доработка: компонент работает как раньше.

### en

- Internal cleanup: the component works as before.

## crew_xp 0.2.1

### ru

- Сообщение об ошибке запуска в логе больше не ломается на русских ошибках Windows.

### en

- The start-up error message in the log no longer breaks on Russian Windows errors.

## crew_xp 0.2.0

### ru

- Карточка под экипажем выключена по умолчанию, строка в подсказке танкиста осталась.

### en

- The card under the crew is off by default; the line in the crew member tooltip stays.

## crew_xp 0.1.0

### ru

- Новый компонент «Опыт экипажа»: сколько опыта и примерно боёв осталось каждому танкисту до навыка, с полосой уровня.
- Та же строка в подсказке танкиста.

### en

- New component «Crew XP»: the XP and roughly the battles each crew member needs to finish a skill, with a level bar.
- The same line in the crew member tooltip.

## hangar_space 0.2.2

### ru

- Плитки ангаров и видов показывают кадр вашего ангара: он снимается один раз после выбора, когда окно закрыто; кнопка «Обновить превью» снимает заново.
- Выбранный ангар применяется и после входа в бой до загрузки ангара.

### en

- Hangar and look tiles show a shot of your own hangar, taken once after you pick it with the window closed; «Refresh preview» takes it again.
- The chosen hangar applies even after joining a battle before the hangar loaded.

## hangar_space 0.2.1

### ru

- Выбранный ангар и вид снова применяются, когда игра сама держит обычный ангар; ангар события по-прежнему главнее.
- Виды «Три отметки» из компонента «Виды ангара» появляются в разделе «Вид».
- В логе видно, какой ангар выбран и что загружено.

### en

- The chosen hangar and look apply again while the game itself holds the regular hangar; an event hangar still wins.
- The Three Marks looks of the «Hangar looks» component show in the «Look» section.
- The log shows which hangar is chosen and what is loaded.

## hangar_space 0.2.0

### ru

- Раздел «Вид»: освещение ангара из игры — «Осень», «Осень: дождь», «Студия», «Натиск: ночь»; меняется сразу.

### en

- A «Look» section: hangar lighting from the game — «Autumn», «Autumn: rain», «Studio», «Onslaught: night»; changes at once.

## hangar_space 0.1.2

### ru

- Сообщение об ошибке запуска в логе больше не ломается на русских ошибках Windows.

### en

- The start-up error message in the log no longer breaks on Russian Windows errors.

## hangar_space 0.1.1

### ru

- Несуществующий ангар, введённый вручную, больше не ломает загрузку ангара.

### en

- A missing hangar typed in manually no longer breaks the hangar load.

## hangar_space 0.1.0

### ru

- Новый компонент «Выбор ангара» (выключен): ставит любой ангар из игры вместо стандартного, «Как в игре» возвращает его.
- Событийные ангары и ангары других режимов не меняются.

### en

- New component «Hangar switcher» (off): puts any of the game's hangars in place of the standard one; «As in the game» brings it back.
- Event hangars and other modes' hangars stay unchanged.

## update_notice 0.2.2

### ru

- Номер версии от сервера проверяется целиком, прежде чем попасть в уведомление.

### en

- The version number from the server is checked in full before it reaches the notification.

## update_notice 0.2.1

### ru

- Сообщение об ошибке запуска в логе больше не ломается на русских ошибках Windows.

### en

- The start-up error message in the log no longer breaks on Russian Windows errors.

## update_notice 0.2.0

### ru

- Вместо карточки в ангаре — значок на строке мода в списке модов и одно уведомление.
- Исправлено ложное уведомление об обновлении при одинаковых версиях вроде 1.2 и 1.2.0.

### en

- A badge on the mod's row in the mods list and one notification replace the hangar card.
- Fixed a false update notice for equal versions like 1.2 and 1.2.0.

## update_notice 0.1.0

### ru

- Новый компонент «Новая версия мода»: раз за запуск проверяет обновления и сообщает о новой версии.
- В окне мода можно пропустить версию, скачать на сайте или проверить снова.

### en

- New component «New mod version»: checks for updates once per game start and reports a new version.
- The mod window can skip the version, download it on the site or check again.

## comp7_helper 0.4.2

### ru

- Внутренняя доработка: компонент работает как раньше.

### en

- Internal cleanup: the component works as before.

## comp7_helper 0.4.1

### ru

- Сообщение об ошибке запуска в логе больше не ломается на русских ошибках Windows.

### en

- The start-up error message in the log no longer breaks on Russian Windows errors.

## comp7_helper 0.4.0

### ru

- С карточки убраны рейтинг и дивизион — их показывает шапка «Натиска»; пороги, навык роли и серия остались.

### en

- The rating and division are off the card, the Onslaught header shows them; thresholds, role skill and streak stay.

## comp7_helper 0.3.0

### ru

- Серия побед или поражений и последние 5 боёв «Натиска» с изменением рейтинга; отключается в настройках.

### en

- The Onslaught win or loss streak and the last 5 battles with the rating change; can be turned off in the settings.

## comp7_helper 0.2.1

### ru

- Карточка в ширину и стиле остальных карточек ангара.

### en

- The card matches the width and style of the other hangar cards.

## comp7_helper 0.1.0

### ru

- Новый компонент «Натиск: дивизионы»: рейтинг, дивизион и прогресс до следующего, пороги «Чемпиона» и «Легенды», навык роли.
- Вне «Натиска» карточка скрыта.

### en

- New component «Onslaught divisions»: rating, division and progress to the next, the Champion and Legend thresholds, the role skill.
- Hidden outside Onslaught.

## event_trackers 0.1.3

### ru

- Внутренняя доработка: компонент работает как раньше.

### en

- Internal cleanup: the component works as before.

## event_trackers 0.1.2

### ru

- Сообщение об ошибке запуска в логе больше не ломается на русских ошибках Windows.

### en

- The start-up error message in the log no longer breaks on Russian Windows errors.

## event_trackers 0.1.1

### ru

- Карточка в ширину и стиле остальных карточек ангара.

### en

- The card matches the width and style of the other hangar cards.

## event_trackers 0.1.0

### ru

- Новый компонент «Трекеры событий» (выключен).
- «Триатлон»: текущий раунд, лучшие бои, оставшееся время и лучший раунд события.
- «Торговый караван»: ваши жетоны и время до конца события.

### en

- New component «Event trackers» (off).
- Triathlon: the current round, best battles, time left and the event's best round.
- Trading Caravan: your tokens and the time to the end of the event.

## platoon_points 0.2.4

### ru

- Полоски ХП взвода видны всегда, а не только по Alt.

### en

- The platoon HP bars always show, not only on Alt.

## platoon_points 0.2.3

### ru

- Меньше нагрузки на загрузке боя.
- Пример в окне настроек показан на языке игры.

### en

- Less work while a battle loads.
- The sample in the settings window is shown in the game's language.

## platoon_points 0.2.2

### ru

- Сообщение об ошибке запуска в логе больше не ломается на русских ошибках Windows.

### en

- The start-up error message in the log no longer breaks on Russian Windows errors.

## platoon_points 0.2.1

### ru

- Взводный с поздним входом в бой теперь учитывается во взводе.

### en

- A platoon mate who joins late is now counted in the platoon.

## platoon_points 0.2.0

### ru

- Заголовок «Очки взвода» с итогом золотом, фраги как «фр. N»; полоски прочности — только с Alt.

### en

- A «Platoon points» header with the total in gold, frags as «fr. N»; HP bars only with Alt.

## platoon_points 0.1.2

### ru

- Новое место по умолчанию справа от левого списка команд: больше не перекрывает списки, чат и миникарту.

### en

- New default place right of the left team list: no longer covers the lists, chat or minimap.

## platoon_points 0.1.1

### ru

- По умолчанию слева вверху рядом с отметкой; компонент выключен по умолчанию.

### en

- By default top left next to the marks; the component is off by default.

## platoon_points 0.1.0

### ru

- «Очки взвода»: турнирные очки за урон, помощь, фраги и выживание по вашим правилам, с полосками ХП взвода.

### en

- «Platoon points»: tournament-style points for damage, assist, frags and survival by your rules, with platoon HP bars.

## gun_arc 0.4.2

### ru

- Отметки УГН не перерисовываются, пока танк и камера стоят, и не мигают у края экрана.

### en

- The traverse limit marks are not redrawn while the tank and the camera stand still, and no longer flicker at the screen edge.

## gun_arc 0.4.1

### ru

- Сообщение об ошибке запуска в логе больше не ломается на русских ошибках Windows.

### en

- The start-up error message in the log no longer breaks on Russian Windows errors.

## gun_arc 0.4.0

### ru

- «УГН» как в сборках: вместо шкалы — маркеры по сторонам прицела у пределов горизонтальной наводки.
- На выбор несколько видов граничных маркеров и маркер середины сектора; есть «Ускоренная отрисовка».
- Настройки шкалы убраны.

### en

- «УГН» works as in the packs: markers either side of the reticle at the horizontal traverse limits replace the scale.
- Several limit marker styles and a sector centre marker to choose from; a «Faster redraw» option.
- The scale's settings are gone.

## gun_arc 0.3.1

### ru

- Шкала без плашки: жёлтая у упора, красная в упоре; компонент выключен по умолчанию.

### en

- The scale has no plate: yellow near a limit, red at it; the component is off by default.

## gun_arc 0.3.0

### ru

- Углы наводки — шкала с упорами, осью корпуса и орудием, градусы до каждого упора и текущий угол орудия.
- Шкала держится под прицелом во всех режимах камеры или стоит на своём месте.

### en

- Gun traverse is a scale with the limits, hull axis and gun, the degrees to each limit and the gun's current angle.
- The scale stays under the reticle in every camera mode or at its own place.

## gun_arc 0.2.1

### ru

- Новое место по умолчанию больше не перекрывает списки команд, чат и миникарту.

### en

- The new default place no longer covers the team lists, chat or minimap.

## gun_arc 0.2.0

### ru

- УГН — плашка с градусами до упора цветом и полосой положения орудия, по умолчанию под перезарядкой.
- Выключен по умолчанию.

### en

- Gun traverse is a plate with coloured degrees to each limit and a gun position bar, under the reload bar by default.
- Off by default.

## gun_arc 0.1.0

### ru

- УГН своего орудия: градусы до упора влево и вправо и подсветка у края, только на машинах с ограниченной наводкой.

### en

- Your gun's traverse limits: degrees left to each side and a highlight near the edge, only on limited-traverse vehicles.

## bush_circle 0.1.3

### ru

- Внутренняя доработка: компонент работает как раньше.

### en

- Internal cleanup: the component works as before.

## bush_circle 0.1.2

### ru

- Сообщение об ошибке запуска в логе больше не ломается на русских ошибках Windows.

### en

- The start-up error message in the log no longer breaks on Russian Windows errors.

## bush_circle 0.1.1

### ru

- Выключение в бою сразу убирает круг; в режимах с возрождением он возвращается на новом танке.

### en

- Switching it off in battle removes the circle at once; in respawn modes it returns on the new tank.

## bush_circle 0.1.0

### ru

- Круг 15 м вокруг вашего танка: постоянно или по клавише, четыре цвета.

### en

- A 15 m circle around your tank: always on or by a hotkey, four colours.

## hangar_info 0.6.3

### ru

- Внутренняя доработка: компонент работает как раньше.

### en

- Internal cleanup: the component works as before.

## hangar_info 0.6.2

### ru

- Часы в бою убраны: компонент показывает время, сервер, пинг и онлайн только в ангаре; стандартный таймер боя всегда на месте.

### en

- The battle clock is gone: the component shows the time, server, ping and online only in the hangar; the stock battle timer always stays.

## hangar_info 0.6.1

### ru

- Сообщение об ошибке запуска в логе больше не ломается на русских ошибках Windows.

### en

- The start-up error message in the log no longer breaks on Russian Windows errors.

## hangar_info 0.6.0

### ru

- Часы и сервер в ангаре теперь слева вверху под шапкой, как у Battle Observer.

### en

- The hangar clock and server now sit top left under the header, as in Battle Observer.

## hangar_info 0.5.0

### ru

- «Часы и сервер»: полоса над каруселью (время, дата, сервер, пинг, онлайн) и часы в бою под таймером.
- Строки танка удалены; по умолчанию время без секунд и дата без года.

### en

- «Clock and server»: a strip above the carousel (time, date, server, ping, online) and a battle clock under the timer.
- The tank rows are gone; time without seconds and date without the year by default.

## hangar_info 0.4.0

### ru

- Подпись стала карточкой: время, дата, сервер, пинг цветом, онлайн и сведения о выбранном танке.
- Видна только в самом ангаре, по умолчанию справа под верхней панелью.

### en

- The label is a card: time, date, server, coloured ping, online and details of the selected tank.
- Shown only in the hangar itself, by default on the right under the top bar.

## hangar_info 0.3.0

### ru

- Кнопка «Броня на сайте» открывает 3D-броню выбранного танка на triotmetki.ru.

### en

- An «Armour on the site» button opens the selected tank's 3D armour on triotmetki.ru.

## battle_loadout 0.7.4

### ru

- Ряд оборудования поднят над номерами слотов расходников.
- Пример в окне настроек показан на языке игры.

### en

- The equipment row sits higher, clear of the consumables' slot numbers.
- The sample in the settings window is shown in the game's language.

## battle_loadout 0.7.3

### ru

- Ряд оборудования стоит над панелью расходников по её центру.

### en

- The equipment row sits centred above the consumables panel.

## battle_loadout 0.7.2

### ru

- Ряд оборудования стоит над панелью расходников, пустые слоты не занимают места.
- Сообщение об ошибке запуска в логе больше не ломается на русских ошибках Windows.

### en

- The equipment row sits above the consumables panel; empty slots take no room.
- The start-up error message in the log no longer breaks on Russian Windows errors.

## battle_loadout 0.7.1

### ru

- Ряд оборудования скрывается вместе со стандартной панелью снарядов: после гибели, в видеокамере и при выборе комплектов перед боем.

### en

- The equipment row hides with the stock shells panel: after your tank is destroyed, in the video camera and in pre-battle setups.

## battle_loadout 0.7.0

### ru

- Ряд оборудования стоит слева от стандартной панели снарядов на её высоте, как в Lebwa и Jove, а не поверх неё.
- Исправлено: в расстановке панелей в ангаре образец ряда пропадал после перетаскивания, сброса или смены настроек.

### en

- The equipment row sits left of the stock shells panel at its height, as in Lebwa and Jove, not on top of it.
- Fixed: in the hangar's HUD edit mode the row's sample vanished after a drag, a reset or a settings change.

## battle_loadout 0.6.0

### ru

- Ячейки и значки как у стандартной панели, разделитель перед директивами, подсказка по Ctrl в общем стиле.

### en

- Slots and icons like the stock panel, a divider before the directives, the Ctrl tooltip in the shared style.

## battle_loadout 0.5.1

### ru

- Исправлено: ряд оборудования оставался пустым в бою.
- Если ваш танк появляется в бою с задержкой, ряд заполняется сам.

### en

- Fixed: the equipment row stayed empty in battle.
- When your tank joins the battle late, the row fills in by itself.

## battle_loadout 0.5.0

### ru

- Только оборудование и директивы значками в квадратных ячейках, без подписей и плашек наборов и снарядов.
- Директива, не действующая на танк, — щит с «!»; у улучшенного, трофейного и модернизированного — стандартная метка, ★ — в слоте специализации.
- Название и действие предмета — в подсказке игры при наведении с Ctrl.
- Если у предмета нет картинки, в ячейке наш значок.

### en

- Equipment and directives only, as icons in square cells, with no labels and no set or shells badges.
- A directive that does not affect the tank shows a shield with «!»; improved, trophy and modernized devices get the stock mark, ★ marks a specialisation slot.
- The item's name and effect are in the game's tooltip on hover with Ctrl.
- When an item has no image, the cell shows our glyph.

## battle_loadout 0.4.1

### ru

- Исправлено: оборудование снова видно в бою.

### en

- Fixed: the equipment shows in battle again.

## battle_loadout 0.4.0

### ru

- Директива снова в ряду, с «!», если не действует на танк; усиленное ею оборудование подсвечено.
- Бейджи «набор 1/2» и «снаряды 1/2» показывают выбранный набор полевой модернизации.
- Маскировочная сеть и стереотруба светятся, пока работают; израсходованная улучшенная конфигурация тускнеет.
- Значки 45×45, как стандартные в бою.

### en

- The directive is back in the row, with «!» when it does not affect the tank; the equipment it boosts is highlighted.
- «set 1/2» and «shells 1/2» badges show the selected field modification set.
- The camouflage net and binoculars glow while active; a spent improved configuration fades.
- 45×45 icons, like the stock ones in battle.

## battle_loadout 0.3.0

### ru

- Значки оборудования вместо названий — над стандартной панелью снарядов, по центру, на любом масштабе.
- Подсказка с названием и действием предмета при наведении (Ctrl).
- Метки «+», модернизации, трофея и ★ в слоте своей специализации.
- Не нужно заранее выбирать танк в ангаре. Включено по умолчанию; полевая модернизация и инструкции больше не показываются.

### en

- Equipment icons instead of names, above the stock shells panel, centred, at any interface scale.
- A tooltip with the item's name and effect on hover (Ctrl).
- «+», modernized, trophy and ★ specialisation-slot marks.
- No need to select the tank in the hangar first. On by default; field modifications and directives are no longer shown.

## battle_loadout 0.2.1

### ru

- Звёздочка бонуса учитывает выбранную специализацию слота, как в ангаре.
- По умолчанию полоса не наезжает на лог урона.
- Выключен по умолчанию, включается в окне настроек.

### en

- The bonus star counts the slot specialization you chose, as the hangar does.
- By default the strip no longer runs into the damage log.
- Off by default; turn it on in the settings window.

## battle_loadout 0.2.0

### ru

- Оборудование и директивы значками игры со звездой бонуса, слева от панели расходников.

### en

- Equipment and directives as game icons with the bonus star, left of the consumables bar.

## battle_loadout 0.1.0

### ru

- Оборудование, полевая модернизация и директивы вашего танка в бою: значками или списком по группам, ★ — в слоте с бонусом.

### en

- Your tank's equipment, field modifications and directives in battle: as icons or a list by group, ★ marks a bonus slot.

## personal_missions 0.3.2

### ru

- Пример в окне настроек показан на языке игры.

### en

- The sample in the settings window is shown in the game's language.

## personal_missions 0.3.1

### ru

- Сообщение об ошибке запуска в логе больше не ломается на русских ошибках Windows.

### en

- The start-up error message in the log no longer breaks on Russian Windows errors.

## personal_missions 0.3.0

### ru

- Строка в бою убрана: условия ЛБЗ показывает панель самой игры. Карточка в ангаре и список в окне мода остались.

### en

- The battle line is gone: the game's own panel shows the conditions. The hangar card and the mod window list stay.

## personal_missions 0.2.1

### ru

- Новое место по умолчанию в бою — слева от правого списка команд, без наездов на списки, чат и миникарту.

### en

- New default place in battle, left of the right team list, clear of the team lists, chat and minimap.

## personal_missions 0.2.0

### ru

- Подпись «ЛБЗ» в ангаре стала компактной карточкой со счётчиками и задачами в работе; полные условия — в окне мода.
- Карточка видна только в самом ангаре.
- Строка в бою — такая же карточка, выключена по умолчанию.

### en

- The «ЛБЗ» hangar label is now a compact card with counters and missions in progress; full conditions are in the mod window.
- The card shows only in the hangar itself.
- The battle line is the same card, off by default.

## personal_missions 0.1.0

### ru

- Помощник ЛБЗ: задачи в работе с условиями — в ангаре, в бою и списком в окне мода.

### en

- Personal missions helper: missions in progress with their conditions in the hangar, in battle and as a list in the mod window.

## streamer_mode 0.1.3

### ru

- Сообщение об ошибке запуска в логе больше не ломается на русских ошибках Windows.

### en

- The start-up error message in the log no longer breaks on Russian Windows errors.

## streamer_mode 0.1.2

### ru

- Скрытие чата больше не прячет системные сообщения, только сообщения игроков.

### en

- Hiding the chat no longer hides system messages, only players' messages.

## streamer_mode 0.1.1

### ru

- Приватный режим прячет карточку «Сессия», ЛБЗ и карточку танка. Выключен по умолчанию.

### en

- Private mode hides the Session card, the missions and the tank card. Off by default.

## streamer_mode 0.1.0

### ru

- Клавиша (по умолчанию Ctrl+Shift+H) убирает и возвращает все панели мода; можно оставить их скрытыми и в следующем бою.
- Приватный режим скрывает чат других игроков и подписи ангара с вашими цифрами. Ник и клан не скрываются.

### en

- A key (Ctrl+Shift+H by default) hides and restores all mod panels; they can stay hidden in the next battle too.
- Private mode hides other players' chat and the hangar labels with your numbers. Your name and clan stay.

## crosshair 0.6.4

### ru

- «Уменьшенный круг сведения» — отдельный компонент со своим переключателем и страницей: 80, 70 или 60 % с превью; из «Прицела» настройка убрана.
- Таймер перезарядки и значки снарядов у прицела крупнее, цифры светлые и с контуром.
- Выключенный «Уменьшенный круг сведения» не нагружает игру.

### en

- «Smaller aim circle» is a component of its own with its switch and page: 80, 70 or 60 % with a preview; the setting left «Crosshairs».
- The reload timer and shell icons by the reticle are larger, the figures bright and outlined.
- The «Smaller aim circle» costs nothing while it is off.

## crosshair 0.6.3

### ru

- Уменьшенный круг сведения, как в модпаках: 80, 70 или 60 % от игрового, обычный и серверный прицел. Настройка переехала сюда из «Прицела и снарядов».
- Таймер перезарядки у прицела больше не дублируется стандартным в первом бою и на автодозарядке.
- Значки снарядов магазина больше не пропадают.

### en

- A smaller aim circle as in the modpacks: 80, 70 or 60 % of the game's, client and server reticle. The setting moved here from «Aim and shells».
- The reload timer by the reticle is no longer doubled by the stock one in the first battle and on auto-reloaders.
- The magazine's shell icons no longer vanish.

## crosshair 0.6.2

### ru

- Кратность зума у прицела включена по умолчанию; изменённая вручную настройка остаётся.

### en

- The zoom readout by the reticle is on by default; a setting you changed stays.

## crosshair 0.6.1

### ru

- В начале боя, пока снаряды не выбраны, барабан больше не пишет ошибку игры в лог.
- Сообщение об ошибке запуска в логе больше не ломается на русских ошибках Windows.

### en

- At the start of a battle, before the shells are set, the magazine no longer writes a game error to the log.
- The start-up error message in the log no longer breaks on Russian Windows errors.

## crosshair 0.6.0

### ru

- Барабан у прицела значками снарядов: заряженные светлые, отстрелянные тусклые; время всего барабана под таймером.
- Настройка «Барабан»: «Снаряды», «Полоски», «Как в игре».
- Настройка «Кратность прицела» (выключена): «x8.0» справа от прицела в снайперском режиме.
- Исправлено: перезарядка могла не отображаться совсем; рамка и дуги теперь видны и в арт-прицеле.

### en

- The magazine by the reticle as shell icons: loaded bright, fired dim; the whole drum's reload under the timer.
- The «Magazine» option: «Shells», «Bars», «Game default».
- The «Zoom level» option (off): «x8.0» right of the reticle in sniper mode.
- Fixed: the reload could vanish entirely; the frame and arcs now show in the artillery reticle too.

## crosshair 0.5.0

### ru

- По умолчанию центр прицела стандартный; оранжевый шеврон остаётся в галерее.
- Таймер перезарядки и дуги больше не дублируют стандартные индикаторы прицела.
- Ремонт модулей у прицела убран: его показывает стандартная панель повреждений.
- Исправлено: таймер завышал время, если бой начинался во время перезарядки.
- Пресет прицела, изменённый в бою, больше не теряется и не сбрасывает другие настройки игры.

### en

- The stock reticle centre is the default; the orange chevron stays in the gallery.
- The reload timer and arcs no longer double the stock reticle indicators.
- Module repairs by the reticle are gone: the stock damage panel shows them.
- Fixed: the timer showed too much time when the battle started mid-reload.
- A reticle preset changed in battle is no longer lost and no longer resets other game settings.

## crosshair 0.4.0

### ru

- Новая установка один раз ставит пресет «Минимальный»; прежний прицел можно вернуть кнопкой «Вернуть как было».

### en

- A fresh install sets the Minimal preset once; «Restore my settings» brings the previous reticle back.

## crosshair 0.3.2

### ru

- Новый редактор прицелов: галерея меток, цвета образцами, размер и пресет рядом с живым превью; подсказки у настроек.

### en

- A new crosshair editor: a mark gallery, colour swatches, size and preset next to a live preview; hints on every setting.

## crosshair 0.3.1

### ru

- Предпросмотр в настройках рисует прицел с выбранной меткой в её размере.

### en

- The settings preview draws the reticle with the chosen mark at its size.

## crosshair 0.3.0

### ru

- Три новые центральные метки: зелёные дуги, рамка с засечками, уголки поправки.

### en

- Three new centre marks: green arcs, a box with ticks, stacked chevrons.

## crosshair 0.2.0

### ru

- Пять новых одноцветных центральных меток и выбор их цвета из шести.

### en

- Five new one-colour centre marks and a choice of six colours.

## core 0.9.7

### ru

- Панели боя снова в отдельном окне: встраивание в экран боя могло ронять игру.
- Стандартный таймер перезарядки у прицела прячется и тогда, когда игра создала прицел дважды.

### en

- Battle panels are back in their own window: building them into the battle screen could crash the game.
- The stock reticle reload timer is hidden even when the game created the reticle twice.

## core 0.9.6

### ru

- Панели боя и ангара встроены в интерфейс игры: больше нет отдельного окна поверх игры, фокус, чат и Alt+Tab не ломаются.
- Если панели не удалось встроить, остаётся стандартный интерфейс игры.
- У машин с автозарядкой барабана (Жандарм) стандартный таймер у прицела больше не дублирует наш.

### en

- The battle and hangar panels are built into the game interface: no separate window over the game any more, so focus, the chat and Alt+Tab keep working.
- When the panels cannot be built in, the stock game interface stays.
- On autoloading-clip vehicles (the Gendarme) the stock reticle countdown no longer doubles ours.

## core 0.9.5

### ru

- Панели рисуются только через OpenWG Gameface: запасной вывод через GUIFlash убран.
- Разовое включение на мини-карте ждёт, пока игра загрузит ваши настройки с сервера.
- На камере убийцы наши панели остаются на месте, и стандартный журнал боя больше не мелькает после гибели.
- Стандартная панель счёта больше не видна рядом с ХП команд в начале боя.

### en

- Panels are drawn through OpenWG Gameface only: the GUIFlash fallback is gone.
- The minimap's one-time switch waits until the game has loaded your settings from the server.
- On the killer camera our panels stay in place, so the stock battle log no longer flashes after death.
- The stock score strip no longer shows next to the team HP strip at the start of a battle.

## core 0.9.4

### ru

- Связь с сайтом только по проверенному HTTPS, а секрет привязки хранится зашифрованным для вашей учётной записи Windows.
- Панели HUD обновляются с меньшей нагрузкой на игру, в конце боя меньше подтормаживаний.
- Панели в ангаре снова перетаскиваются с зажатым Alt; испорченный реплей или упавшая панель больше ничего не ломают.

### en

- The site is reached only over verified HTTPS, and the binding secret is stored encrypted for your Windows account.
- HUD panels update with less load on the game, with fewer hitches at the end of a battle.
- Hangar panels drag with Alt held again; a broken replay or a failed panel no longer breaks anything.

## core 0.9.3

### ru

- Клик по ангару или по чату больше не теряется, чат снова печатается после клика; после Alt+Tab ангар сразу нажимается.
- Подсказка панели HUD не остаётся над прицелом.
- Раскладка «Только основные» больше не включает часы в бою.

### en

- A click on the hangar or the chat is no longer lost, and the chat takes keys after a click; after Alt+Tab the hangar takes clicks right away.
- A HUD panel tooltip no longer stays over the reticle.
- The «Essentials only» layout no longer includes the battle clock.

## core 0.9.2

### ru

- Окно HUD больше не забирает клавиатуру: после боя и закрытия окон ангар нажимается, а чат печатается.
- «Рекомендуемые настройки» сверяются с настройками самой игры.

### en

- The HUD window no longer takes the keyboard: after a battle or a closed window the hangar takes clicks and the chat takes keys.
- «Recommended settings» are checked against the game's own settings.

## core 0.9.1

### ru

- Файлы настроек заменяются за один шаг: сбой игры во время сохранения их больше не теряет.
- 12-часовые часы показывают AM/PM и на русской Windows.
- Сообщение об ошибке запуска в логе больше не ломается на русских ошибках Windows.

### en

- Settings files are replaced in one step: a game crash while saving no longer loses them.
- The 12-hour clock shows AM/PM on Russian Windows too.
- The start-up error message in the log no longer breaks on Russian Windows errors.

## core 0.9.0

### ru

- Для танков без порогов на сайте отметки считаются приблизительно и помечаются «≈».
- Стандартные элементы боя скрываются, только когда заменяющая панель действительно на экране.
- Панели рядом со стандартными элементами прячутся вместе с ними.

### en

- For tanks without site thresholds, MoE is estimated and marked «≈».
- Stock battle elements hide only when the replacing panel is actually on screen.
- Panels next to stock elements hide together with them.

## core 0.8.0

### ru

- В левой колонке ангара: карточка танка, «Сессия», «Опыт экипажа».
- Панели по умолчанию встают рядом с панелью снарядов и мини-картой.
- Компоненты могут скрывать части стандартного прицела, которые рисуют сами; настройки игры не меняются.
- Файл настроек, сохранённый в Блокноте, больше не считается пропавшим.
- Рекомендуемые настройки игры больше не применяются сами после установки, только по кнопке.

### en

- The hangar left column: the tank card, Session, Crew XP.
- Default panels sit beside the shells panel and the minimap.
- Components can hide the stock reticle parts they draw themselves; game settings are never changed.
- A settings file saved in Notepad no longer counts as missing.
- Recommended game settings are no longer applied automatically after install, only by the button.

## core 0.7.0

### ru

- Единый стиль HUD: одна плашка, пять размеров текста, общая палитра и подсказка.

### en

- One HUD style: one plate, five text sizes, a shared palette and tooltip.

## core 0.6.8

### ru

- V, камера после гибели и загрузка боя прячут панели, Tab приглушает их; ничего не прыгает.
- Панель, сохранённая за краем экрана, возвращается к краю.
- Отметки: изменение за бой считается точно, добавлены пороги знаков классности.

### en

- V, the death camera and battle loading hide the panels, Tab dims them; nothing jumps.
- A panel saved past the screen edge is brought back to it.
- Marks: the per-battle change is exact; mastery badge thresholds added.

## core 0.6.7

### ru

- Внутренние улучшения стабильности.

### en

- Internal stability improvements.

## core 0.6.6

### ru

- Ряд оборудования — единственная панель над стандартной панелью снарядов.

### en

- The equipment row is the only panel above the stock shells panel.

## core 0.6.5

### ru

- У панелей появились подсказки с описанием компонента.
- С Tab панели приглушаются, V прячет их без прыжков.
- Предпросмотр панели в настройках выглядит как в бою.

### en

- Panels get tooltips with the component description.
- Tab dims the panels, V hides them without jumps.
- The panel preview in settings looks as in battle.

## core 0.6.4

### ru

- Боевые панели больше не встают под счёт посередине сверху, где игра показывает захват баз и задачи.

### en

- Battle panels no longer start under the top score strip, where the game shows base capture and quests.

## core 0.6.3

### ru

- Панели с альтернативным видом разворачиваются, пока зажат Alt.

### en

- Panels with an alternate view expand while Alt is held.

## core 0.6.2

### ru

- В бою панели перетаскиваются с Ctrl, колесо меняет размер; в ангаре — с Alt.
- Мод забирает мышь только над панелью: миникарта, списки и чат работают как обычно.
- Места по умолчанию выверены для любого масштаба; несдвинутые панели переезжают на них.
- Окно настроек больше не прячет панели ангара, панели не прыгают.

### en

- In battle panels drag with Ctrl, the wheel resizes; the hangar uses Alt.
- The mod takes the mouse only over a panel: the minimap, lists and chat work as usual.
- Default places hold at any scale; unmoved panels move to them.
- The settings window no longer hides hangar panels, and panels no longer jump.

## core 0.6.1

### ru

- Боевые панели обновляются экономнее.

### en

- Battle panels update more efficiently.

## core 0.6.0

### ru

- Свой набор и места панелей для каждого типа боя; они сохраняются в профили.
- Стандартные элементы заменяются только в случайных боях и «Натиске».
- Правильные формы слов «очко», «день», «час», «жетон».

### en

- Each battle type gets its own panel set and places; they are saved in profiles.
- Stock elements are replaced only in random battles and Onslaught.
- Correct word forms for points, days, hours and tokens.

## core 0.5.0

### ru

- Подписи ангара и кнопка «///» видны только в обычном виде ангара.
- Панели одной колонки не перекрываются и переходят во вторую колонку.
- Формы слов по числу: «1 бой», «2 боя», «5 боёв».
- Перетащенная подпись ангара запоминает место и сбрасывается по «Сбросить расположение».

### en

- Hangar labels and the «///» button show only in the plain hangar view.
- Panels in a column never overlap and wrap into a second column.
- Word forms by number: «1 battle», «2 battles».
- A dragged hangar label remembers its place and resets with «Reset layout».

## core 0.4.0

### ru

- Панели боя рисуют значки, числа и полосы.
- Счёт, лог урона, лампа и таймер заменяются нашими панелями и возвращаются при выключении.
- Наши панели прячутся вместе со стандартным интерфейсом (V, Tab).

### en

- Battle panels draw icons, numbers and bars.
- The score strip, damage log, lamp and timer are replaced by our panels and return when switched off.
- Our panels hide with the stock interface (V, Tab).

## core 0.3.0

### ru

- Общее чтение вашего аккаунта с сайта для рейтингов, рекордов и эффективности.
- Звуки мода играют без дополнительных банков.
- Отсчёты времени больше не отстают; удержанная клавиша не срабатывает повторно.
- Панели можно временно убрать и вернуть — для режима стримера.

### en

- One shared read of your account from the site for ratings, records and efficiency.
- Mod sounds play without extra sound banks.
- Countdowns no longer lag; a held key does not fire again.
- Panels can be hidden and restored, for the streamer mode.

## core 0.2.0

### ru

- Общий расчёт отметок для боя и ангара.
- Исправлена работа с сайтом на клиенте 1.45.
- Настройки клиента записываются как в окне настроек игры.
- Действия в ангаре идут по одному и показывают ответ игры.

### en

- Shared MoE maths for battle and hangar.
- Fixed site requests on the 1.45 client.
- Client settings are written as the game's settings window does.
- Hangar actions run one at a time and show the game's answer.

## core 0.1.0

### ru

- Общая основа всех компонентов мода и боевого интерфейса с редактором расположения.
- Настройки дублируются в резервную копию и восстанавливаются при загрузке.

### en

- The shared base of all mod components and the battle HUD with a layout editor.
- Settings are mirrored to a backup copy and restored on load.

## companion 0.8.7

### ru

- При обновлении убирается старая настройка значка «Три отметки» «Если у игрока выбрана своя нашивка».
- После краша и переподключения сразу в бой мод узнаёт аккаунт из боя.
- Автосообщения в чат боя включены по умолчанию: арта по мне, урон от союзника, засвет.

### en

- On update the old Three Marks badge setting «When a player has a badge of their own» is removed.
- After a crash and a reconnect straight into battle the mod takes the account from the battle.
- Battle chat auto messages are on by default: artillery on me, ally damage, spotted.

## companion 0.8.6

### ru

- При обновлении убирается старая настройка «Рисовать панели прямо в ангаре».

### en

- On update the old «Draw the panels right in the hangar» setting is removed.

## companion 0.8.5

### ru

- При обновлении убираются старые настройки «Подробности по Alt» журнала боя.
- Окно ModsSettingsAPI больше не используется: все настройки — в окне «Три отметки».

### en

- On update the battle log's old «Details on Alt» settings are removed.
- The ModsSettingsAPI window is no longer used: every setting is in the Three Marks window.

## companion 0.8.4

### ru

- При обновлении: мини-карта показывает места и названия техники, ХП команд — полоска на каждый танк, уменьшенный круг сведения переходит в новый компонент с тем же размером.
- Новый переключатель «Показывать мой значок «Три отметки» другим игрокам» в «Данные и сайт», включён.
- Открытый секрет привязки переписывается в зашифрованный, привязка сохраняется; ошибки привязки и TLS описаны понятно.

### en

- On update: the minimap shows last-seen spots and vehicle names, team HP is a bar per tank, a reduced aim circle moves to the new component at the same size.
- A new «Show my Three Marks badge to other players» switch in «Data and site», on.
- A plain-text binding secret is rewritten encrypted and the binding stays; binding and TLS errors are explained clearly.

## companion 0.8.3

### ru

- Из старых настроек «Отметок в бою» убирается опция «Подробности по Alt».
- Настройки часов в бою и кнопки «///» под меню Esc удаляются из файлов настроек сами.

### en

- The «Details on Alt» option of «Marks in battle» is removed from older settings.
- The settings of the battle clock and of the «///» button under the Esc menu leave the settings files by themselves.

## companion 0.8.2

### ru

- Кратность зума у прицела включается в старых настройках, если её не меняли.

### en

- The crosshair zoom readout is turned on in older settings unless you changed it.

## companion 0.8.1

### ru

- «Отметки в бою» и «Карточка танка» включаются отдельно; прежние настройки переносятся сами.
- Код привязки принимается и со вставленным неразрывным пробелом.
- Сообщение об ошибке запуска в логе больше не ломается на русских ошибках Windows.

### en

- «Marks in battle» and the «Tank card» have separate switches; your settings move over.
- The binding code is accepted with a pasted no-break space too.
- The start-up error message in the log no longer breaks on Russian Windows errors.

## companion 0.8.0

### ru

- Мод отслеживает постановку в очередь на бой и выход из неё.
- Часы ангара и карточка «Опыта экипажа», которые вы не меняли, получают новые настройки по умолчанию.
- Убраны «Итоги в бою» и «Резервная копия настроек»; стандартный центр прицела вернулся, если шеврон не меняли.
- Один и тот же бой больше не засчитывается дважды.

### en

- The mod tracks joining and leaving the battle queue.
- The hangar clock and the crew XP card, if you never changed them, take the new defaults.
- «Results in battle» and «Settings backup» are gone; the stock reticle centre is back if you never changed the chevron.
- The same battle is no longer counted twice.

## companion 0.7.0

### ru

- Настройки объединённых компонентов переносятся автоматически; новые значения по умолчанию — только там, где вы ничего не меняли.
- Настроенные вами компоненты остаются включёнными, перед переносом сохраняется копия настроек.

### en

- Settings of merged components move over automatically; new defaults apply only where you changed nothing.
- Components you set up stay on, and a copy of your settings is kept before the move.

## companion 0.6.4

### ru

- Переключатели «Прицела и снарядов» (включён по умолчанию) и «Быстрого демонтажа» (выключен по умолчанию).
- Изменение отметки за бой считается точнее: процент запоминается при входе в бой.
- Мод теперь знает ваш знак классности на танке.

### en

- Switches for «Aim and shells» (on by default) and «Quick demount» (off by default).
- A battle's MoE change is more accurate: the percentage is remembered as the battle starts.
- The mod now knows your mastery badge on the tank.

## companion 0.6.3

### ru

- Настройка удалённой панели снаряжения больше не хранится.

### en

- The setting of the removed consumables bar is no longer kept.

## companion 0.6.2

### ru

- Повторная панель расходников выключена, ряд оборудования включён; если включить расходники снова, они останутся.
- Подсказки у меток ангара и кнопки настроек.

### en

- The duplicate consumables bar is off and the equipment row on; switch the consumables back on and they stay on.
- Tooltips on the hangar labels and the settings button.

## companion 0.6.1

### ru

- «Оборудование в бою» включено по умолчанию, панель снарядов и расходников выключена — стандартная показывает то же.

### en

- «Equipment in battle» is on by default and the consumables bar off — the stock panel shows the same.

## companion 0.6.0

### ru

- Новые компоненты: «Раскладка по типу боя» и «Натиск: дивизионы» включены, «Трекеры событий» выключены по умолчанию.

### en

- New components: «Layout per battle type» and «Onslaught divisions» are on, «Event trackers» is off by default.

## companion 0.5.0

### ru

- У новых игроков вторичные боевые панели выключены по умолчанию; уже сохранённые настройки не меняются.

### en

- For new players the secondary battle panels are off by default; settings you already saved do not change.

## companion 0.4.0

### ru

- Переключатели «Артометра» и «Очков взвода».

### en

- Switches for the artillery meter and the platoon points.

## companion 0.3.0

### ru

- Переключатели для множества новых боевых и ангарных компонентов.
- Отчёт о сессии в свой Telegram или Discord через сайт (выключен по умолчанию); профили и коды его не переносят.

### en

- Switches for many new battle and hangar components.
- The session report to your own Telegram or Discord through the site (off by default); profiles and codes never carry it.

## companion 0.2.0

### ru

- Переключатель вида отметки в ангаре.
- Итоги досрочно покинутого боя берутся только из сохранённого игрой; мод больше не мешает окну итогов.
- Пороги отметок считаются только по открытым данным: досье и итогам своих боёв.
- Из взвода отправляется только его размер, без данных других игроков.
- Поддержка модификаций танка в клиенте 1.45.

### en

- A switch for the hangar MoE view.
- Results of a battle left early come only from what the game saved; the mod no longer gets in the way of the results window.
- MoE thresholds come only from public data: the dossier and your own battle results.
- Only the platoon's size is sent, with no data about other players.
- Field modifications are supported in the 1.45 client.

## companion 0.1.0

### ru

- Привязка к triotmetki.ru одноразовым кодом с сайта; до неё ничего не собирается и не отправляется.
- После каждого своего боя на сайт уходят итоги, отметки, время в очереди, сборка танка и выстрелы.
- Отправку данных можно отключить для каждого компонента; обмен настройками для стримеров.

### en

- Binding to triotmetki.ru with a one-time code from the site; nothing is collected or sent before it.
- After each of your battles the results, MoE, queue time, loadout and shots go to the site.
- Data sending can be switched off per component; settings sharing for streamers.

## ui 0.9.6

### ru

- Настройка «Рисовать панели прямо в ангаре» убрана: панели всегда встроены в интерфейс игры.
- «Данные и сайт»: переключатель компонента справа от заголовка, как в «Реплеях».

### en

- The «Draw the panels right in the hangar» setting is gone: the panels are always built into the game interface.
- «Data and site»: the component switch sits right of the title, as on «Replays».

## ui 0.9.5

### ru

- Окно настроек открывается только из списка модов (ModsList): кнопка «///» в ангаре и Ctrl+Shift+T убраны.
- Расстановка панелей на экране завершается по Esc или по «Три отметки» в списке модов.

### en

- The settings window opens only from the mods list (ModsList): the «///» hangar button and Ctrl+Shift+T are gone.
- Placing the panels on the screen ends with Esc or «Three Marks» in the mods list.

## ui 0.9.4

### ru

- Тени текста и рамки панелей в бою снова видны, а одна сломанная панель HUD больше не гасит остальные.
- «Отметки в бою» снова перетаскиваются; страница компонента аккуратнее, таймер перезарядки у прицела крупнее.
- В «Данные и сайт» — переключатель своего значка «Три отметки»; коды профилей не переносят компоненты, которые сами делают запросы в клиенте.

### en

- Text shadows and panel outlines show in battle again, and one broken HUD panel no longer hides the rest.
- «Marks in battle» drags again; the component page is tidier, the reload timer by the reticle is bigger.
- A switch for your own Three Marks badge in «Data and site»; profile codes no longer carry components that make requests in the client.

## ui 0.9.3

### ru

- «Отметки в бою» встают вровень с низом расходников.
- Часов в бою и кнопки «///» под меню Esc больше нет в окне настроек и в редакторе HUD.
- Ctrl+Shift+T больше не открывает окно настроек в бою, только в ангаре.

### en

- «Marks in battle» lines up with the bottom of the consumables.
- The battle clock and the «///» button under the Esc menu are gone from the settings window and the HUD editor.
- Ctrl+Shift+T no longer opens the settings window in battle, only in the hangar.

## ui 0.9.2

### ru

- Секунды под лампой «Шестого чувства» стоят по её центру и не сдвигают её; кольцо таймера видно в игре.
- Разделы окна только «Бой», «Ангар» и «Реплеи»; реплеи занимают всё окно, строки списка ровные.
- «Просмотр попаданий» подстраивается под экран, список попаданий не сжимается.

### en

- The seconds under the «Sixth sense» lamp sit on its axis and no longer shift it; the timer ring shows in the game.
- The window's pages are just Battle, Hangar and Replays; replays fill the window, list rows are even.
- The «Hit viewer» fits the screen, the hit list is not squashed.

## ui 0.9.1

### ru

- Окно настроек: у каждого компонента своя страница, ровный список, стрелка «назад» и выпадающие списки.
- Окно помещается на экран, вкладок «Все/Ангар/Бой» нет, подсказка отмены скрывается сама; у реплеев две прокрутки.
- Новый макет экрана боя в редакторе HUD; лампа «Шестого чувства» стоит по центру.

### en

- The settings window: every component opens its own page, an aligned list, a back arrow and dropdowns.
- The window fits the screen, the «All/Hangar/Battle» tabs are gone, the undo toast hides itself; replays scroll in two panes.
- A new battle screen mock in the HUD editor; the «Sixth sense» lamp sits centred.

## ui 0.9.0

### ru

- Стандартный элемент скрывается, только когда наша панель действительно показана.
- Рамка перезарядки у прицела показывает состояние «заряжено» с полным временем перезарядки.

### en

- A stock element is hidden only when our panel is actually shown.
- The reload frame by the reticle shows a «loaded» state with the full reload time.

## ui 0.8.0

### ru

- Панели боя сразу встают на свои места при входе в бой, без нажатия Ctrl.
- Сбой одной панели или карточки больше не гасит весь HUD или окно настроек.
- Убрана кнопка «Вернуть мои настройки»; «Отправить настройки игры на сайт» осталась.
- Esc в поле ввода отменяет набранное; боковой поворот колёсика больше не уменьшает панель.
- Исправлены подсказки, прокрутка в «Просмотре попаданий» и советник пресетов.

### en

- Battle panels take their places as soon as the battle starts, no Ctrl press needed.
- One failing panel or card no longer blanks the whole HUD or settings window.
- The «Restore my settings» button is gone; «Send game settings to the site» stays.
- Esc in a field discards what was typed; a sideways wheel turn no longer shrinks a panel.
- Fixed tooltips, scrolling in «Hit viewer» and the preset advisor.

## ui 0.7.0

### ru

- Обновления значений по умолчанию не трогают то, что вы меняли сами.
- Карточки компонентов снова показывают все свои настройки.
- Общая подсказка HUD, рамки режима правки в фирменном оранжевом, текст панелей с тенью.

### en

- Default updates leave alone whatever you changed yourself.
- Component cards show all their settings again.
- A shared HUD tooltip, edit-mode frames in the brand orange, panel text with a shadow.

## ui 0.6.7

### ru

- Визуальные компоненты открываются в полноэкранном редакторе: живое превью с увеличением 1×/2× слева, настройки справа.
- Варианты выбираются из галереи миниатюр, цвета — кружками-образцами.
- Подсказки и кнопки сброса и перемещения — под превью; Esc или крестик закрывают редактор.

### en

- Visual components open in a full-window editor: a live preview with 1×/2× zoom on the left, settings on the right.
- Options are picked from a thumbnail gallery, colours from round swatches.
- Hints and the reset and move buttons sit under the preview; Esc or the cross closes the editor.

## ui 0.6.6

### ru

- Окно настроек открывается и в бою — кнопкой под меню Esc или Ctrl+Shift+T; после боя закрывается само.
- Перетаскивание панелей точнее: начинается после сдвига на 5 пикселей.
- Скрытая панель держит своё место, соседи не сдвигаются.

### en

- The settings window opens in battle too — from the button under the Esc menu or Ctrl+Shift+T; it closes after the battle.
- Dragging panels is more precise: it starts after a 5 px move.
- A hidden panel keeps its place, so its neighbours do not move.

## ui 0.6.5

### ru

- Окно настроек стало легче; панель при перетаскивании в редакторе HUD встаёт точно туда, где её отпустили.

### en

- The settings window is lighter; a panel dragged in the HUD editor lands exactly where you drop it.

## ui 0.6.4

### ru

- Окно настроек и HUD переведены на новый движок; внешний вид и поведение не меняются.

### en

- The settings window and the HUD moved to a new engine; the look and behaviour do not change.

## ui 0.6.3

### ru

- Панель снаряжения и снарядов убрана; ряд оборудования — иконки без подписей с подсказкой игры.

### en

- The consumables and shells bar is gone; the equipment row is icons with no labels and the game's tooltip.

## ui 0.6.2

### ru

- Колесо мыши прокручивает список реплеев и выпадающие списки.
- «ХП команд»: аккуратная плашка, числа внутри полос, все семь стилей выровнены.
- Подсказка с описанием при наведении на любой блок; превью в карточках по центру и в размер рамки.

### en

- The mouse wheel scrolls the replays list and drop-down lists.
- «Team HP»: a neat plate, numbers inside the bars, all seven styles lined up.
- A tooltip with a description over any block; previews in cards are centred and fitted to their frame.

## ui 0.6.1

### ru

- В таблице отчёта по отметкам снова видно цвет изменения процента.

### en

- The marks report table shows the colour of the percentage change again.

## ui 0.6.0

### ru

- С установленным ModsList «Три отметки» открываются из его кнопки в ангаре; менеджер ставит ModsList по желанию.
- Esc делает шаг назад и только в конце закрывает окно.
- Ангар за окном размыт, как у окон клиента; подсказки и звуки кнопок — клиентские.
- Ctrl+F — поиск, плавная прокрутка, окно помнит место на каждой странице.

### en

- With ModsList installed «Три отметки» opens from its hangar button; the manager installs ModsList as an option.
- Esc steps back and closes the window only at the end.
- The hangar behind the window is blurred like client windows; tooltips and button sounds are the client's.
- Ctrl+F for search, smooth scrolling, and the window remembers your place on each page.

## ui 0.5.2

### ru

- В бою для перемещения панелей достаточно Ctrl.
- Перетаскивание панелей курсором в бою, подсказки над значками оборудования, панели не прыгают.

### en

- In battle Ctrl is enough to move panels.
- Dragging panels with the battle cursor, tooltips over equipment icons, panels no longer jump.

## ui 0.5.1

### ru

- Окно настроек открывается по центру в сохранённом размере, снова перетаскивается и меняет размер.
- Колесо мыши прокручивает списки; Esc закрывает окно, не открывая меню игры.
- Значки, которых нет в шрифте игры, заменяются похожими, а не пропадают.

### en

- The settings window opens centred at its saved size and can be dragged and resized again.
- The mouse wheel scrolls the lists; Esc closes the window without opening the game menu.
- Glyphs the game font lacks are replaced with look-alikes instead of going blank.

## ui 0.5.0

### ru

- Окно настроек и ангар больше не подтормаживают при сотнях реплеев.
- HUD перерисовывает только изменившиеся панели.

### en

- The settings window and the hangar no longer stutter with hundreds of replays.
- The HUD redraws only the panels that changed.

## ui 0.4.0

### ru

- В «Редакторе HUD» — карточка «Раскладка по типу боя»: свой набор панелей для каждого типа боя.

### en

- The «HUD editor» has the «Layout per battle type» card: a panel set for each battle type.

## ui 0.3.0

### ru

- Новое окно настроек: разделы с иконками, карточки компонентов, фильтр «Все / Ангар / Бой» и поиск по настройкам.
- Изменения применяются сразу, «Отменить» возвращает до 20 последних; у каждой карточки «Сбросить к стандартным».
- Окно двигается, меняет размер и масштаб 80–150 % и запоминает их; блок привязки в «Данных и сайте».
- Кнопка «///» переехала в правый нижний ряд кнопок ангара; понятные названия у боевых панелей.
- Обновлён вид панелей: тёмные карточки, цветная полоска по категории, панели не перекрывают интерфейс игры.

### en

- A new settings window: sections with icons, component cards, an All / Hangar / Battle filter and search across settings.
- Changes apply at once, «Undo» takes back up to the last 20; every card has «Reset to defaults».
- The window moves, resizes, zooms 80–150 % and remembers it all; a binding block in «Data and site».
- The «///» button moved to the hangar's bottom-right button row; battle panels have clear names.
- New panel look: dark cards, a category-coloured stripe, and panels keep off the game's interface.

## ui 0.2.0

### ru

- Боевой интерфейс рисуется панелями с иконками, шрифтом игры и круговыми таймерами.
- Клики в бою проходят в игру.
- «Расчёт отметок» в «Истории отметок»: процент, шкала, динамика за 10 и 25 боёв, таблица боёв и график.

### en

- The battle HUD draws panels with icons, the game font and radial timers.
- Clicks in battle reach the game.
- «MoE calculator» in the marks history: the percent, a bar, the 10 and 25 battle trend, the battles table and a chart.

## ui 0.1.2

### ru

- Профили и коды не переносят отправку отчёта о сессии.

### en

- Profiles and codes do not carry the session report sharing.

## ui 0.1.1

### ru

- Ссылки открываются во встроенном браузере игры; кнопка в ангаре работает в клиенте 1.45.

### en

- Links open in the game's own browser; the hangar button works in the 1.45 client.

## ui 0.1.0

### ru

- Окно настроек: карточка для каждого компонента, профили (сохранение, загрузка, обмен кодом) и экранный редактор HUD.
- Открывается кнопкой «///» в ангаре, из ModsList или по Ctrl+Shift+T.

### en

- The settings window: a card per component, profiles (save, load, share as a code) and the on-screen HUD editor.
- Opens from the «///» hangar button, ModsList or Ctrl+Shift+T.

## marks_panel 0.8.4

### ru

- Панель отметки работает и после краша, когда игра переподключает сразу в бой: данные танка берутся из истории.

### en

- The marks panel works after a crash too, when the game reconnects straight into battle: the tank's values come from the history.

## marks_panel 0.8.3

### ru

- «Карточка танка» переделана: класс, уровень и отметки на стволе, крупный процент, тренд и шкала 65/85/95/100 %.
- Под шкалой — урон за бой и боёв до следующей отметки; «Подробный» вид и Alt добавляют сетку в две колонки.
- История отметки в окне мода — отдельный раздел; имена техники больше не могут менять разметку панели.

### en

- The «Tank card» is redesigned: class, tier and gun marks, a large percentage, the trend and a 65/85/95/100 % scale.
- Under the scale: damage per battle and battles to the next mark; the «Detailed» view and Alt add a two-column grid.
- The mark history in the mod window is its own section; vehicle names can no longer change the panel markup.

## marks_panel 0.8.2

### ru

- «Отметки в бою» больше не раздвигаются по Alt: панель всегда такого размера, как её поставили.
- Панель стоит вровень с низом расходников и в редакторе HUD опускается до самого края экрана.

### en

- «Marks in battle» no longer grows on Alt: the panel is always the size you placed.
- The panel sits level with the bottom of the consumables and drags down to the screen edge in the HUD editor.

## marks_panel 0.8.1

### ru

- Разделены на «Отметки в бою» и «Карточку танка» со своими переключателями и страницами; настройки переносятся сами.
- Панель в бою без силуэта и боёв до отметки: они остались на «Карточке танка».
- Сообщение об ошибке запуска в логе больше не ломается на русских ошибках Windows.

### en

- Split into «Marks in battle» and the «Tank card», each with its own switch and page; settings move over.
- The battle panel drops the silhouette and battles to the mark: they stay on the «Tank card».
- The start-up error message in the log no longer breaks on Russian Windows errors.

## marks_panel 0.8.0

### ru

- Панель отметки в бою переделана по образцу ПРОТанки и Lebwa: процент с изменением за бой и полоса урона до цели с риской вашего среднего.
- По Alt — пороги 65/85/95 %, среднее до и после боя и боёв до отметки. Новая настройка «Полоса»: «Урон за бой» или «Процент отметки».
- Цифры и полоса плавно анимируются, а при переходе отметки или достижении цели процент вспыхивает золотым.
- Без порогов танка на сайте панель всё равно считает прогноз по типичной кривой; такие значения помечены «≈».
- Карточка танка: силуэт не пропадает при перетаскивании, полоска последних боёв появляется с трёх боёв.
- После гибели панель отходит правее подсказки «Режим наблюдателя / Выйти в ангар» и больше не наезжает на неё.

### en

- The battle marks panel is rebuilt after PROTanki and Lebwa: the percent with its battle change and a damage bar to the goal with your average marked.
- On Alt: the 65/85/95% thresholds, the average before and after the battle and battles to the mark. A new «Bar» option: «Battle damage» or «MoE percent».
- Numbers and the bar animate smoothly, and the percent flashes gold when a mark is passed or the goal is reached.
- Without the tank's thresholds on the site the panel still projects from a typical curve; such figures are marked «≈».
- Tank card: the silhouette no longer vanishes while dragging, and the last battles strip appears from three battles.
- After your tank is destroyed the panel moves right of the «Spectator mode / Exit to hangar» tips instead of covering them.

## marks_panel 0.7.0

### ru

- Новая настройка «Процент отметки в карусели» (выключена): процент под танками карусели, как в XVM и PMOD.
- Панель отметки в бою теперь внизу справа от панели снарядов и расходников, как у Lebwa и ПРОТанки.
- Карточка танка без процента в досье больше не показывает «0.00%» и уже пройденную отметку 65 %.
- Изменение отметки за бой больше не показывается как 0, если игра обновила досье раньше итогов.
- История отметок записывает только случайные бои, без ложных точек на графике.

### en

- A new «MoE percent on the carousel» option (off): the percent under the carousel tanks, as in XVM and PMOD.
- The battle marks panel now sits at the bottom right of the shells and consumables panel, as in Lebwa and PROTanki.
- A tank card with no MoE percent in the dossier no longer shows «0.00%» and the already passed 65% mark.
- The battle's MoE change no longer shows as 0 when the game refreshed the dossier before the results.
- The marks history records random battles only, with no false points on the chart.

## marks_panel 0.6.0

### ru

- «Отметки» объединяют отметку в бою, отметки в ангаре и историю отметок. В бою — одна строка, по Alt — пороги, среднее и боёв до отметки.
- В ангаре — карточка танка с процентом, трендом, уроном до отметок, прогнозом боёв и WN8 по Alt. История сохранена.

### en

- «Marks of Excellence» merges the battle panel, the hangar marks and the marks history. In battle it is one line; Alt adds thresholds, average and battles to the mark.
- In the hangar a tank card shows the percent, trend, damage to the marks, battles forecast and WN8 on Alt. History is kept.

## marks_panel 0.5.0

### ru

- Карточка танка показывает порог 100 % рядом с 65/85/95 %, если он есть на сайте.
- По Alt — опыт на знаки классности и до элиты и следующих танков с числом боёв. Переключатели «Опыт на знаки классности» и «Опыт до элиты и до следующих танков».

### en

- The tank card shows the 100% threshold next to 65/85/95% when the site has it.
- On Alt: XP for the mastery badges and to elite and the next tanks, with the battles it takes. Switches «XP for the mastery badges» and «XP to elite and to the next tanks».

## marks_panel 0.4.0

### ru

- Урон для +1 %: сколько ещё нанести в бою, чтобы процент дорос до следующего целого.
- Отметка «проверено» или «оценка»: оценка помечена `~`, когда процента нет в досье и он посчитан по порогам сайта.
- Подробности по Alt (выключено): короткая строка, а с зажатым Alt — все данные.

### en

- Damage for +1%: how much more to deal this battle for the percent to reach the next whole number.
- A «verified» or «estimated» badge: an estimate is marked `~` when the dossier has no percent and it comes from site thresholds.
- Details on Alt (off): one short line, and everything while Alt is held.

## marks_panel 0.3.2

### ru

- Новое место по умолчанию — справа от левого списка команд; больше не наезжает на списки, чат и миникарту.

### en

- New default place right of the left team list; it no longer covers the team lists, chat or minimap.

## marks_panel 0.3.1

### ru

- Правильные формы слова «бой» в прогнозе.
- Позиция по умолчанию — слева вверху, правее списка команды.

### en

- Correct Russian word forms in the forecast.
- Default position: top left, right of the team list.

## marks_panel 0.3.0

### ru

- Значок отметки, крупный процент, изменение со стрелкой, пороги 65/85/95 и прогноз боёв в одной плашке.

### en

- The marks icon, a big percent, the change with an arrow, the 65/85/95 thresholds and the battles forecast in one plate.

## marks_panel 0.2.0

### ru

- Панель отметки перетаскивается в редакторе HUD и настраивается в окне мода.
- Процент и прогноз, изменение, урон до 65/85/95/100 %, урон на +0,1/0,5/1 %, среднее и прогноз боёв до отметки.
- Виды «Подробный», «Компактный», «Минимальный» и свой шаблон; цвет по изменению, по отметке или без цвета.
- Засвет и урон по гусеницам после гибели теперь учитываются.

### en

- The MoE panel is movable in the HUD editor and configured in the mod window.
- Percent and projection, change, damage to 65/85/95/100%, damage for +0.1/0.5/1%, average and battles forecast to the mark.
- Styles «Extended», «Compact», «Minimal» and your own template; colour by change, by mark or none.
- Spotting and tracking assist after your tank is destroyed now counts.

## marks_panel 0.1.0

### ru

- В бою: текущий процент отметки, прогноз после боя и урон до следующей отметки.

### en

- In battle: the current MoE percent, the projection after the battle and the damage needed for the next mark.

## session_stats 0.7.2

### ru

- Внутренняя доработка: компонент работает как раньше.

### en

- Internal cleanup: the component works as before.

## session_stats 0.7.1

### ru

- Сообщение об ошибке запуска в логе больше не ломается на русских ошибках Windows.

### en

- The start-up error message in the log no longer breaks on Russian Windows errors.

## session_stats 0.7.0

### ru

- Карточка «Сессия» переехала в левую колонку ангара и больше не закрывает характеристики машины.
- Новая настройка «Сессия в сообщении после боя» (выключена): итоги сессии в сообщении о бое, как в PMOD.
- Сброс сессии и новое время простоя работают точнее, без перезапуска клиента.
- Сессия хранится отдельно для каждого аккаунта.

### en

- The Session card moved to the hangar's left column and no longer covers the vehicle parameters.
- A new «Session in the post-battle message» option (off): session totals in the battle message, as in PMOD.
- Session reset and a new idle time work more precisely, with no client restart.
- The session is kept separately per account.

## session_stats 0.6.0

### ru

- Карточка «Сессия» объединяет цели с сайта и строку аккаунта (WN8, процент побед, средний урон).
- Компоненты «Цели с сайта», «Мои рейтинги в ангаре», «Антитилт» и «Помощник взвода» удалены.

### en

- The Session card takes in the site goals and the account line (WN8, win rate, average damage).
- The «Goals from the site», «My ratings in the hangar», «Tilt guard» and «Platoon helper» components are removed.

## session_stats 0.5.0

### ru

- Строки «Отметка»: точное изменение процента отметки за сессию для каждого танка (до трёх). Переключатель «Изменение отметки по танкам сессии».

### en

- «MoE» rows: the exact MoE percent change over the session for each tank (up to three). Switch «MoE change per tank of the session».

## session_stats 0.4.0

### ru

- Кнопка «Новая сессия»: счётчики обнуляются по вашему запросу.
- Полоска последних 10 боёв сессии: победа, поражение, ничья цветом.
- «Ждут итогов: N» — сколько боёв ещё ждут результатов.

### en

- A «New session» button: the counters reset on your request.
- A strip of the session's last 10 battles: win, loss and draw in colour.
- «Awaiting results: N»: how many battles still wait for their results.

## session_stats 0.3.0

### ru

- Сессия в ангаре — карточка: бои, процент побед цветом, средний урон, WN8, победы и поражения.
- Подпись видна только в самом ангаре и запоминает место после перетаскивания.

### en

- The session in the hangar is a card: battles, win rate in colour, average damage, WN8, wins and losses.
- The label shows only in the hangar itself and keeps its place after dragging.

## session_stats 0.2.0

### ru

- Отчёт о сессии в свой Telegram или Discord через сайт (выключен по умолчанию), кнопка «Отправить отчёт о сессии».

### en

- The session report to your own Telegram or Discord through the site (off by default), with a «Send the session report» button.

## session_stats 0.1.0

### ru

- В ангаре: бои, процент побед, средний урон и WN8 текущей сессии; новая сессия начинается после простоя.

### en

- In the hangar: battles, win rate, average damage and WN8 of the current session; a new session starts after idle time.

## replay_upload 0.2.2

### ru

- Слишком большой ответ сервера на загрузку реплея отбрасывается.

### en

- An oversized server answer to a replay upload is dropped.

## replay_upload 0.2.1

### ru

- Сообщение об ошибке запуска в логе больше не ломается на русских ошибках Windows.

### en

- The start-up error message in the log no longer breaks on Russian Windows errors.

## replay_upload 0.2.0

### ru

- Реплей можно загрузить вручную из менеджера реплеев, в том числе ранее не отправленный.
- Реплеи находятся надёжнее.

### en

- A replay can be uploaded by hand from the replay manager, including one that failed before.
- Replays are found more reliably.

## replay_upload 0.1.1

### ru

- Загрузка встаёт на паузу в бою и продолжается в ангаре.
- Переименованный реплей больше не теряется.

### en

- The upload pauses in battle and resumes in the hangar.
- A renamed replay is no longer lost.

## replay_upload 0.1.0

### ru

- По желанию (выключено): загружает реплеи ваших боёв, записанные игрой; реплеи закрыты, пока вы их не опубликуете. Файлы больше 50 МиБ не принимаются.

### en

- Opt-in (off): uploads the replays the game recorded of your battles; they stay private until you publish them. Files above 50 MiB are refused.

## damage_log 0.5.5

### ru

- Итоги урона, помощи, блока и полученного урона видны с начала боя, с нулями.

### en

- The dealt, assist, blocked and received totals show from the start of the battle, at zero.

## damage_log 0.5.4

### ru

- Журнал боя не меняется, пока зажат Alt: пояснения в строках включаются настройкой «Пояснения в строках».
- Виды «Только итоги» показывают только итоги.

### en

- The battle log no longer changes while Alt is held: the «Notes in the rows» setting turns the notes on.
- The «Totals only» looks show only the totals.

## damage_log 0.5.3

### ru

- «Журнал боя» в новом виде: подложка, итоги плашками, ровные столбцы, снаряды по цветам, полоска ХП цели и криты.
- Имена техники и подписи больше не могут менять разметку панели; ваш собственный шаблон работает как раньше.

### en

- «Battle log» redesigned: a plate, totals as chips, aligned columns, colour-coded shells, the target's HP bar and crits.
- Vehicle names and labels can no longer change the panel markup; your own template works as before.

## damage_log 0.5.2

### ru

- Сообщение об ошибке запуска в логе больше не ломается на русских ошибках Windows.

### en

- The start-up error message in the log no longer breaks on Russian Windows errors.

## damage_log 0.5.1

### ru

- Рикошеты союзников и попадания по танку, за которым следит камера после гибели, больше не зависают в журнале.

### en

- Ally ricochets and hits on the tank the camera follows after your death no longer get stuck in the log.

## damage_log 0.5.0

### ru

- «Журнал боя» заменяет лог урона, хит-лог и «Попадания по вам»: итоги, нанесённый и полученный урон в одном окне.
- Снаряд — плашка ББ/БП/КС/ОФ, премиум золотом. По Alt журнал шире: исход, криты и остаток прочности.
- Панель «Последнее попадание» удалена — это верхняя строка полученного урона.
- Новые настройки разделов, числа строк, прочности цели, выстрелов без урона и помощи.

### en

- The «Battle log» replaces the damage log, hit log and «Hits on you»: totals, dealt and received damage in one window.
- The shell is an AP/APCR/HEAT/HE chip, premium in gold. On Alt the log widens: outcome, crits and HP left.
- The «Last hit» panel is removed: it is the top row of received damage.
- New settings for sections, row counts, target HP, shots without damage and assist.

## damage_log 0.4.0

### ru

- «Подробности по Alt» (выключено): короткие строки лога, а с зажатым Alt — полные.
- Свой шаблон строки для Alt.

### en

- «Details on Alt» (off): short log lines, full ones while Alt is held.
- A custom line template for Alt.

## damage_log 0.3.2

### ru

- «Последнее попадание» стоит над логом урона, а не у прицела.
- Новое место по умолчанию больше не наезжает на списки команд, чат и миникарту.

### en

- «Last hit» sits above the damage log, not by the reticle.
- The new default place no longer covers the team lists, chat or minimap.

## damage_log 0.3.1

### ru

- Последнее попадание по умолчанию под прицелом и больше не перекрывает лампу.
- Итоги компактнее и не заходят на панель расходников при масштабе 125 %.

### en

- The last hit sits under the reticle by default and no longer covers the lamp.
- The totals are more compact and stay clear of the consumables bar at 125% scale.

## damage_log 0.3.0

### ru

- Итоги иконками и числами, строки с иконками снаряда, класса и источника урона.
- Заменяет стандартный лог урона на его месте (стандартный можно оставить).

### en

- Totals as icons and numbers, rows with shell, class and damage source icons.
- Replaces the stock damage log in its place (the stock one can be kept).

## damage_log 0.2.0

### ru

- Источник полученного урона: пожар, таран, падение, боеукладка; значок класса противника.
- Строки лога окрашены по виду урона.
- «Последнее попадание» — отдельная перетаскиваемая панель.

### en

- The source of received damage: fire, ram, fall, ammo rack; the enemy class icon.
- Log lines are coloured by damage kind.
- «Last hit» is a separate movable panel.

## damage_log 0.1.0

### ru

- В бою: нанесённый, заблокированный, ассистированный и полученный урон и последние записи; несколько стилей и палитр.
- Ассист после гибели тоже учитывается.

### en

- In battle: damage dealt, blocked, assisted and received with the latest entries; several styles and palettes.
- Assist after your death still counts.

## team_hp 0.6.4

### ru

- Полоска ХП команд сразу встаёт на место стандартной панели счёта, а не рядом с ней.

### en

- The team HP strip takes the stock score strip's place right away instead of sitting beside it.

## team_hp 0.6.3

### ru

- По умолчанию ХП команд показывается полоской на каждый танк; если вы не меняли вид, он переключится сам.
- Имена техники и подписи больше не могут менять разметку панели; ваш собственный шаблон работает как раньше.

### en

- Team HP now defaults to a bar per tank; an unchanged style switches by itself.
- Vehicle names and labels can no longer change the panel markup; your own template works as before.

## team_hp 0.6.2

### ru

- Сообщение об ошибке запуска в логе больше не ломается на русских ошибках Windows.

### en

- The start-up error message in the log no longer breaks on Russian Windows errors.

## team_hp 0.6.1

### ru

- Закреплённая полоса больше не встаёт поверх стандартной панели счёта.

### en

- A pinned strip no longer sits over the stock score strip.

## team_hp 0.6.0

### ru

- Новый вид: полупрозрачная полоса, полосы от центра, крупный счёт с разницей под ним; свой цвет в настройках главнее.

### en

- New look: a faded strip, bars from the centre, a large score with the difference under it; your own colour still wins.

## team_hp 0.5.1

### ru

- «Только числа» стоят справа от панели счёта и больше не закрывают захват баз и боевые задачи.

### en

- «Numbers only» sits right of the score strip and no longer covers base capture and quest progress.

## team_hp 0.5.0

### ru

- ХП команд совпадают со стандартной панелью счёта.
- Новая настройка «Живые вместо фрагов» (выключена): сколько машин каждой команды живо.
- Стили по танкам следуют настройкам игры для панели счёта.

### en

- Team HP match the stock score strip.
- A new «Alive instead of frags» setting (off): how many vehicles of each team are alive.
- The per-tank styles follow the game's score strip options.

## team_hp 0.4.0

### ru

- Полоса стоит на месте стандартной панели счёта и закреплена; закрепление снимается в настройках.

### en

- The strip sits in the stock score strip's place and is pinned; unpin it in the settings.

## team_hp 0.3.0

### ru

- Пять стилей как в популярных сборках: две полосы и счёт, сегменты по танкам, иконки классов, компактные числа, минимум.
- Заменяет стандартную панель счёта.

### en

- Five styles like the popular packs: two bars and the score, a segment per tank, class icons, compact numbers, minimal.
- Replaces the stock score strip.

## team_hp 0.2.0

### ru

- Стиль «Полоска на каждый танк»: ХП каждой машины обеих команд и счёт между ними.

### en

- The «A bar per tank» style: HP of every vehicle of both teams with the score between them.

## team_hp 0.1.0

### ru

- В бою: ХП команд полосами и/или числами, счёт фрагов и разница ХП.

### en

- In battle: team HP as bars and/or numbers, the frag score and the HP difference.

## sixth_sense 0.5.3

### ru

- Лампа горит, пока вас видят: после отсчёта она остаётся без таймера, как стандартная.

### en

- The lamp stays lit while you are spotted: after the countdown it stays on without the timer, as the stock one does.

## sixth_sense 0.5.2

### ru

- Внутренняя доработка: компонент работает как раньше.

### en

- Internal cleanup: the component works as before.

## sixth_sense 0.5.1

### ru

- Сообщение об ошибке запуска в логе больше не ломается на русских ошибках Windows.

### en

- The start-up error message in the log no longer breaks on Russian Windows errors.

## sixth_sense 0.5.0

### ru

- Стандартная лампа скрывается, только пока работает наша; если наша не запустилась, стандартная остаётся.
- Секунды отсчитывают засвет вниз от 10 с (8,5 или 8 с с «Улучшенным радиооборудованием»), на нуле лампа гаснет.
- Красная дуга таймера больше не съезжает с кольца: она идёт по кольцу по часовой стрелке, секунды стоят ровно под ним.

### en

- The stock lamp is hidden only while ours runs; if ours did not start, the stock lamp stays.
- The seconds count the spot time down from 10 s (8.5 or 8 s with Improved Radio Equipment); the lamp goes out at zero.
- The timer's red arc no longer slides off the ring: it runs clockwise along the ring, the seconds sit centred right under it.

## sixth_sense 0.4.1

### ru

- Если танк уже засвечен при запуске панели, лампа загорается сразу, а не ждёт следующего засвета.

### en

- When the tank is already spotted as the panel starts, the lamp lights at once instead of waiting for the next spotting.

## sixth_sense 0.4.0

### ru

- Кольцо крупнее, с тёмной подложкой; лампа больше, секунды крупнее и в цвете нанесённого урона.

### en

- A larger ring on a dark track, a bigger lamp, larger seconds in the dealt-damage colour.

## sixth_sense 0.3.0

### ru

- Круговой таймер видимости с учётом оборудования: 10 с, 8,5 с с «Улучшенным радиооборудованием», 8 с в слоте специализации.
- Необязательное тиканье каждую секунду отсчёта (по умолчанию выключено).
- Лампа гаснет в конце боя, при смене машины, возрождении и уничтожении вашей машины.

### en

- A radial visibility timer that accounts for equipment: 10 s, 8.5 s with Improved Radio Equipment, 8 s in its specialisation slot.
- An optional tick every second of the countdown (off by default).
- The lamp goes out at battle end, on vehicle switch, respawn and when your vehicle is destroyed.

## sixth_sense 0.2.1

### ru

- Панель на месте по умолчанию переехала: она больше не наезжает на списки команд, чат и миникарту.

### en

- A panel at its default place moves to a new one that no longer covers the team lists, the chat or the minimap.

## sixth_sense 0.2.0

### ru

- Лампа с круговым таймером и пульсом на месте стандартной, заменяет её.

### en

- A lamp with a radial timer and a pulse at the stock lamp's spot, replacing it.

## sixth_sense 0.1.0

### ru

- В бою: текст или значок с секундами с момента, как загорелась лампа шестого чувства, и звук по желанию.
- Четыре своих значка (лампа, глаз, «!», «///») с пульсацией и свой сигнал засвета.

### en

- In battle: a text or icon with the seconds since the sixth-sense lamp lit, and an optional sound.
- Four icons of our own (lamp, eye, «!», «///») with a pulse, and our own detection chime.

## battle_results 0.3.3

### ru

- Меньше подтормаживаний в конце боя: попадания по вам записываются в ангаре.
- Пример в окне настроек показан на языке игры.

### en

- Fewer hitches at the end of a battle: the hits on you are written in the hangar.
- The sample in the settings window is shown in the game's language.

## battle_results 0.3.2

### ru

- Сообщение об ошибке запуска в логе больше не ломается на русских ошибках Windows.

### en

- The start-up error message in the log no longer breaks on Russian Windows errors.

## battle_results 0.3.1

### ru

- Итоги прошлого боя следуют за мини-картой при смене её размера, а если она скрыта — уходят в правый нижний угол.

### en

- The previous battle's card follows the minimap when you resize it, and drops to the bottom right when the minimap is hidden.

## battle_results 0.3.0

### ru

- После боя одно сообщение, а не два: строки «Трёх отметок» дописываются в стандартное сообщение о результатах боя.
- Карточка итогов текущего боя убрана; итоги прошлого боя появляются над мини-картой и гаснут через 8 секунд.
- Карточка над мини-картой показывается, только если игра не показывает эти итоги сама.
- Изменение отметки считается только для случайных боёв; меньший «Размер истории» укорачивает список сразу.
- История итогов боёв хранится отдельно для каждого аккаунта.

### en

- One message after a battle, not two: the Three Marks lines are added to the stock battle results message.
- The current battle's card is gone; the previous battle's results show above the minimap and fade after 8 seconds.
- The card above the minimap shows only when the game does not show those results itself.
- MoE changes count for random battles only; a smaller «History size» trims the list right away.
- The battle results history is kept per account.

## battle_results 0.2.0

### ru

- «Итоги боёв» забрали «Боевые раны»: у боя в списке — схема и список попаданий по вам; история попаданий сохранена.

### en

- Battle results take over Battle wounds: a battle in the list shows the schematic and the hits on you; recorded hits are kept.

## battle_results 0.1.1

### ru

- Изменение отметки в уведомлении после боя точное: раньше иногда показывался 0.

### en

- The MoE change in the post-battle notification is exact: it sometimes showed 0 before.

## battle_results 0.1.0

### ru

- Уведомление после каждого боя с результатом, опытом, кредитами, статистикой и изменением отметки; бои сессии в окне мода.

### en

- A notification after each battle with result, XP, credits, stats and the MoE change; the session's battles in the mod window.

## auto_messages 0.1.0

### ru

- Новый компонент: автосообщения союзникам в чат боя — арта по вам, урон от союзника, засвет; по желанию пожар, гусеница, боеукладка, фраг, «удачи» и «gg». Свои тексты, не чаще раза в 10 с, не в реплеях.

### en

- New component: automatic battle chat lines to your allies — artillery on you, ally damage, being spotted; optionally fire, tracks, ammo rack, a kill, «good luck» and «gg». Your own texts, at most once in 10 s, never in replays.

## chat_filter 0.1.3

### ru

- Внутренняя доработка: компонент работает как раньше.

### en

- Internal cleanup: the component works as before.

## chat_filter 0.1.2

### ru

- Сообщение об ошибке запуска в логе больше не ломается на русских ошибках Windows.

### en

- The start-up error message in the log no longer breaks on Russian Windows errors.

## chat_filter 0.1.1

### ru

- Быстрые команды без строки в чате больше не считаются в лимит отправителя и в число скрытых.
- Включение фильтра посреди боя действует сразу; системные сообщения больше никогда не скрываются.

### en

- Quick commands without a chat line no longer count against the sender's limit or as hidden lines.
- Toggling the filter mid-battle takes effect at once; system messages are never hidden any more.

## chat_filter 0.1.0

### ru

- В бою: время у сообщений и скрытие повторов, флуда, спама быстрыми командами и запрещённых слов. Свои сообщения не скрываются.

### en

- In battle: chat time stamps and hiding of repeats, flood, quick-command spam and blocked words. Your own lines are never hidden.

## replay_manager 0.3.6

### ru

- Список реплеев заполняется плавно, без рывка раз в секунду.

### en

- The replay list fills smoothly, without a hitch every second.

## replay_manager 0.3.5

### ru

- Сообщение об ошибке запуска в логе больше не ломается на русских ошибках Windows.

### en

- The start-up error message in the log no longer breaks on Russian Windows errors.

## replay_manager 0.3.4

### ru

- Переименование, меняющее только регистр букв, больше не отказывает с «файл уже существует».
- «Смотреть» запускает реплеи с кириллицей в имени или пути; неподходящий путь отклоняется с понятной причиной.

### en

- A rename that only changes letter case no longer fails with «the file exists».
- «Watch» plays replays with Cyrillic in the name or path; an unusable path is refused with a clear reason.

## replay_manager 0.3.3

### ru

- Внутренние улучшения стабильности.

### en

- Internal stability improvements.

## replay_manager 0.3.2

### ru

- Список реплеев обновляется быстрее и без перерисовки всего окна.

### en

- The replay list refreshes faster and without redrawing the whole window.

## replay_manager 0.3.1

### ru

- Закрытие игры во время реплея, запущенного из ангара, снова закрывает клиент, а не перезапускает его.
- Автоматическое имя реплея даётся и при закрытом окне настроек.

### en

- Closing the game during a replay started from the hangar quits the client again instead of restarting it.
- Automatic replay names are given with the settings window closed too.

## replay_manager 0.3.0

### ru

- Отдельный экран «Реплеи»: все ваши реплеи с картой, техникой, итогом, уроном, опытом и знаком классности.
- Поиск, фильтры, сортировка и сводка по выборке (бои, процент побед, средний урон и опыт).
- «Смотреть» запускает реплей прямо из ангара; реплеи другой версии клиента помечены и не запускаются.
- «Загрузить на сайт», избранное, переименование, удаление и открытие папки.
- Экран открывается сразу и не замедляет ангар даже на тысяче файлов.

### en

- A separate Replays screen: all your replays with map, vehicle, result, damage, XP and mastery badge.
- Search, filters, sorting and a summary of the selection (battles, win rate, average damage and XP).
- «Watch» starts a replay right from the hangar; replays of another client version are marked and cannot start.
- Upload to the site, favourites, rename, delete and open the folder.
- The screen opens at once and does not slow the hangar even with a thousand files.

## replay_manager 0.2.0

### ru

- Поиск, фильтры по итогу и времени, сортировка по дате, урону и размеру; итог и урон в строке реплея.
- Уведомление в ангаре, когда сайт закончил разбор загруженного реплея.

### en

- Search, filters by result and period, sorting by date, damage and size; result and damage on each replay row.
- A hangar notice when the site has finished analysing an uploaded replay.

## replay_manager 0.1.0

### ru

- В ангаре: ваши реплеи с картой, техникой, датой и размером; переименование, удаление, ссылка на сайт, автоимена.

### en

- In the hangar: your replays with map, vehicle, date and size; rename, delete, a link to the site, auto names.

## hangar_tweaks 0.3.3

### ru

- Внутренняя доработка: компонент работает как раньше.

### en

- Internal cleanup: the component works as before.

## hangar_tweaks 0.3.2

### ru

- Сообщение об ошибке запуска в логе больше не ломается на русских ошибках Windows.

### en

- The start-up error message in the log no longer breaks on Russian Windows errors.

## hangar_tweaks 0.3.1

### ru

- Масштаб из настроек возвращается и при выключении всего компонента.

### en

- The game's own scale also returns when the whole component is switched off.

## hangar_tweaks 0.3.0

### ru

- Точный масштаб интерфейса от 50 до 300 % в ангаре; при выключении возвращается масштаб из настроек.

### en

- An exact interface scale from 50 to 300 % in the hangar; switched off, the game's own scale returns.

## hangar_tweaks 0.2.0

### ru

- Быстрое снятие стиля с выбранного танка (с подтверждением) и масштаб интерфейса из настроек игры.

### en

- Quick style removal from the selected tank (confirmed) and the interface scale from the game settings.

## hangar_tweaks 0.1.1

### ru

- Снятие оборудования стало надёжнее, ответы игры показываются как у кнопок ангара.

### en

- Equipment demounting is more reliable, and the game's answers show as for the hangar's buttons.

## hangar_tweaks 0.1.0

### ru

- Настройки карусели и быстрые действия: снять оборудование, экипаж в казарму, вернуть прежний экипаж.

### en

- Carousel options and quick actions: demount equipment, crew to the barracks, return the previous crew.

## minimap 0.2.5

### ru

- Названия техники и последние места снова включаются там, где первое включение не сработало.

### en

- Vehicle names and last-seen spots are switched on again where the first switch misfired.

## minimap 0.2.4

### ru

- Мини-карта снова показывает названия техники и места, где её видели последний раз: если в игре стояло «Никогда», мод один раз включает «Постоянно».

### en

- The minimap shows vehicle names and last-seen spots again: if the game was set to «Never», the mod switches it to «Always» once.

## minimap 0.2.3

### ru

- Опция называется «Последние места и названия техники»; если в игре стоит «Никогда», предлагаются «Рекомендуемые настройки».

### en

- The option is called «Last-seen spots and vehicle names»; when the game has «Never», «Recommended settings» is offered.

## minimap 0.2.2

### ru

- Мини-карта снова показывает технику и места, где её потеряли из виду: «Никогда» убрано, по умолчанию «Постоянно».
- Сообщение об ошибке запуска в логе больше не ломается на русских ошибках Windows.

### en

- The minimap shows vehicles and their last-seen points again: «Never» is gone, «Always» is the default.
- The start-up error message in the log no longer breaks on Russian Windows errors.

## minimap 0.2.1

### ru

- Прозрачность миникарты теперь действует.

### en

- The minimap transparency now takes effect.

## minimap 0.2.0

### ru

- На новой установке включаются рекомендуемые настройки, с кнопкой «Вернуть как было»; у остальных — «Рекомендуемые настройки».

### en

- A fresh install gets recommended settings with «Restore my settings»; existing players get a «Recommended settings» button.

## minimap 0.1.1

### ru

- Размер мини-карты теперь действительно меняется.

### en

- The minimap size now really changes.

## minimap 0.1.0

### ru

- Настройки миникарты игры: размер, прозрачность, названия техники и круги обзора своей машины.

### en

- The game's minimap options: size, transparency, vehicle names and your own range circles.

## camera 0.3.3

### ru

- Внутренняя доработка: компонент работает как раньше.

### en

- Internal cleanup: the component works as before.

## camera 0.3.2

### ru

- Сообщение об ошибке запуска в логе больше не ломается на русских ошибках Windows.

### en

- The start-up error message in the log no longer breaks on Russian Windows errors.

## camera 0.3.1

### ru

- Выбор пресета «Снайпер», «Универсальный» или «Динамичный» теперь действительно его применяет.

### en

- Picking the «Sniper», «Balanced» or «Dynamic» preset now really applies it.

## camera 0.3.0

### ru

- На новой установке включаются рекомендуемые настройки камеры, с кнопкой «Вернуть как было»; у остальных — «Рекомендуемые настройки».

### en

- A fresh install gets recommended camera settings with «Restore my settings»; existing players get a «Recommended settings» button.

## camera 0.2.0

### ru

- Добавлена настройка «Зум при входе в снайперский режим» (запоминать, x2, x4, x8); пресеты выставляют её.

### en

- Added the «zoom on entering sniper mode» option (remember, x2, x4, x8); the presets set it.

## camera 0.1.0

### ru

- Настройки камеры игры: пресеты, снайперский зум, динамическая камера и горизонтальная стабилизация.

### en

- The game's camera options: presets, sniper zoom, the dynamic camera and horizontal stabilisation.

## crosshair 0.1.0

### ru

- Пресеты прицела для аркадного и снайперского режимов и переключатель серверного прицела.
- Центральная метка на выбор из 12 вариантов поверх центра прицела.

### en

- Reticle presets for arcade and sniper modes, and the server-reticle switch.
- A centre mark of your choice from 12 options over the reticle centre.

## hangar_info 0.2.0

### ru

- Строка выбранного танка: уровни боёв, опыт экипажа до следующего навыка и ускоренное обучение.

### en

- A line for the selected tank: its battle tiers, crew XP to the next skill and accelerated training.

## hangar_info 0.1.0

### ru

- В ангаре: местное время и дата, текущий сервер, пинг до него и онлайн.

### en

- In the hangar: local time and date, the current server, your ping to it and the online count.

## auto_resupply 0.1.2

### ru

- Внутренняя доработка: компонент работает как раньше.

### en

- Internal cleanup: the component works as before.

## auto_resupply 0.1.1

### ru

- Сообщение об ошибке запуска в логе больше не ломается на русских ошибках Windows.

### en

- The start-up error message in the log no longer breaks on Russian Windows errors.

## auto_resupply 0.1.0

### ru

- Автоматический ремонт и автопополнение для выбранного танка или всего ангара — по нажатию кнопки.

### en

- Auto repair and auto-resupply for the selected tank or the whole garage, at the press of a button.

## notification_filter 0.1.2

### ru

- Сообщение об ошибке запуска в логе больше не ломается на русских ошибках Windows.

### en

- The start-up error message in the log no longer breaks on Russian Windows errors.

## notification_filter 0.1.1

### ru

- Пополнение «Торгового каравана» больше не скрывается вместе с аукционом.

### en

- The Trading Caravan refill is no longer hidden with the auction.

## notification_filter 0.1.0

### ru

- Скрывает рекламу, напоминания, заявки в друзья и приглашения в клан. Сообщения и приглашения во взвод не скрываются.

### en

- Hides promo, reminders, friend requests and clan invites. Messages and platoon invites are never hidden.

## hangar_cleaner 0.1.2

### ru

- Сообщение об ошибке запуска в логе больше не ломается на русских ошибках Windows.

### en

- The start-up error message in the log no longer breaks on Russian Windows errors.

## hangar_cleaner 0.1.1

### ru

- На непроверенной версии клиента тизер и входы в события остаются как в игре.
- Баннеры предложений скрываются надёжнее.

### en

- On an unverified client version the teaser and event entries stay as in the game.
- Offer banners are hidden more reliably.

## hangar_cleaner 0.1.0

### ru

- Скрывает рекламный тизер и баннеры предложений в ангаре и по желанию входы в события в карусели.

### en

- Hides the hangar's promo teaser and offer banners, and optionally the event entries in the carousel.
