cmd-me = Моя статистика
cmd-session = Текущая сессия
cmd-marks = Отметки
cmd-clan = Мой клан
cmd-tank = Танк: /tank название
cmd-top = Топ игроков по WN8
cmd-lbz = Следующие ЛБЗ
cmd-next = Что сыграть сегодня
cmd-settings = Уведомления
cmd-login = Войти на сайт
cmd-help = Помощь

start-welcome =
    Привет! Я бот «Трёх отметок» — статистика «Мира танков» прямо в Telegram.

    Привяжите аккаунт: откройте сайт → Профиль → Telegram и отправьте мне код, или просто войдите на сайт кнопкой ниже.
start-linked = Готово! Telegram привязан к аккаунту «Трёх отметок». Команды: /me /session /marks /clan /tank /top /settings
start-code-invalid = Код не найден, уже использован или истёк. Получите новый на сайте.
start-code-taken = Этот Telegram уже привязан к другому аккаунту «Трёх отметок».
link-confirm = Привязать этот Telegram к аккаунту «{ $name }» в «Трёх отметках»? Подтверждайте, только если код вы запросили сами.
link-confirm-yes = Да, привязать
link-confirm-no = Нет
link-cancelled = Отменено. Ничего не привязано.
login-link = Ссылка для входа на сайт (действует { $minutes } мин.):
private-only = Ради безопасности вход и привязка аккаунта работают только в личном чате с ботом.
login-button = Войти на сайт
open-site = Открыть на сайте
open-app = Открыть «Три отметки»
help =
    /me [ник] — статистика игрока
    /session — текущая сессия
    /marks — отметки и ближайшие к следующей
    /clan — ваш клан
    /tank название — пороги отметок танка
    /top — топ игроков по WN8
    /lbz — следующие личные боевые задачи
    /next — плейлист вечера: на чём сыграть сегодня
    /watch [ник] — наблюдение за игроками
    /settings — уведомления
    /login — ссылка для входа на сайт

    В любом чате: @{ $bot } ник — карточка игрока.
lbz-not-linked = Привяжите Telegram к аккаунту на сайте, чтобы отмечать ЛБЗ.
lbz-empty = Задачи ещё не загружены или все выполнены.
lbz-header = ЛБЗ: { $operation }
lbz-line =
    { $branch }: { $title }
    { $condition }
lbz-branch-lightTank = ЛТ
lbz-branch-mediumTank = СТ
lbz-branch-heavyTank = ТТ
lbz-branch-AT-SPG = ПТ-САУ
lbz-branch-SPG = САУ
lbz-branch-Alliance-USSR = Союз
lbz-branch-Alliance-Germany = Блок
lbz-branch-Alliance-USA = Альянс
lbz-branch-Alliance-France = Коалиция
lbz-branch-LevelGroup1 = VI–VII
lbz-branch-LevelGroup2 = VIII–IX
lbz-branch-LevelGroup3 = X–XI
settings-title = Уведомления в Telegram и браузере. Нажмите, чтобы переключить.
settings-channel-telegram = Telegram
settings-channel-webPush = Push в браузере
settings-event-moeGained = Новые отметки
settings-event-moeThresholdDropped = Падение порогов
settings-event-sessionFinished = Итоги сессии
settings-event-bonusCode = Бонус-коды
settings-event-premiumOffer = Скидки на танки
settings-event-challengeResolved = Челленджи
settings-event-firstWinAvailable = Первая победа дня
settings-weekly-digest = Недельный дайджест
settings-on = ✅ { $label }
settings-off = ▫️ { $label }
settings-not-linked = Настройки доступны после привязки аккаунта: /start
inline-not-found = Игрок не найден
notification-open = Открыть

next-not-linked = Привяжите Telegram и аккаунт Лесты на сайте, чтобы получить плейлист вечера.
next-no-garage = Состав ангара пока неизвестен: войдите на сайт через Lesta ID, чтобы мы увидели ваши танки.
next-empty = Сегодня подсказок нет — играйте на любимых танках!
next-header = Плейлист вечера:
next-line = { $tank }: { $reasons }
next-reason-closeToMark = близко к отметке ({ $percent }%)
next-reason-firstWin = первая победа не взята
next-reason-longUnplayed = давно не играли ({ $days } дн.)
next-reason-lowWinRate = есть что поправить
next-reason-mission = подходит под ЛБЗ
next-plus-hint = С «Плюсом» — { $size } танков и больше причин.
watch-not-linked = Привяжите Telegram к аккаунту на сайте, чтобы следить за игроками.
watch-empty = Список наблюдения пуст. Добавьте игрока: /watch ник
watch-header = Наблюдение: { $count } из { $limit }
watch-line = { $nickname }: { $battles } { $battles ->
        [one] бой
        [few] боя
       *[many] боёв
    } за сутки, отметок { $marks }
watch-added = { $nickname } в списке наблюдения ({ $count } из { $limit }).
watch-limit = Список наблюдения заполнен. С «Плюсом» можно следить за большим числом игроков.
cmd-watch = Наблюдение за игроками: /watch ник
