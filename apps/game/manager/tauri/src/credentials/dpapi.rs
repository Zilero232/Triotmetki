use base64::engine::general_purpose::STANDARD;
use base64::Engine;

pub const DPAPI_ENTROPY: &[u8] = b"triotmetki-device-v1";

#[cfg(windows)]
mod system {
    use windows_sys::Win32::Foundation::LocalFree;
    use windows_sys::Win32::Security::Cryptography::{CryptProtectData, CryptUnprotectData, CRYPTPROTECT_UI_FORBIDDEN, CRYPT_INTEGER_BLOB};

    use super::DPAPI_ENTROPY;

    fn blob(bytes: &[u8]) -> Option<CRYPT_INTEGER_BLOB> {
        Some(CRYPT_INTEGER_BLOB { cbData: u32::try_from(bytes.len()).ok()?, pbData: bytes.as_ptr().cast_mut() })
    }

    fn take_output(done: windows_sys::core::BOOL, output: CRYPT_INTEGER_BLOB) -> Option<Vec<u8>> {
        if done == 0 || output.pbData.is_null() {
            return None;
        }

        let bytes = unsafe { std::slice::from_raw_parts(output.pbData, output.cbData as usize) }.to_vec();

        unsafe { LocalFree(output.pbData.cast()) };

        Some(bytes)
    }

    pub fn protect(data: &[u8]) -> Option<Vec<u8>> {
        let (input, entropy) = (blob(data)?, blob(DPAPI_ENTROPY)?);
        let mut output = CRYPT_INTEGER_BLOB::default();
        let done = unsafe {
            CryptProtectData(&input, std::ptr::null(), &entropy, std::ptr::null(), std::ptr::null(), CRYPTPROTECT_UI_FORBIDDEN, &mut output)
        };

        take_output(done, output)
    }

    pub fn unprotect(data: &[u8]) -> Option<Vec<u8>> {
        let (input, entropy) = (blob(data)?, blob(DPAPI_ENTROPY)?);
        let mut output = CRYPT_INTEGER_BLOB::default();
        let done = unsafe {
            CryptUnprotectData(&input, std::ptr::null_mut(), &entropy, std::ptr::null(), std::ptr::null(), CRYPTPROTECT_UI_FORBIDDEN, &mut output)
        };

        take_output(done, output)
    }
}

#[cfg(not(windows))]
mod system {
    pub fn protect(_data: &[u8]) -> Option<Vec<u8>> {
        None
    }

    pub fn unprotect(_data: &[u8]) -> Option<Vec<u8>> {
        None
    }
}

pub fn seal(secret: &str) -> Option<String> {
    system::protect(secret.as_bytes()).map(|blob| STANDARD.encode(blob))
}

pub fn open(sealed: &str) -> Option<String> {
    let blob = STANDARD.decode(sealed.trim()).ok()?;

    String::from_utf8(system::unprotect(&blob)?).ok()
}
