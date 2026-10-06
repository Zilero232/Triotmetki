"""Reads BigWorld packed XML, the binary form of the client's XML files (`environment.xml`, `environments.xml`, ...).

Layout (little-endian): u32 magic 0x62A14E45, one version byte, the element names as NUL-terminated strings ended
by an empty one, then the root element. An element is a u16 child count, its own descriptor and one (u16 name
index, descriptor) pair per child, followed by its data block. A descriptor is `type << 28 | end offset`; offsets
count from the start of the block, the element's own value comes first, each child takes the bytes up to its end
offset. Types: 0 element (recursive), 1 string, 2 int, 3 floats, 4 bool, 5 blob (its text form is base64).

The tooling only reads (client_index.py); the manager writes the generated files (apps/game/manager tauri/src/hangars).
"""
from __future__ import absolute_import, division, print_function, unicode_literals

import base64
import collections
import struct

MAGIC = 0x62A14E45
TYPE_SHIFT = 28
OFFSET_MASK = (1 << TYPE_SHIFT) - 1
ELEMENT, STRING, INT, FLOATS, BOOL, BLOB = range(6)
INT_FORMATS = {1: '<b', 2: '<h', 4: '<i', 8: '<q'}
FLOATS_FORMAT = '<%df'
FLOAT_SIZE = 4
HEADER_SIZE = 5
UINT16_FORMAT = '<H'
UINT32_FORMAT = '<I'
UINT16_SIZE = 2
UINT32_SIZE = 4
# A child entry: its u16 name index, then its u32 descriptor.
CHILD_ENTRY_SIZE = UINT16_SIZE + UINT32_SIZE
# An element starts with its u16 child count and its own u32 descriptor.
ELEMENT_HEADER_SIZE = UINT16_SIZE + UINT32_SIZE
TEXT_ENCODING = 'latin-1'


class PackedXmlError(ValueError):
    pass


class Node(object):

    def __init__(self, name, kind, value, children=()):
        self.name = name
        self.kind = kind
        self.value = value
        self.children = list(children)

    def child(self, name, index=0):
        found = [child for child in self.children if child.name == name]
        return found[index] if index < len(found) else None


def _uint16(data, position):
    return struct.unpack(str(UINT16_FORMAT), data[position:position + UINT16_SIZE])[0]


def _uint32(data, position):
    return struct.unpack(str(UINT32_FORMAT), data[position:position + UINT32_SIZE])[0]


def is_packed(data):
    return len(data) >= HEADER_SIZE and _uint32(data, 0) == MAGIC


def _names(data):
    names = []
    position = HEADER_SIZE
    while True:
        end = data.index(b'\0', position)
        if end == position:
            return names, end + 1
        names.append(data[position:end].decode(TEXT_ENCODING))
        position = end + 1


def _string(raw):
    return raw.decode(TEXT_ENCODING)


def _int(raw):
    if not raw:
        return 0
    return struct.unpack(str(INT_FORMATS[len(raw)]), raw)[0]


def _floats(raw):
    struct_format = FLOATS_FORMAT % (len(raw) // FLOAT_SIZE)
    return list(struct.unpack(str(struct_format), raw))


def _bool(raw):
    return bool(raw) and raw[:1] != b'\0'


def _blob(raw):
    return base64.b64encode(raw).decode('ascii')


DECODERS = {STRING: _string, INT: _int, FLOATS: _floats, BOOL: _bool, BLOB: _blob}


def _value(kind, raw):
    decoder = DECODERS.get(kind)
    if decoder is None:
        raise PackedXmlError('unsupported value type %d' % kind)
    return decoder(raw)


def _descriptor(data, position):
    descriptor = _uint32(data, position)
    return descriptor >> TYPE_SHIFT, descriptor & OFFSET_MASK


def _element(data, names, position, name):
    count = _uint16(data, position)
    kind, own_end = _descriptor(data, position + UINT16_SIZE)
    pairs = []
    cursor = position + ELEMENT_HEADER_SIZE
    for _ in range(count):
        index = _uint16(data, cursor)
        pairs.append((names[index], _descriptor(data, cursor + UINT16_SIZE)))
        cursor += CHILD_ENTRY_SIZE
    block = cursor
    node = Node(name, kind, _value(kind, data[block:block + own_end]))
    start = own_end
    for child_name, (child_kind, end) in pairs:
        if child_kind == ELEMENT:
            node.children.append(_element(data, names, block + start, child_name))
        else:
            node.children.append(Node(child_name, child_kind, _value(child_kind, data[block + start:block + end])))
        start = end
    return node


def decode(data):
    if not is_packed(data):
        raise PackedXmlError('not a packed XML file')
    names, position = _names(data)
    return _element(data, names, position, 'root')


def leaves(node, prefix=''):
    """(path, node) of every leaf; a name repeated among its siblings is addressed as `name[index]`, 0-based."""
    counts = collections.Counter(child.name for child in node.children)
    seen = {}
    for child in node.children:
        index = seen.get(child.name, 0)
        seen[child.name] = index + 1
        label = child.name if counts[child.name] == 1 else '%s[%d]' % (child.name, index)
        path = label if not prefix else '%s/%s' % (prefix, label)
        if child.children:
            for item in leaves(child, path):
                yield item
        else:
            yield path, child
