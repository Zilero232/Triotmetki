"""SVG to PNG with resvg, drawn by rasterize.mjs on Node.

resvg has no Python 2.7 binding, while the modpack's Node toolchain already carries @resvg/resvg-js (the same engine),
so the 2.7 tooling (the catalog previews, tools/assets/render.py) hands it the SVG text and reads the PNG back.
"""
from __future__ import absolute_import, division, print_function, unicode_literals

import os
import shutil
import subprocess
import tempfile

import fileio

RENDERER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'rasterize.mjs')
NODE = 'node'


class RasterizeError(RuntimeError):
    pass


def svg_png(svg, width, font_dirs=None, font_family=None, resources_dir=None):
    """The PNG bytes of `svg` (SVG text) drawn `width` px wide; with `font_dirs` only those fonts, not the system's."""
    return svg_pngs([job(svg, width, font_dirs, font_family, resources_dir)])[0]


def job(svg, width, font_dirs=None, font_family=None, resources_dir=None):
    """One drawing for svg_pngs."""
    entry = {'svg': svg, 'width': width}
    if font_dirs:
        entry.update({'fontDirs': list(font_dirs), 'fontFamily': font_family})
    if resources_dir:
        entry['resourcesDir'] = resources_dir
    return entry


def svg_pngs(jobs):
    """The PNG bytes of every job, in order, from one Node run."""
    work = tempfile.mkdtemp(prefix='otmetki-rasterize-')
    try:
        outputs = [os.path.join(work, '%d.png' % index) for index in range(len(jobs))]
        planned = [dict(entry, out=out) for entry, out in zip(jobs, outputs)]
        _run([NODE, RENDERER, fileio.write_json(os.path.join(work, 'jobs.json'), planned)])
        return [_read(out) for out in outputs]
    finally:
        shutil.rmtree(work, ignore_errors=True)


def _read(path):
    with open(path, 'rb') as handle:
        return handle.read()


def _run(command):
    try:
        process = subprocess.Popen(command, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, universal_newlines=True)
    except OSError as error:
        raise RasterizeError('SVG rendering needs Node on PATH (bun install in the repo root): %s' % error)
    output, _ = process.communicate()
    if process.returncode != 0:
        raise RasterizeError('rasterize.mjs failed: %s' % output.strip())


def read_svg(path):
    with open(path, 'rb') as handle:
        return handle.read().decode('utf-8')

