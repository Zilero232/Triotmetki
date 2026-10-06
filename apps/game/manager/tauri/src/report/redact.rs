use regex::{Captures, Regex};

pub const USER: &str = "<user>";
pub const ACCOUNT: &str = "<account>";
pub const EMAIL: &str = "<email>";
pub const DEVICE: &str = "<device>";
pub const HIDDEN: &str = "<redacted>";
pub const MIN_NAME_LENGTH: usize = 3;
pub const MIN_SECRET_LENGTH: usize = 8;
pub const PROFILE_PATH: &str = r#"(?i)\b([a-z]:[\\/]+(?:users|documents and settings)[\\/]+)[^\\/\r\n"'<>|:*?]+"#;
pub const EMAIL_PATTERN: &str = r"[\w.+-]+@[\w-]+(?:\.[\w-]+)+";
pub const DEVICE_PATTERN: &str = r"\bdev_[\w-]{6,}";
pub const SECRET_PATTERN: &str =
    r#"(?i)\b(secret|token|password|passwd|bind_code|authorization|cookie|session_id|api_key)(["']?\s*[:=]\s*["']?)[^\s"',;}]+"#;
pub const SIGNATURE_PATTERN: &str = r"(?i)\bsha256=[0-9a-f]{64}";

#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct RedactContext {
    pub user_name: Option<String>,
    pub account_ids: Vec<u64>,
    pub secrets: Vec<String>,
}

enum Replacement {
    Fixed(&'static str),
    KeepFirst(&'static str),
    KeepTwo(&'static str),
}

pub struct Redactor {
    rules: Vec<(Regex, Replacement)>,
}

fn rule(pattern: &str, replacement: Replacement) -> Option<(Regex, Replacement)> {
    Regex::new(pattern).ok().map(|regex| (regex, replacement))
}

impl Redactor {
    pub fn new(context: &RedactContext) -> Self {
        let mut rules: Vec<Option<(Regex, Replacement)>> = context
            .secrets
            .iter()
            .filter(|secret| secret.chars().count() >= MIN_SECRET_LENGTH)
            .map(|secret| rule(&regex::escape(secret), Replacement::Fixed(HIDDEN)))
            .collect();

        rules.push(rule(PROFILE_PATH, Replacement::KeepFirst(USER)));

        if let Some(name) = context.user_name.as_deref().map(str::trim).filter(|name| name.chars().count() >= MIN_NAME_LENGTH) {
            rules.push(rule(&format!(r"(?i)\b{}\b", regex::escape(name)), Replacement::Fixed(USER)));
        }

        rules.push(rule(EMAIL_PATTERN, Replacement::Fixed(EMAIL)));
        rules.push(rule(DEVICE_PATTERN, Replacement::Fixed(DEVICE)));
        rules.push(rule(SECRET_PATTERN, Replacement::KeepTwo(HIDDEN)));
        rules.push(rule(SIGNATURE_PATTERN, Replacement::Fixed(HIDDEN)));

        for id in context.account_ids.iter().filter(|id| **id > 0) {
            rules.push(rule(&format!(r"\b{id}\b"), Replacement::Fixed(ACCOUNT)));
        }

        Self { rules: rules.into_iter().flatten().collect() }
    }

    pub fn redact(&self, text: &str) -> (String, usize) {
        let mut count = 0;
        let mut current = text.to_owned();

        for (regex, replacement) in &self.rules {
            let replaced = regex.replace_all(&current, |captures: &Captures| {
                count += 1;

                match replacement {
                    Replacement::Fixed(value) => (*value).to_owned(),
                    Replacement::KeepFirst(value) => format!("{}{value}", &captures[1]),
                    Replacement::KeepTwo(value) => format!("{}{}{value}", &captures[1], &captures[2]),
                }
            });

            current = replaced.into_owned();
        }

        (current, count)
    }
}
