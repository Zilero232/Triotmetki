use std::collections::HashMap;

pub const MAGIC: u32 = 0x62A1_4E45;
pub const VERSION: u8 = 0;
pub const OFFSET_MASK: u32 = 0x0FFF_FFFF;
pub const TYPE_SHIFT: u32 = 28;
pub const HEADER_LENGTH: usize = 5;
pub const DESCRIPTOR_LENGTH: usize = 4;
pub const CHILD_DESCRIPTOR_LENGTH: usize = 6;
pub const FLOAT_LENGTH: usize = 4;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DataType {
    Element = 0,
    String = 1,
    Int = 2,
    Floats = 3,
    Bool = 4,
    Blob = 5,
    Encrypted = 6,
}

impl DataType {
    fn from_bits(bits: u32) -> Result<Self, PackedXmlError> {
        match bits {
            0 => Ok(Self::Element),
            1 => Ok(Self::String),
            2 => Ok(Self::Int),
            3 => Ok(Self::Floats),
            4 => Ok(Self::Bool),
            5 => Ok(Self::Blob),
            6 => Ok(Self::Encrypted),
            other => Err(PackedXmlError::UnknownType(other)),
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, thiserror::Error)]
pub enum PackedXmlError {
    #[error("not a packed XML file")]
    NotPacked,
    #[error("packed XML version {0} is not supported")]
    UnsupportedVersion(u8),
    #[error("the packed XML ends early")]
    Truncated,
    #[error("unknown packed XML type {0}")]
    UnknownType(u32),
    #[error("an encrypted packed XML value is not supported")]
    Encrypted,
    #[error("an element value cannot be of the element type")]
    ElementValue,
    #[error("a packed XML name index {0} is out of the table")]
    UnknownName(u16),
    #[error("an int of {0} bytes")]
    IntLength(usize),
    #[error("floats of {0} bytes")]
    FloatsLength(usize),
    #[error("a bool of {0} bytes")]
    BoolLength(usize),
    #[error("descriptor offsets go backwards")]
    Offsets,
    #[error("the name {0:?} is not latin-1")]
    Name(String),
    #[error("the packed XML is too large to encode")]
    TooLarge,
}

#[derive(Debug, Clone, PartialEq)]
pub enum Value {
    String(Vec<u8>),
    Int(i64),
    Floats(Vec<f32>),
    Bool(bool),
    Blob(Vec<u8>),
}

impl Value {
    pub fn data_type(&self) -> DataType {
        match self {
            Self::String(_) => DataType::String,
            Self::Int(_) => DataType::Int,
            Self::Floats(_) => DataType::Floats,
            Self::Bool(_) => DataType::Bool,
            Self::Blob(_) => DataType::Blob,
        }
    }

    pub fn as_text(&self) -> Option<&str> {
        match self {
            Self::String(bytes) => std::str::from_utf8(bytes).ok(),
            _ => None,
        }
    }

    fn encode(&self) -> Vec<u8> {
        match self {
            Self::String(bytes) | Self::Blob(bytes) => bytes.clone(),
            Self::Int(0) => Vec::new(),
            Self::Int(value) => int_bytes(*value),
            Self::Floats(values) => values.iter().flat_map(|value| value.to_le_bytes()).collect(),
            Self::Bool(false) => Vec::new(),
            Self::Bool(true) => vec![1],
        }
    }
}

fn int_bytes(value: i64) -> Vec<u8> {
    if let Ok(small) = i8::try_from(value) {
        small.to_le_bytes().to_vec()
    } else if let Ok(small) = i16::try_from(value) {
        small.to_le_bytes().to_vec()
    } else if let Ok(small) = i32::try_from(value) {
        small.to_le_bytes().to_vec()
    } else {
        value.to_le_bytes().to_vec()
    }
}

#[derive(Debug, Clone, PartialEq)]
pub struct Node {
    pub name: String,
    pub value: Value,
    pub children: Vec<Node>,
}

impl Node {
    pub fn leaf(name: &str, value: Value) -> Self {
        Self { name: name.to_owned(), value, children: Vec::new() }
    }

    #[cfg(test)]
    pub fn element(name: &str, value: Value, children: Vec<Node>) -> Self {
        Self { name: name.to_owned(), value, children }
    }

    pub fn child(&self, name: &str) -> Option<&Node> {
        self.children.iter().find(|child| child.name == name)
    }

    pub fn nth_child_mut(&mut self, name: &str, index: usize) -> Option<&mut Node> {
        self.children.iter_mut().filter(|child| child.name == name).nth(index)
    }

    pub fn walk_mut(&mut self, visit: &mut impl FnMut(&mut Node)) {
        visit(self);

        for child in &mut self.children {
            child.walk_mut(visit);
        }
    }
}

#[derive(Debug, Clone, PartialEq)]
pub struct Document {
    pub names: Vec<String>,
    pub root: Node,
}

impl Document {
    #[cfg(test)]
    pub fn new(root: Node) -> Self {
        Self { names: Vec::new(), root }
    }
}

pub fn is_packed(bytes: &[u8]) -> bool {
    bytes.get(..DESCRIPTOR_LENGTH).is_some_and(|head| head == MAGIC.to_le_bytes())
}

struct Reader<'a> {
    data: &'a [u8],
    names: &'a [String],
}

impl Reader<'_> {
    fn slice(&self, start: usize, end: usize) -> Result<&[u8], PackedXmlError> {
        self.data.get(start..end).ok_or(PackedXmlError::Truncated)
    }

    fn u16_at(&self, at: usize) -> Result<u16, PackedXmlError> {
        let bytes = self.slice(at, at + 2)?;

        Ok(u16::from_le_bytes([bytes[0], bytes[1]]))
    }

    fn u32_at(&self, at: usize) -> Result<u32, PackedXmlError> {
        let bytes = self.slice(at, at + DESCRIPTOR_LENGTH)?;

        Ok(u32::from_le_bytes([bytes[0], bytes[1], bytes[2], bytes[3]]))
    }

    fn element(&self, at: usize, name: String) -> Result<Node, PackedXmlError> {
        let count = usize::from(self.u16_at(at)?);
        let own = self.u32_at(at + 2)?;
        let descriptors_at = at + 2 + DESCRIPTOR_LENGTH;
        let base = descriptors_at + count * CHILD_DESCRIPTOR_LENGTH;
        let own_end = (own & OFFSET_MASK) as usize;
        let value = match DataType::from_bits(own >> TYPE_SHIFT)? {
            DataType::Element => return Err(PackedXmlError::ElementValue),
            kind => decode_value(kind, self.slice(base, base + own_end)?)?,
        };
        let mut children = Vec::with_capacity(count);
        let mut previous = own_end;

        for index in 0..count {
            let descriptor_at = descriptors_at + index * CHILD_DESCRIPTOR_LENGTH;
            let name_index = self.u16_at(descriptor_at)?;
            let descriptor = self.u32_at(descriptor_at + 2)?;
            let end = (descriptor & OFFSET_MASK) as usize;
            let child_name = self.names.get(usize::from(name_index)).cloned().ok_or(PackedXmlError::UnknownName(name_index))?;

            if end < previous {
                return Err(PackedXmlError::Offsets);
            }

            let child = match DataType::from_bits(descriptor >> TYPE_SHIFT)? {
                DataType::Element => {
                    self.slice(base + previous, base + end)?;
                    self.element(base + previous, child_name)?
                }
                kind => Node::leaf(&child_name, decode_value(kind, self.slice(base + previous, base + end)?)?),
            };

            children.push(child);
            previous = end;
        }

        Ok(Node { name, value, children })
    }
}

fn decode_value(kind: DataType, raw: &[u8]) -> Result<Value, PackedXmlError> {
    match kind {
        DataType::String => Ok(Value::String(raw.to_vec())),
        DataType::Int => Ok(Value::Int(match raw.len() {
            0 => 0,
            1 => i64::from(i8::from_le_bytes([raw[0]])),
            2 => i64::from(i16::from_le_bytes([raw[0], raw[1]])),
            4 => i64::from(i32::from_le_bytes([raw[0], raw[1], raw[2], raw[3]])),
            8 => i64::from_le_bytes([raw[0], raw[1], raw[2], raw[3], raw[4], raw[5], raw[6], raw[7]]),
            other => return Err(PackedXmlError::IntLength(other)),
        })),
        DataType::Floats if raw.len() % FLOAT_LENGTH == 0 => {
            Ok(Value::Floats(raw.chunks_exact(FLOAT_LENGTH).map(|chunk| f32::from_le_bytes([chunk[0], chunk[1], chunk[2], chunk[3]])).collect()))
        }
        DataType::Floats => Err(PackedXmlError::FloatsLength(raw.len())),
        DataType::Bool => match raw {
            [] => Ok(Value::Bool(false)),
            [byte] => Ok(Value::Bool(*byte != 0)),
            _ => Err(PackedXmlError::BoolLength(raw.len())),
        },
        DataType::Blob => Ok(Value::Blob(raw.to_vec())),
        DataType::Encrypted => Err(PackedXmlError::Encrypted),
        DataType::Element => Err(PackedXmlError::ElementValue),
    }
}

fn latin1(bytes: &[u8]) -> String {
    bytes.iter().map(|byte| char::from(*byte)).collect()
}

pub fn decode(data: &[u8]) -> Result<Document, PackedXmlError> {
    if !is_packed(data) {
        return Err(PackedXmlError::NotPacked);
    }

    let version = *data.get(DESCRIPTOR_LENGTH).ok_or(PackedXmlError::Truncated)?;

    if version != VERSION {
        return Err(PackedXmlError::UnsupportedVersion(version));
    }

    let mut names = Vec::new();
    let mut at = HEADER_LENGTH;

    loop {
        let end = data.get(at..).and_then(|rest| rest.iter().position(|byte| *byte == 0)).ok_or(PackedXmlError::Truncated)? + at;

        if end == at {
            at += 1;
            break;
        }

        names.push(latin1(&data[at..end]));
        at = end + 1;
    }

    let root = Reader { data, names: &names }.element(at, String::new())?;

    Ok(Document { names, root })
}

struct Writer {
    names: Vec<String>,
    index: HashMap<String, u16>,
}

impl Writer {
    fn name_index(&mut self, name: &str) -> Result<u16, PackedXmlError> {
        if let Some(index) = self.index.get(name) {
            return Ok(*index);
        }

        let index = u16::try_from(self.names.len()).map_err(|_| PackedXmlError::TooLarge)?;

        self.names.push(name.to_owned());
        self.index.insert(name.to_owned(), index);

        Ok(index)
    }

    fn collect(&mut self, node: &Node) -> Result<(), PackedXmlError> {
        for child in &node.children {
            self.name_index(&child.name)?;
            self.collect(child)?;
        }

        Ok(())
    }

    fn element(&self, node: &Node, out: &mut Vec<u8>) -> Result<(), PackedXmlError> {
        let count = u16::try_from(node.children.len()).map_err(|_| PackedXmlError::TooLarge)?;
        let mut data = node.value.encode();
        let own = descriptor(node.value.data_type(), data.len())?;
        let mut descriptors = Vec::with_capacity(node.children.len() * CHILD_DESCRIPTOR_LENGTH);

        for child in &node.children {
            let kind = if child.children.is_empty() {
                data.extend(child.value.encode());
                child.value.data_type()
            } else {
                self.element(child, &mut data)?;
                DataType::Element
            };

            descriptors.extend(self.index[&child.name].to_le_bytes());
            descriptors.extend(descriptor(kind, data.len())?.to_le_bytes());
        }

        out.extend(count.to_le_bytes());
        out.extend(own.to_le_bytes());
        out.extend(descriptors);
        out.extend(data);

        Ok(())
    }
}

fn descriptor(kind: DataType, end: usize) -> Result<u32, PackedXmlError> {
    let end = u32::try_from(end).ok().filter(|end| *end <= OFFSET_MASK).ok_or(PackedXmlError::TooLarge)?;

    Ok(((kind as u32) << TYPE_SHIFT) | end)
}

pub fn encode(document: &Document) -> Result<Vec<u8>, PackedXmlError> {
    let mut writer = Writer { names: Vec::new(), index: HashMap::new() };

    for name in &document.names {
        writer.name_index(name)?;
    }

    writer.collect(&document.root)?;

    let mut out = MAGIC.to_le_bytes().to_vec();

    out.push(VERSION);

    for name in &writer.names {
        let bytes: Vec<u8> =
            name.chars().map(|c| u8::try_from(u32::from(c)).map_err(|_| PackedXmlError::Name(name.clone()))).collect::<Result<_, _>>()?;

        if bytes.is_empty() || bytes.contains(&0) {
            return Err(PackedXmlError::Name(name.clone()));
        }

        out.extend(bytes);
        out.push(0);
    }

    out.push(0);
    writer.element(&document.root, &mut out)?;

    Ok(out)
}
