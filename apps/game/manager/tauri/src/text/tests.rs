use super::*;

#[test]
fn reads_plain_utf8_with_a_bom() {
    assert_eq!(decode_text(b"\xEF\xBB\xBF[a]\nb=1\n", Fallback::Lossy), "[a]\nb=1\n");
}

#[test]
fn reads_utf16_by_its_bom() {
    let text = "[install]\nпуть=D:\\Игры";
    let bytes: Vec<u8> = [0xFF, 0xFE].into_iter().chain(text.encode_utf16().flat_map(u16::to_le_bytes)).collect();

    assert_eq!(decode_text(&bytes, Fallback::Lossy), text);
    assert_eq!(decode_text(&bytes, Fallback::Windows1251), text);
}

#[test]
fn decodes_a_cp1251_log_only_when_asked() {
    let (bytes, _, _) = WINDOWS_1251.encode("Путь D:\\Игры");

    assert_eq!(decode_text(&bytes, Fallback::Windows1251), "Путь D:\\Игры");
    assert!(decode_text(&bytes, Fallback::Lossy).contains('\u{FFFD}'));
    assert_eq!(decode_text("юникод".as_bytes(), Fallback::Windows1251), "юникод");
}

#[test]
fn a_tail_cut_inside_a_character_stays_utf8() {
    let bytes = "игра".as_bytes();

    assert_eq!(decode_text(&bytes[..bytes.len() - 1], Fallback::Windows1251), "игр\u{FFFD}");
}
