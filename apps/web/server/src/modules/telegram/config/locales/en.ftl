cmd-me = My stats
cmd-session = Current session
cmd-marks = Marks of excellence
cmd-clan = My clan
cmd-tank = Tank: /tank name
cmd-top = Top players by WN8
cmd-lbz = Next personal missions
cmd-next = What to play tonight
cmd-settings = Notifications
cmd-login = Sign in on the site
cmd-help = Help

start-welcome =
    Hi! I am the Three Marks bot — Tanks stats right in Telegram.

    Link your account: open the site → Profile → Telegram and send me the code, or just sign in with the button below.
start-linked = Done! Telegram is linked to your Three Marks account. Commands: /me /session /marks /clan /tank /top /settings
start-code-invalid = The code is unknown, already used or expired. Get a new one on the site.
start-code-taken = This Telegram account is linked to another Three Marks account.
link-confirm = Link this Telegram to the Three Marks account “{ $name }”? Only confirm if you requested the code yourself.
link-confirm-yes = Yes, link
link-confirm-no = No
link-cancelled = Cancelled. Nothing was linked.
login-link = Your sign-in link (valid for { $minutes } min):
private-only = For your safety, sign-in links and account linking work only in a private chat with the bot.
login-button = Sign in
open-site = Open on the site
open-app = Open Three Marks
help =
    /me [nickname] — player stats
    /session — current session
    /marks — marks and the closest to the next one
    /clan — your clan
    /tank name — tank mark thresholds
    /top — top players by WN8
    /lbz — next personal missions
    /next — tonight's playlist: what to play
    /watch [nickname] — watch players
    /settings — notifications
    /login — sign-in link for the site

    In any chat: @{ $bot } nickname — a player card.
lbz-not-linked = Link Telegram to your account on the site to track personal missions.
lbz-empty = Missions are not loaded yet or all of them are done.
lbz-header = Personal missions: { $operation }
lbz-line =
    { $branch }: { $title }
    { $condition }
lbz-branch-lightTank = LT
lbz-branch-mediumTank = MT
lbz-branch-heavyTank = HT
lbz-branch-AT-SPG = TD
lbz-branch-SPG = SPG
lbz-branch-Alliance-USSR = Union
lbz-branch-Alliance-Germany = Bloc
lbz-branch-Alliance-USA = Alliance
lbz-branch-Alliance-France = Coalition
lbz-branch-LevelGroup1 = VI–VII
lbz-branch-LevelGroup2 = VIII–IX
lbz-branch-LevelGroup3 = X–XI
settings-title = Notifications in Telegram and the browser. Tap to toggle.
settings-channel-telegram = Telegram
settings-channel-webPush = Browser push
settings-event-moeGained = New marks
settings-event-moeThresholdDropped = Threshold drops
settings-event-sessionFinished = Session summary
settings-event-bonusCode = Bonus codes
settings-event-premiumOffer = Tank discounts
settings-event-challengeResolved = Challenges
settings-event-firstWinAvailable = First win of the day
settings-weekly-digest = Weekly digest
settings-on = ✅ { $label }
settings-off = ▫️ { $label }
settings-not-linked = Settings need a linked account: /start
inline-not-found = Player not found
notification-open = Open

next-not-linked = Link Telegram and your Lesta account on the site to get tonight's playlist.
next-no-garage = Your garage is unknown yet: sign in on the site with Lesta ID so we can see your tanks.
next-empty = No suggestions today — play your favourites!
next-header = Tonight's playlist:
next-line = { $tank }: { $reasons }
next-reason-closeToMark = close to a mark ({ $percent }%)
next-reason-firstWin = first win not taken
next-reason-longUnplayed = not played for { $days } days
next-reason-lowWinRate = room to improve
next-reason-mission = fits your personal missions
next-plus-hint = With Plus: { $size } tanks and more reasons.
watch-not-linked = Link Telegram to your account on the site to watch players.
watch-empty = Your watchlist is empty. Add a player: /watch nickname
watch-header = Watchlist: { $count } of { $limit }
watch-line = { $nickname }: { $battles } { $battles ->
        [one] battle
       *[other] battles
    } in a day, { $marks } marks
watch-added = { $nickname } is on your watchlist ({ $count } of { $limit }).
watch-limit = The watchlist is full. Plus lets you watch more players.
cmd-watch = Watch players: /watch nickname
