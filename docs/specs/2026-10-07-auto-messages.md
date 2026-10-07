# Auto messages in the battle chat (modpack component `auto_messages`, 2026-10-07)

The owner asked for automatic team-chat lines "like other packs", from a screenshot of another player's mod:
«TacticalMachine[T-R48] (WZ-111 1-4) : Арта (M53/M55) отстрелялась! По мне 😵». A later request widened it to a
varied, lively set of the player's own events. This spec fixes the triggers, the default texts, the anti-spam rules
and the fair-play reasoning before the code.

## 1. Competitors

| Source | What it shows |
| --- | --- |
| kurzdor «AutoBattleMessages» (MSA template and the player's values in `%APPDATA%\Lesta\MirTankov\mods\modsettings.dat`, read 2026-10-07; the Python is PjOrion-protected, see [code study](../research/competitors/2026-09-30-modpacks-code.md) §0) | `modDisplayName` «Автоматические сообщения в боевом чате», `enabled: true`. Three checkboxes, **all on by default**: `spottedEnable` «Я обнаружен» («при обнаружении вашего танка противником, когда в живых осталось 5 или менее союзников. У командира экипажа должен быть приобретен навык «Шестое чувство»»), with `spottedExtra` (radio: «Нет» / «Нужна помощь!» / «Внимание на точку», default «Нет»: the stock quick commands sent with the line); `artyEnable` «Арта кинула по мне» («при получении вашим танком урона от САУ противника»); `teamDamageEnable` «Союзник нанёс мне урон». The channel is the battle (team) chat. The message texts and cooldowns are not configurable and not readable (protected code); the screenshot gives the arty line's shape: the SPG's short name in brackets and a smiley. |
| Battle Observer, XVM, PMOD, wotstat | No automatic chat lines (Battle Observer source `aa95fc4`, XVM `929a79f`: no broadcast call; PMOD protected, its config has none). |
| Near_You, Lebwa, Jove | Ship kurzdor's mod or nothing of the kind ([code study](../research/competitors/2026-09-30-modpacks-code.md) §0 lists the bundled mods). |

So the convention is kurzdor's: three triggers on, team chat, a short fixed line per trigger. The wider catalogue the
owner asked for is ours; every extra trigger is **off by default**.

## 2. The client's own chat API (RU 1.45 source)

- Sending: `messenger.MessengerEntry.g_instance.gui.channelsCtrl` (the battle entry's `BattleControllers`) holds one
  controller per battle channel; `getSettings()` is `messenger.m_constants.BATTLE_CHANNEL.TEAM` / `SQUAD` / `COMMON`.
  `BattleLayout.sendMessage(text)` is what the chat input calls: it asks `canSendMessage()` (the channel enabled and
  the 0.5 s broadcast cooldown, `MESSENGER_LIMITS.BROADCASTS_FROM_CLIENT_COOLDOWN_SEC`) and then
  `proto.arenaChat.broadcast(text, 0)` (team) or `proto.unitChat.broadcast(text, 1)` (platoon). We call
  `canSendMessage()` first and drop the line when it refuses, so no stock error line is printed for it.
- Where team chat exists: `TeamChannelController.isEnabled()` is false when the player turned the battle chat off in the
  game settings (`userPrefs.disableBattleChat`, `messenger.ext.isBattleChatEnabled`), with no teammates, for an observer
  and in Battle Royale; the arena-waiting check refuses before the battle starts. The squad controller is enabled only
  in a platoon.
- Chat ban: the server answers a broadcast of a banned player with `errors.createBroadcastError` →
  `g_messengerEvents.onErrorReceived(ChatBanError)`. The component listens to it in battle and stops for the rest of
  the battle on the first `ChatBanError` (the player's own typed line counts too).
- Length: `MESSENGER_LIMITS.BATTLE_CHANNEL_MESSAGE_MAX_SIZE = 140`; a longer line is cut to 140 characters.
- Smileys: the battle chat renders no Unicode emoji (the Scaleform font has none); it replaces the text smileys of
  `BattleSmileyMap` (`gui_battle` AS3: `:)`, `:(`, `:O`, `>:O`, `;)`, `:P`, `:|`, `:/`, `:*` and the `=`/`-` forms)
  with its own pictures. The defaults use those, never emoji.
- Quick commands (spotted extra): `sessionProvider.shared.chatCommands.sendCommand('HELPME')` («Нужна помощь!») and
  `sendAttentionToPosition3D(own vehicle position, 'ATTENTION_TO_POSITION')` («Внимание на точку» at the player's own
  tank), the same calls the radial menu and the minimap make.
- Replays: the component starts on the companion's `battle_ready`, which never fires in a replay.

## 3. Triggers

Common placeholders: `{tank}` own vehicle short name, `{hp}` own HP now, `{damage}` own dealt damage so far,
`{frags}` own frags. Trigger placeholders below. Each trigger has a switch and a text; an empty text uses the built-in
variants in the client's language. Variants are separated by `|`; one is picked at random each time.

| Id | When (own data only) | Placeholders | Cooldown | Default | Built-in ru variants |
| --- | --- | --- | --- | --- | --- |
| `arty_hit` | `RECEIVED_DAMAGE` (own feedback, shot) from an enemy of class `SPG` | `{vehicle}` the SPG, `{hit}` the damage | 30 s | **on** | «Арта ({vehicle}) отстрелялась! По мне :O» · «{vehicle} снова греет меня с неба, минус {hit} >:O» · «Прилёт от {vehicle}! Арта перезаряжается, можно работать» |
| `team_damage` | `RECEIVED_DAMAGE` from an ally (not the own vehicle) | `{vehicle}`, `{hit}` | 30 s | **on** | «{vehicle}, я свой! Минус {hit} ХП :(» · «Союзник на {vehicle}, осторожнее с огнём!» |
| `spotted` | the sixth sense lamp lights (`OBSERVED_BY_ENEMY`) while at most `spotted_allies` allies (5, kurzdor) are alive; optional quick command after the line | `{allies}` allies alive | 60 s | **on** | «Меня засветили!» · «Я в засвете, прикройте!» |
| `ammo_rack` | the own ammo rack critical/destroyed (`DEVICES` `ammoBay`) | — | 60 s | off | «Боеукладка пострадала, держите фланг без меня» · «Повредили боеукладку, стреляю реже :(» |
| `crew` | an own crew member knocked out (`DEVICES` commander/driver/gunner/loader/radioman `destroyed`) | — | 60 s | off | «Минус член экипажа, работаю как могу» · «Ранили экипаж :(» |
| `tracks` | an own track destroyed (`DEVICES` `leftTrack*`/`rightTrack*` `destroyed`) | — | 30 s | off | «Разули! Стою на месте» · «Сбили гусеницу, прикройте!» |
| `fire` | the own vehicle catches fire (`FIRE` true) | — | 30 s | off | «Горю!» · «Пожар! Тушусь» |
| `fire_out` | the fire on the own vehicle is out (`FIRE` false after true) | — | 30 s | off | «Потушился, я в строю» |
| `low_hp` | own HP falls to `low_hp_percent` (25 %) of the maximum or below | `{percent}` | once | off | «Осталось {hp} ХП, ухожу на перезарядку нервов» · «{hp} ХП, играю аккуратно» |
| `rammed` | `RECEIVED_DAMAGE` caused by a ram | `{vehicle}`, `{hit}` | 30 s | off | «{vehicle} решил потаранить, минус {hit}» |
| `frag` | own `KILL` event | `{vehicle}` the destroyed vehicle | 10 s | off | «Минус один — {vehicle}» · «{vehicle} готов! ;)» |
| `damage_milestone` | own dealt damage reaches `damage_milestone_value` (2000) | — | once | off | «Нанёс {damage} — разогреваюсь» · «Уже {damage} урона, работаем!» |
| `last_alive` | the own vehicle is the last alive one of the team (team list) | `{enemies}` enemies alive | once | off | «Остался один против {enemies}. Держитесь за меня ;)» |
| `reload` | an own reload of at least `reload_min_s` (15 s) starts (`onGunReloadTimeSet`): a long gun or an emptied clip | `{seconds}` | 30 s | off | «Перезаряжаюсь {seconds} с, прикройте» · «Барабан пуст, перезаряжаюсь {seconds} с» |
| `greeting` | the battle period turns to `BATTLE` (the countdown ends) | — | once | off | «Удачи всем! :)» · «Всем удачи, работаем!» |
| `gg` | the round ends (`g_playerEvents.onRoundFinished`) | `{result}` победа/поражение/ничья | once | off | «gg» · «gg, {result}» |

## 4. Anti-spam

- Per trigger: the cooldown above (fixed, in `model/constants.py`); «once» triggers fire at most once per battle.
- Global: at least `min_interval_s` (10 s, 3..60) between two of our lines, and at most 4 lines per 60 s (fixed). A
  line that would break either is dropped, never queued: a late «горю» is noise.
- The client's own checks: `canSendMessage()` (channel enabled, 0.5 s broadcast cooldown); the chat ban stops the
  component for the battle.
- Never in a replay (`battle_ready`), never for an ally the camera follows after death (`controls_own_vehicle()`), and
  only while the arena is in its `BATTLE` period (except `gg`, which fires as the round ends).
- Channel: `team` (kurzdor) or `squad` (only the platoon sees it; nothing is sent outside a platoon).

## 5. Fair play

Every trigger reads only the player's own events the client already shows: the stock damage log's received-damage line
(attacker vehicle and class as the log names it), the damage panel's devices, fire and HP, the sixth sense lamp, the own
gun's reload, the own kills and dealt damage, and the alive counts of the team lists. Nothing about enemy positions,
reloads, aim or spotting is read, and nothing is inferred beyond the stock log line: the arty message names the SPG that
hit the player, exactly as the damage log does. The line goes out through the client's own chat call with the client's
own limits, as if the player typed it.

## 6. Settings and defaults

- config.json switch `battle_auto_messages`, **off** (`OPT_IN_FEATURES`: it sends client requests, CLAUDE.md
  «Hangar actions only on the player's request», chat in the player's name); catalog presets: none (like
  `chat_filter`). Once switched on, kurzdor's three triggers are on.
- components.json section `auto_messages`: per trigger `<id>` (bool) and `<id>_text` (text, `|` variants, empty =
  built-in); `channel` (`team`, `squad`), `min_interval_s`, `spotted_allies` (1..15), `spotted_extra` (``, `help`,
  `attention`), `low_hp_percent` (10..60), `damage_milestone_value` (500..10000), `reload_min_s` (5..60).
- The settings window renders it from the schema (`EDITOR_GROUPS`): the channel, then one group per trigger with its
  switch, text and threshold; `min_interval_s` under «Дополнительно». No ui-web change. Profile codes from other players never carry the switch or the section (a stranger's code must not
  post lines in the player's name).
