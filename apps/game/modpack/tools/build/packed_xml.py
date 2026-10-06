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
import struct

MAGIC = 0x62A14E45
TYPE_SHIFT = 28
OFFSET_MASK = (1 << TYPE_SHIFT) - 1
ELEMENT, STRING, INT, FLOATS, BOOL, BLOB = range(6)
INT_FORMATS = {1: '<b', 2: '<h', 4: '<i', 8: '<q'}
FLOAT_SIZE = 4
HEADER_SIZE = 5


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


def is_packed(data):
    return len(data) >= HEADER_SIZE and struct.unpack(str('<I'), data[:4])[0] == MAGIC


def _names(data):
    names = []
    position = HEADER_SIZE
    while True:
        end = data.index(b'\0', position)
        if end == position:
            return names, end + 1
        names.append(data[position:end].decode('latin-1'))
        position = end + 1


def _value(kind, raw):
    if kind == STRING:
        return raw.decode('latin-1')
    if kind == INT:
        return struct.unpack(str(INT_FORMATS[len(raw)]), raw)[0] if raw else 0
    if kind == FLOATS:
        return list(struct.unpack(str('<%df' % (len(raw) // FLOAT_SIZE)), raw))
    if kind == BOOL:
        return bool(raw) and raw[:1] != b'\0'
    if kind == BLOB:
        return base64.b64encode(raw).decode('ascii')
    raise PackedXmlError('unsupported value type %d' % kind)


def _descriptor(data, position):
    descriptor = struct.unpack(str('<I'), data[position:position + 4])[0]
    return descriptor >> TYPE_SHIFT, descriptor & OFFSET_MASK


def _element(data, names, position, name):
    count = struct.unpack(str('<H'), data[position:position + 2])[0]
    kind, own_end = _descriptor(data, position + 2)
    pairs = []
    cursor = position + 6
    for _ in range(count):
        index = struct.unpack(str('<H'), data[cursor:cursor + 2])[0]
        pairs.append((names[index], _descriptor(data, cursor + 2)))
        cursor += 6
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
    counts = {}
    for child in node.children:
        counts[child.name] = counts.get(child.name, 0) + 1
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
