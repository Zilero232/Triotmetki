missing = —

chat-stat = { $nickname }: WN8 { $wn8 ->
        [none] { missing }
       *[other] { NUMBER($wn8, maximumFractionDigits: 0) }
    }, побед { $winRate ->
        [none] { missing }
       *[other] { NUMBER($winRate, minimumFractionDigits: 2, maximumFractionDigits: 2) }%
    }, боёв { $battles ->
        [none] { missing }
       *[other] { $battles }
    }
chat-session = Сессия { $nickname }: { $battles } { $battles ->
        [one] бой
        [few] боя
       *[many] боёв
    }, побед { NUMBER($winRate, minimumFractionDigits: 1, maximumFractionDigits: 1) }%, средний урон { NUMBER($avgDamage, maximumFractionDigits: 0) }
chat-session-none = У { $nickname } пока нет сессии
chat-marks = { $nickname }: 3 отм. — { $moe3 }, 2 отм. — { $moe2 }, 1 отм. — { $moe1 }
chat-challenge-active = Челлендж «{ $title }» принят от { $donor }! Условие проверит мод «Трёх отметок».
chat-challenge-succeeded = Челлендж «{ $title }» выполнен! 🎉
chat-challenge-failed = Челлендж «{ $title }» провален.
chat-challenge-expired = Время на челлендж «{ $title }» вышло.
chat-prediction-title = { $tank }: больше { $damage } урона?
chat-prediction-yes = Да
chat-prediction-no = Нет
chat-settings = Настройки игры { $name }: { $url }
chat-settings-none = { $name } ещё не выложил настройки игры. Профиль: { $url }
