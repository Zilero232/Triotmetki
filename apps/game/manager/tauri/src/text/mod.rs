use encoding_rs::{Encoding, WINDOWS_1251};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Fallback {
    Lossy,
    Windows1251,
}

pub fn decode_text(bytes: &[u8], fallback: Fallback) -> String {
    if let Some((encoding, bom_length)) = Encoding::for_bom(bytes) {
        return encoding.decode_without_bom_handling(&bytes[bom_length..]).0.into_owned();
    }

    match std::str::from_utf8(bytes) {
        Ok(text) => text.to_owned(),
        Err(error) if fallback == Fallback::Windows1251 && error.error_len().is_some() => {
            WINDOWS_1251.decode_without_bom_handling(bytes).0.into_owned()
        }
        Err(_) => String::from_utf8_lossy(bytes).into_owned(),
    }
}

#[cfg(test)]
mod tests;
