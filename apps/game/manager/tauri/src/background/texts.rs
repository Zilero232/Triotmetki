use crate::error::ErrorCode;
use crate::patch::PatchStatus;
use crate::settings::Locale;

pub struct TrayTexts {
    pub tooltip: &'static str,
    pub open: &'static str,
    pub check: &'static str,
    pub quit: &'static str,
}

pub struct Notice {
    pub title: String,
    pub body: String,
}

pub const APP_TITLE: [&str; 2] = ["Три отметки", "Three Marks"];

pub fn tray(locale: Locale) -> TrayTexts {
    match locale {
        Locale::Ru => TrayTexts {
            tooltip: "Три отметки — менеджер модпака", open: "Открыть", check: "Проверить обновления", quit: "Выход"
        },
        Locale::En => TrayTexts { tooltip: "Three Marks — modpack manager", open: "Open", check: "Check for updates", quit: "Quit" },
    }
}

pub fn notice(status: &PatchStatus, locale: Locale) -> Option<Notice> {
    let ru = locale == Locale::Ru;
    let title = APP_TITLE[usize::from(!ru)].to_owned();
    let body = match (status, ru) {
        (PatchStatus::Migrated { to, .. }, true) => format!("Модпак перенесён под клиент {to}."),
        (PatchStatus::Migrated { to, .. }, false) => format!("The modpack moved to client {to}."),
        (PatchStatus::Updated { to, game_version, .. }, true) => format!("Модпак обновлён до {to} под клиент {game_version}."),
        (PatchStatus::Updated { to, game_version, .. }, false) => format!("The modpack is updated to {to} for client {game_version}."),
        (PatchStatus::Waiting { game_version, .. }, true) => format!("Ждём обновления модпака под {game_version}."),
        (PatchStatus::Waiting { game_version, .. }, false) => format!("Waiting for a modpack update for {game_version}."),
        (PatchStatus::UpdateAvailable { latest, .. }, true) => format!("Доступна новая версия модпака {latest}."),
        (PatchStatus::UpdateAvailable { latest, .. }, false) => format!("Modpack {latest} is available."),
        (PatchStatus::MigrationReady { game_version, .. }, true) => format!("Модпак можно перенести под клиент {game_version}."),
        (PatchStatus::MigrationReady { game_version, .. }, false) => format!("The modpack can be moved to client {game_version}."),
        (PatchStatus::UpdateReady { latest, game_version, .. }, true) => format!("Для клиента {game_version} готов модпак {latest}."),
        (PatchStatus::UpdateReady { latest, game_version, .. }, false) => format!("Modpack {latest} is ready for client {game_version}."),
        (PatchStatus::Deferred { game_version, .. }, true) => format!("Закройте игру — модпак обновится под {game_version} сразу после выхода."),
        (PatchStatus::Deferred { game_version, .. }, false) => {
            format!("Close the game: the modpack updates for {game_version} right after it exits.")
        }
        (PatchStatus::Failed { code }, true) => format!("Не удалось обновить модпак: {}", failure(*code, locale)),
        (PatchStatus::Failed { code }, false) => format!("The modpack update failed: {}", failure(*code, locale)),
        _ => return None,
    };

    Some(Notice { title, body })
}

pub fn failure(code: ErrorCode, locale: Locale) -> &'static str {
    let ru = locale == Locale::Ru;

    match code {
        ErrorCode::Http | ErrorCode::ReleaseUnavailable if ru => "нет связи с сервером.",
        ErrorCode::Http | ErrorCode::ReleaseUnavailable => "the server is unreachable.",
        ErrorCode::ChecksumMismatch | ErrorCode::SignatureInvalid | ErrorCode::UntrustedHost if ru => "загрузка не прошла проверку подлинности.",
        ErrorCode::ChecksumMismatch | ErrorCode::SignatureInvalid | ErrorCode::UntrustedHost => "the download failed its authenticity check.",
        ErrorCode::DiskFull if ru => "на диске не хватает места.",
        ErrorCode::DiskFull => "the disk is full.",
        ErrorCode::FileLocked | ErrorCode::ClientRunning if ru => "файлы модпака заняты игрой или антивирусом.",
        ErrorCode::FileLocked | ErrorCode::ClientRunning => "the modpack files are in use by the game or an antivirus.",
        ErrorCode::RollbackFailed if ru => "откат не удался, переустановите модпак на главной.",
        ErrorCode::RollbackFailed => "the rollback failed, reinstall the modpack from Home.",
        _ if ru => "ошибка файловой системы, подробности в журнале.",
        _ => "a file system error, see the log.",
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn announces_the_patch_outcomes_only() {
        let waiting = PatchStatus::Waiting { game_version: "1.46.0.0".into(), from: "1.45.0.0".into() };
        let current = PatchStatus::UpToDate { game_version: "1.46.0.0".into(), modpack_version: None };

        assert_eq!(notice(&waiting, Locale::Ru).unwrap().body, "Ждём обновления модпака под 1.46.0.0.");
        assert!(notice(&current, Locale::En).is_none());
    }

    #[test]
    fn a_failure_never_shows_a_raw_error() {
        let failed = PatchStatus::Failed { code: ErrorCode::FileLocked };

        assert_eq!(notice(&failed, Locale::Ru).unwrap().body, "Не удалось обновить модпак: файлы модпака заняты игрой или антивирусом.");
        assert!(!notice(&PatchStatus::Failed { code: ErrorCode::Io }, Locale::En).unwrap().body.contains("os error"));
    }
}
