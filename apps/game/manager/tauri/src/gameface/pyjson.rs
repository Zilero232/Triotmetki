use std::collections::{BTreeMap, HashMap};

use serde::Deserialize;

pub const MAX_HEX_KEY_DIGITS: usize = 30;
pub const INDEXED_DICT_LEN: usize = 16;
pub const MAX_DEPTH: usize = 128;
pub const KNOWN_KEY_ORDERS: &str = include_str!("key_orders.json");

#[derive(Debug, Clone, PartialEq, Eq, thiserror::Error)]
pub enum MergeError {
    #[error("unsupported JSON at byte {0}")]
    Syntax(usize),
    #[error("a float, which Python would re-format")]
    Float,
    #[error("a non-ASCII string, which Gameface cannot write")]
    NonAscii,
    #[error("the game's res_map is not a JSON object")]
    BaseShape,
    #[error("the resource key {0} is not a plain hex number")]
    BaseKey(String),
    #[error("a res_map config is not a list of objects")]
    ConfigShape,
    #[error("the client's Python orders the keys {0:?} in a way not seen yet")]
    UnknownOrder(Vec<String>),
    #[error("the client's Python ordered the keys {0:?} differently from the known order")]
    OrderConflict(Vec<String>),
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum PyValue {
    Null,
    Bool(bool),
    Int(String),
    Str(String),
    List(Vec<PyValue>),
    Dict(PyDict),
}

impl PyValue {
    fn is_truthy(&self) -> bool {
        match self {
            PyValue::Null => false,
            PyValue::Bool(value) => *value,
            PyValue::Int(digits) => digits != "0",
            PyValue::Str(text) => !text.is_empty(),
            PyValue::List(items) => !items.is_empty(),
            PyValue::Dict(dict) => !dict.entries.is_empty(),
        }
    }

    fn same_content(&self, other: &PyValue) -> bool {
        match (self, other) {
            (PyValue::List(left), PyValue::List(right)) => {
                left.len() == right.len() && left.iter().zip(right).all(|(left, right)| left.same_content(right))
            }
            (PyValue::Dict(left), PyValue::Dict(right)) => {
                left.entries.len() == right.entries.len()
                    && left.entries.iter().all(|(key, value)| right.get(key).is_some_and(|other| value.same_content(other)))
            }
            _ => self == other,
        }
    }
}

#[derive(Debug, Clone, Default, PartialEq, Eq, Hash, Deserialize)]
pub struct Signature {
    pub inserted: Vec<String>,
    #[serde(default)]
    pub deleted: Vec<String>,
}

#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct PyDict {
    signature: Signature,
    entries: Vec<(String, PyValue)>,
    index: HashMap<String, usize>,
}

impl PyDict {
    pub fn len(&self) -> usize {
        self.entries.len()
    }

    fn position(&self, key: &str) -> Option<usize> {
        if self.entries.len() > INDEXED_DICT_LEN {
            self.index.get(key).copied()
        } else {
            self.entries.iter().position(|(existing, _)| existing == key)
        }
    }

    pub fn get(&self, key: &str) -> Option<&PyValue> {
        self.position(key).map(|index| &self.entries[index].1)
    }

    pub fn keys(&self) -> impl Iterator<Item = &str> {
        self.entries.iter().map(|(key, _)| key.as_str())
    }

    pub fn insert(&mut self, key: String, value: PyValue) {
        self.signature.inserted.push(key.clone());

        match self.position(&key) {
            Some(index) => self.entries[index].1 = value,
            None => {
                self.entries.push((key, value));

                if self.entries.len() == INDEXED_DICT_LEN + 1 {
                    self.index = self.entries.iter().enumerate().map(|(index, (key, _))| (key.clone(), index)).collect();
                } else if self.entries.len() > INDEXED_DICT_LEN {
                    self.index.insert(self.entries[self.entries.len() - 1].0.clone(), self.entries.len() - 1);
                }
            }
        }
    }

    pub fn remove(&mut self, key: &str) -> Option<PyValue> {
        let index = self.position(key)?;
        let (_, value) = self.entries.remove(index);

        self.signature.deleted.push(key.to_owned());
        self.index = if self.entries.len() > INDEXED_DICT_LEN {
            self.entries.iter().enumerate().map(|(index, (key, _))| (key.clone(), index)).collect()
        } else {
            HashMap::new()
        };

        Some(value)
    }
}

#[derive(Debug, Deserialize)]
struct KnownOrder {
    #[serde(flatten)]
    signature: Signature,
    order: Vec<String>,
}

#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct KeyOrders {
    known: HashMap<Signature, Vec<String>>,
}

impl KeyOrders {
    pub fn known() -> Self {
        let entries: Vec<KnownOrder> = serde_json::from_str(KNOWN_KEY_ORDERS).unwrap_or_default();

        Self { known: entries.into_iter().map(|entry| (entry.signature, entry.order)).collect() }
    }

    fn record(&mut self, signature: &Signature, order: Vec<String>) -> Result<(), MergeError> {
        match self.known.get(signature) {
            Some(known) if *known != order => Err(MergeError::OrderConflict(signature.inserted.clone())),
            Some(_) => Ok(()),
            None => {
                self.known.insert(signature.clone(), order);

                Ok(())
            }
        }
    }

    pub fn learn(&mut self, ours: &PyValue, written: &PyValue) -> Result<(), MergeError> {
        match (ours, written) {
            (PyValue::List(ours), PyValue::List(written)) => ours.iter().zip(written).try_for_each(|(ours, written)| self.learn(ours, written)),
            (PyValue::Dict(ours), PyValue::Dict(written)) => {
                if ours.len() > 1 {
                    self.record(&ours.signature, written.keys().map(str::to_owned).collect())?;
                }

                ours.entries.iter().try_for_each(|(key, value)| written.get(key).map_or(Ok(()), |other| self.learn(value, other)))
            }
            _ => Ok(()),
        }
    }

    fn order<'a>(&self, dict: &'a PyDict) -> Result<Vec<(&'a str, &'a PyValue)>, MergeError> {
        if dict.len() <= 1 {
            return Ok(dict.entries.iter().map(|(key, value)| (key.as_str(), value)).collect());
        }

        let unknown = || MergeError::UnknownOrder(dict.signature.inserted.clone());
        let order = self.known.get(&dict.signature).filter(|order| order.len() == dict.len()).ok_or_else(unknown)?;

        order.iter().map(|key| dict.position(key).map(|index| (dict.entries[index].0.as_str(), &dict.entries[index].1)).ok_or_else(unknown)).collect()
    }
}

struct Parser<'a> {
    bytes: &'a [u8],
    at: usize,
    depth: usize,
}

impl Parser<'_> {
    fn error(&self) -> MergeError {
        MergeError::Syntax(self.at)
    }

    fn skip_whitespace(&mut self) {
        while matches!(self.bytes.get(self.at), Some(b' ' | b'\t' | b'\n' | b'\r')) {
            self.at += 1;
        }
    }

    fn eat(&mut self, byte: u8) -> bool {
        self.skip_whitespace();

        let found = self.bytes.get(self.at) == Some(&byte);

        if found {
            self.at += 1;
        }

        found
    }

    fn expect(&mut self, byte: u8) -> Result<(), MergeError> {
        if self.eat(byte) {
            Ok(())
        } else {
            Err(self.error())
        }
    }

    fn literal(&mut self, word: &str, value: PyValue) -> Result<PyValue, MergeError> {
        if self.bytes[self.at..].starts_with(word.as_bytes()) {
            self.at += word.len();

            Ok(value)
        } else {
            Err(self.error())
        }
    }

    fn value(&mut self) -> Result<PyValue, MergeError> {
        self.skip_whitespace();

        match self.bytes.get(self.at) {
            Some(b'{') => self.nested(Self::object),
            Some(b'[') => self.nested(Self::array),
            Some(b'"') => self.string().map(PyValue::Str),
            Some(b'n') => self.literal("null", PyValue::Null),
            Some(b't') => self.literal("true", PyValue::Bool(true)),
            Some(b'f') => self.literal("false", PyValue::Bool(false)),
            Some(b'-' | b'0'..=b'9') => self.number(),
            Some(b'N' | b'I') => Err(MergeError::Float),
            _ => Err(self.error()),
        }
    }

    fn nested(&mut self, parse: fn(&mut Self) -> Result<PyValue, MergeError>) -> Result<PyValue, MergeError> {
        if self.depth >= MAX_DEPTH {
            return Err(self.error());
        }

        self.depth += 1;

        let parsed = parse(self);

        self.depth -= 1;
        parsed
    }

    fn object(&mut self) -> Result<PyValue, MergeError> {
        let mut dict = PyDict::default();

        self.at += 1;

        if self.eat(b'}') {
            return Ok(PyValue::Dict(dict));
        }

        loop {
            self.skip_whitespace();

            if self.bytes.get(self.at) != Some(&b'"') {
                return Err(self.error());
            }

            let key = self.string()?;

            self.expect(b':')?;

            let value = self.value()?;

            dict.insert(key, value);

            if self.eat(b'}') {
                return Ok(PyValue::Dict(dict));
            }

            self.expect(b',')?;
        }
    }

    fn array(&mut self) -> Result<PyValue, MergeError> {
        let mut items = Vec::new();

        self.at += 1;

        if self.eat(b']') {
            return Ok(PyValue::List(items));
        }

        loop {
            items.push(self.value()?);

            if self.eat(b']') {
                return Ok(PyValue::List(items));
            }

            self.expect(b',')?;
        }
    }

    fn number(&mut self) -> Result<PyValue, MergeError> {
        let start = self.at;

        if self.bytes[self.at] == b'-' {
            self.at += 1;
        }

        let digits = self.at;

        while self.bytes.get(self.at).is_some_and(u8::is_ascii_digit) {
            self.at += 1;
        }

        let count = self.at - digits;

        if count == 0 {
            return Err(if self.bytes.get(self.at) == Some(&b'I') { MergeError::Float } else { self.error() });
        }

        if matches!(self.bytes.get(self.at), Some(b'.' | b'e' | b'E')) {
            return Err(MergeError::Float);
        }

        if count > 1 && self.bytes[digits] == b'0' {
            return Err(self.error());
        }

        let text = std::str::from_utf8(&self.bytes[start..self.at]).map_err(|_| self.error())?;

        Ok(PyValue::Int(if text == "-0" { "0".to_owned() } else { text.to_owned() }))
    }

    fn hex4(&mut self) -> Result<u16, MergeError> {
        let digits = self.bytes.get(self.at..self.at + 4).ok_or_else(|| self.error())?;
        let text = std::str::from_utf8(digits).map_err(|_| self.error())?;
        let unit = u16::from_str_radix(text, 16).map_err(|_| self.error())?;

        self.at += 4;

        Ok(unit)
    }

    fn string(&mut self) -> Result<String, MergeError> {
        let mut text = String::new();

        self.at += 1;

        loop {
            let byte = *self.bytes.get(self.at).ok_or_else(|| self.error())?;

            self.at += 1;

            match byte {
                b'"' => return Ok(text),
                b'\\' => {
                    let escape = *self.bytes.get(self.at).ok_or_else(|| self.error())?;

                    self.at += 1;
                    text.push(match escape {
                        b'"' => '"',
                        b'\\' => '\\',
                        b'/' => '/',
                        b'b' => '\u{8}',
                        b'f' => '\u{c}',
                        b'n' => '\n',
                        b'r' => '\r',
                        b't' => '\t',
                        b'u' => char::from_u32(u32::from(self.hex4()?)).filter(char::is_ascii).ok_or(MergeError::NonAscii)?,
                        _ => return Err(self.error()),
                    });
                }
                0x00..=0x1f => return Err(self.error()),
                0x80..=0xff => return Err(MergeError::NonAscii),
                _ => text.push(char::from(byte)),
            }
        }
    }
}

pub fn parse(bytes: &[u8]) -> Result<PyValue, MergeError> {
    let mut parser = Parser { bytes, at: 0, depth: 0 };
    let value = parser.value()?;

    parser.skip_whitespace();

    if parser.at == bytes.len() {
        Ok(value)
    } else {
        Err(parser.error())
    }
}

fn write_string(out: &mut String, text: &str) {
    out.push('"');

    for character in text.chars() {
        match character {
            '"' => out.push_str("\\\""),
            '\\' => out.push_str("\\\\"),
            '\n' => out.push_str("\\n"),
            '\r' => out.push_str("\\r"),
            '\t' => out.push_str("\\t"),
            '\u{8}' => out.push_str("\\b"),
            '\u{c}' => out.push_str("\\f"),
            control if u32::from(control) < 0x20 => out.push_str(&format!("\\u{:04x}", u32::from(control))),
            other => out.push(other),
        }
    }

    out.push('"');
}

fn write_entries<'a>(out: &mut String, orders: &KeyOrders, entries: impl IntoIterator<Item = (&'a str, &'a PyValue)>) -> Result<(), MergeError> {
    out.push('{');

    for (index, (key, value)) in entries.into_iter().enumerate() {
        if index > 0 {
            out.push(',');
        }

        write_string(out, key);
        out.push(':');
        write_value(out, orders, value)?;
    }

    out.push('}');

    Ok(())
}

fn write_value(out: &mut String, orders: &KeyOrders, value: &PyValue) -> Result<(), MergeError> {
    match value {
        PyValue::Null => out.push_str("null"),
        PyValue::Bool(flag) => out.push_str(if *flag { "true" } else { "false" }),
        PyValue::Int(digits) => out.push_str(digits),
        PyValue::Str(text) => write_string(out, text),
        PyValue::List(items) => {
            out.push('[');

            for (index, item) in items.iter().enumerate() {
                if index > 0 {
                    out.push(',');
                }

                write_value(out, orders, item)?;
            }

            out.push(']');
        }
        PyValue::Dict(dict) => write_entries(out, orders, orders.order(dict)?)?,
    }

    Ok(())
}

fn hex_value(key: &str) -> Result<u128, MergeError> {
    let plain = !key.is_empty() && key.len() <= MAX_HEX_KEY_DIGITS && key.bytes().all(|byte| byte.is_ascii_hexdigit());

    plain.then(|| u128::from_str_radix(key, 16).ok()).flatten().ok_or_else(|| MergeError::BaseKey(key.to_owned()))
}

pub struct ResourceMap {
    items: PyDict,
    mapped: Vec<String>,
}

impl ResourceMap {
    pub fn from_game(bytes: &[u8]) -> Result<Self, MergeError> {
        let text = String::from_utf8_lossy(bytes).replace(",}", "}");

        match parse(text.as_bytes())? {
            PyValue::Dict(items) => Ok(Self { items, mapped: Vec::new() }),
            _ => Err(MergeError::BaseShape),
        }
    }

    pub fn add_config(&mut self, bytes: &[u8]) -> Result<(), MergeError> {
        let config = parse(bytes)?;

        if !config.is_truthy() {
            return Ok(());
        }

        let PyValue::List(items) = config else {
            return Err(MergeError::ConfigShape);
        };

        for item in items {
            let PyValue::Dict(mut item) = item else {
                return Err(MergeError::ConfigShape);
            };
            let Some(item_id) = item.remove("itemID") else {
                continue;
            };
            let PyValue::Str(item_id) = item_id else {
                return Err(MergeError::ConfigShape);
            };

            if self.mapped.contains(&item_id) {
                continue;
            }

            self.mapped.push(item_id);
            self.items.insert(format!("{:x}", self.items.len()), PyValue::Dict(item));
        }

        Ok(())
    }

    pub fn learn_from(&self, orders: &mut KeyOrders, written: &[u8]) -> Result<(), MergeError> {
        let Ok(PyValue::Dict(written)) = parse(written) else {
            return Ok(());
        };
        let items: BTreeMap<&str, &PyValue> = self.items.entries.iter().map(|(key, value)| (key.as_str(), value)).collect();

        for (key, other) in &written.entries {
            if let Some(ours) = items.get(key.as_str()).filter(|ours| ours.same_content(other)) {
                orders.learn(ours, other)?;
            }
        }

        Ok(())
    }

    pub fn dumps(&self, orders: &KeyOrders) -> Result<String, MergeError> {
        let mut sorted: BTreeMap<u128, (&str, &PyValue)> = BTreeMap::new();

        for (key, value) in &self.items.entries {
            if sorted.insert(hex_value(key)?, (key, value)).is_some() {
                return Err(MergeError::BaseKey(key.clone()));
            }
        }

        let mut out = String::new();

        write_entries(&mut out, orders, sorted.into_values())?;

        if out.is_ascii() {
            Ok(out)
        } else {
            Err(MergeError::NonAscii)
        }
    }
}
