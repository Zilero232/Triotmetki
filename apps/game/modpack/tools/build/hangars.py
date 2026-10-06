# -*- coding: utf-8 -*-
"""The «Три отметки» hangar looks: recipes (hangars/looks/<id>/recipe.json) and their bundle (hangars/recipes.json).

A recipe holds only our values: which stock environment of which hangar space it starts from, the client builds it
was checked on, an optional sky (client texture paths) and a list of environment parameters to set. The modpack ships
the bundle in the code-less package net.triotmetki.hangar_looks; the manager applies it to the player's own client
files and writes a generated package on the player's PC (docs/specs/2026-10-06-custom-hangars.md §5.2, manager
tauri/src/hangars). This module bundles and checks them; hangars/schema/recipe.schema.json is the shape, the client
index (client_index.py) says which parameters and textures a build has.

    python tools/build/hangars.py --write   # rewrite hangars/recipes.json from the recipes
    python tools/build/hangars.py --check   # fail when a recipe is invalid or the bundle is stale
"""
from __future__ import absolute_import, division, print_function, unicode_literals

import argparse
import io
import os
import re
import sys

from fileio import json_text, read_json, write_text

try:
    import jsonschema
except ImportError:
    jsonschema = None

MODPACK_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
HANGARS_DIR = os.path.join(MODPACK_DIR, 'hangars')
LOOKS_DIR = os.path.join(HANGARS_DIR, 'looks')
SCHEMA = os.path.join(HANGARS_DIR, 'schema', 'recipe.schema.json')
BUNDLE = os.path.join(HANGARS_DIR, 'recipes.json')
PACKAGE_JSON = os.path.join(HANGARS_DIR, 'package.json')
RECIPE_FILE = 'recipe.json'
CLIENT_INDEX = 'client_%s.json'
LUT_DIR = os.path.join(MODPACK_DIR, 'assets', 'otmetki', 'hangar_looks', 'dds')
BUNDLE_SCHEMA_VERSION = 1
# The in-game paths of what the package ships: the bundle the manager reads and our colour tables
# (assets/assets.json set hangar_looks_luts).
BUNDLE_TARGET = 'res/mods/configs/otmetki/hangar_looks/recipes.json'
OUR_TEXTURES = re.compile(r'^system/maps/post_processing/cube/otmetki/([a-z0-9_]+)\.dds$')
ENVIRONMENT_PREFIX = 'otm_'
SKY_PARTS = ('deferred', 'forward')


def recipe_ids():
    if not os.path.isdir(LOOKS_DIR):
        return []
    return sorted(name for name in os.listdir(LOOKS_DIR) if os.path.isfile(os.path.join(LOOKS_DIR, name, RECIPE_FILE)))


def load_recipes():
    return [read_json(os.path.join(LOOKS_DIR, look_id, RECIPE_FILE)) for look_id in recipe_ids()]


def bundle(recipes=None):
    looks = sorted(load_recipes() if recipes is None else recipes, key=lambda recipe: recipe['id'])
    return {'schemaVersion': BUNDLE_SCHEMA_VERSION, 'looks': looks}


def package_info():
    return read_json(PACKAGE_JSON)


def client_index_path(version):
    return os.path.join(HANGARS_DIR, CLIENT_INDEX % version)


def load_client_index(version):
    return read_json(client_index_path(version))


def environment_name(recipe):
    return ENVIRONMENT_PREFIX + recipe['id']


def schema_problems(recipe):
    if jsonschema is None:
        return []
    validator = jsonschema.Draft7Validator(read_json(SCHEMA))
    where = recipe.get('id', '?') if isinstance(recipe, dict) else '?'
    return ['%s: %s' % (where, error.message) for error in validator.iter_errors(recipe)]


def is_compatible(kind, value):
    if kind.startswith('floats:'):
        count = int(kind.split(':')[1])
        values = value if isinstance(value, list) else [value]
        numbers = all(isinstance(item, (int, float)) and not isinstance(item, bool) for item in values)
        return numbers and len(values) == count
    expected = {'int': lambda: isinstance(value, int) and not isinstance(value, bool),
                'bool': lambda: isinstance(value, bool),
                'string': lambda: isinstance(value, type(u''))}
    return kind in expected and expected[kind]()


def texture_problem(path, index):
    ours = OUR_TEXTURES.match(path)
    if ours:
        is_built = os.path.isfile(os.path.join(LUT_DIR, ours.group(1) + '.dds'))
        return None if is_built else 'our texture %s is not built' % path
    known = set(texture.lower() for texture in index['textures'])
    return None if path.lower() in known else 'texture %s is not in client %s' % (path, index['client'])


def operation_problem(operation, leaves, index):
    path, value = operation['path'], operation['value']
    kind = leaves.get(path)
    if kind is None:
        return '%s is not a parameter of the base environment' % path
    if not is_compatible(kind, value):
        return '%s takes %s, got %r' % (path, kind, value)
    return texture_problem(value, index) if kind == 'string' else None


def set_problems(recipe, leaves, index):
    paths = [operation['path'] for operation in recipe['set']]
    found = ['duplicate path %s' % path for path in sorted(set(paths)) if paths.count(path) > 1]
    found.extend(operation_problem(operation, leaves, index) for operation in recipe['set'])
    return [problem for problem in found if problem]


def sky_problems(recipe, index):
    sky = recipe.get('sky', {})
    found = [texture_problem(sky[part], index) for part in SKY_PARTS if part in sky]
    return [problem for problem in found if problem]


def recipe_problems(recipe, index):
    """What makes a recipe unusable on the indexed client; the manager skips such a look the same way."""
    base = recipe['base']
    environments = index['environments'].get(base['space'], {})
    if base['environment'] not in environments:
        return ['%s: no environment %s in %s' % (recipe['id'], base['environment'], base['space'])]
    found = set_problems(recipe, environments[base['environment']], index) + sky_problems(recipe, index)
    if index['client'] not in recipe['clients']:
        found.append('not checked on client %s' % index['client'])
    return ['%s: %s' % (recipe['id'], problem) for problem in found]


def problems(recipes, index):
    found = []
    for look_id, recipe in zip(recipe_ids(), recipes):
        shape = schema_problems(recipe)
        if shape:
            found.extend(shape)
            continue
        if recipe['id'] != look_id:
            found.append('%s: id must be its folder name %s' % (recipe['id'], look_id))
        found.extend(recipe_problems(recipe, index))
    return found


def is_stale():
    if not os.path.isfile(BUNDLE):
        return True
    with io.open(BUNDLE, encoding='utf-8') as handle:
        return handle.read() != json_text(bundle(), True)


def parse_args(argv):
    parser = argparse.ArgumentParser(description='Check the hangar look recipes and their bundle')
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument('--write', action='store_true', help='rewrite hangars/recipes.json from the recipes')
    mode.add_argument('--check', action='store_true', help='fail on an invalid recipe or a stale bundle (default)')
    return parser.parse_args(argv)


def main(argv):
    args = parse_args(argv)
    recipes = load_recipes()
    index = load_client_index(package_info()['client'])
    found = problems(recipes, index)
    if found:
        sys.stderr.write('\n'.join(found) + '\n')
        return 1
    if args.write:
        write_text(BUNDLE, json_text(bundle(recipes), True))
        return 0
    if is_stale():
        sys.stderr.write('hangars/recipes.json is stale: python tools/build/hangars.py --write\n')
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
