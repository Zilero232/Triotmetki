use crate::error::{AppError, AppResult, ErrorCode};

pub fn random_hex<const N: usize>() -> AppResult<String> {
    let mut bytes = [0; N];

    getrandom::fill(&mut bytes).map_err(|error| AppError::coded(ErrorCode::Io, format!("no system randomness: {error}")))?;

    Ok(hex::encode(bytes))
}

#[cfg(test)]
mod tests;
