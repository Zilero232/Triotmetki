"""Build the component catalogue (components.json + previews) around the release packages.

Usage:
    python apps/game/modpack/tools/build/setupkit [--packages DIR] [--out DIR] [--strict] [--skip-artwork]

Writes <out>/components.json (default apps/game/modpack/dist/catalog) and <out>/previews/<id>.png, the files
the modpack manager downloads as a release's `catalog`. --packages is the folder
with the split .mtmod packages from tools/build/build.py (adds sha256/size to the manifest).
"""
from __future__ import absolute_import, division, print_function, unicode_literals

import argparse
import os
import sys

BUILD_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BUILD_DIR not in sys.path:
    sys.path.insert(0, BUILD_DIR)

import layout  # noqa: E402
from fileio import write_json  # noqa: E402
from setupkit import ASSETS_DIR, CATALOG_PATH, MODPACK_DIR  # noqa: E402
from setupkit.audio import copy_audio  # noqa: E402
from setupkit.manifest import catalog as catalog_module  # noqa: E402
from setupkit.manifest.generate import ManifestError, build_manifest  # noqa: E402

DEFAULT_OUT = os.path.join(MODPACK_DIR, 'dist', 'catalog')


def parse_args(argv=None):
    parser = argparse.ArgumentParser(
        description='Build the Three Marks component catalogue (components.json + previews)',
    )
    parser.add_argument('--packages', help='folder with the split .mtmod release packages')
    parser.add_argument('--out', default=DEFAULT_OUT, help='output folder')
    parser.add_argument(
        '--strict',
        action='store_true',
        help='fail when a package has no catalog entry or an entry has no package',
    )
    parser.add_argument(
        '--skip-artwork',
        action='store_true',
        help='do not render previews (needs Pillow and Node)',
    )
    return parser.parse_args(argv)


def generate(args):
    """components.json (+ previews); returns the manifest."""
    catalog = catalog_module.load(CATALOG_PATH, ASSETS_DIR)
    packages = layout.split_packages('root_init.py')
    manifest, warnings = build_manifest(packages, catalog, packages_dir=args.packages, strict=args.strict)
    for warning in warnings:
        print('WARNING: %s' % warning)

    manifest_path = write_json(os.path.join(args.out, 'components.json'), manifest.to_json())
    component_count = len(manifest.components)
    dependency_count = len(manifest.dependencies)
    print('Wrote %s (%d components, %d dependencies)' % (manifest_path, component_count, dependency_count))
    print('Copied %d audio previews' % len(copy_audio(manifest, catalog, MODPACK_DIR, args.out)))
    if not args.skip_artwork:
        from setupkit.artwork.render import render_previews
        print('Rendered %d previews' % len(render_previews(manifest, catalog, ASSETS_DIR, args.out)))
    return manifest


def main(argv=None):
    args = parse_args(argv)
    try:
        generate(args)
    except (catalog_module.CatalogError, ManifestError) as error:
        raise SystemExit('%s' % error)


if __name__ == '__main__':
    main()
