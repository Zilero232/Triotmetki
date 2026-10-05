missing = —

chat-stat = { $nickname }: WN8 { $wn8 ->
        [none] { missing }
       *[other] { NUMBER($wn8, maximumFractionDigits: 0) }
    }, { $winRate ->
        [none] { missing }
       *[other] { NUMBER($winRate, minimumFractionDigits: 2, maximumFractionDigits: 2) }%
    } wins, { $battles ->
        [none] { missing }
       *[other] { $battles }
    } battles
chat-session = { $nickname } session: { $battles } { $battles ->
        [one] battle
       *[other] battles
    }, { NUMBER($winRate, minimumFractionDigits: 1, maximumFractionDigits: 1) }% wins, { NUMBER($avgDamage, maximumFractionDigits: 0) } avg damage
chat-session-none = { $nickname } has no session yet
chat-marks = { $nickname }: 3 marks — { $moe3 }, 2 marks — { $moe2 }, 1 mark — { $moe1 }
chat-challenge-active = Challenge “{ $title }” accepted from { $donor }! The Three Marks mod will verify it.
chat-challenge-succeeded = Challenge “{ $title }” completed! 🎉
chat-challenge-failed = Challenge “{ $title }” failed.
chat-challenge-expired = Time is up for challenge “{ $title }”.
chat-prediction-title = { $tank }: over { $damage } damage?
chat-prediction-yes = Yes
chat-prediction-no = No
chat-settings = { $name }'s game settings: { $url }
chat-settings-none = { $name } has not shared game settings yet. Profile: { $url }
