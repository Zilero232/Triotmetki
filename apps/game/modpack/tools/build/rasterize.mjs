// Draws SVG to PNG with resvg for the Python 2.7 tooling (tools/build/rasterize.py), which has no resvg of its own.
// Usage: node tools/build/rasterize.mjs <jobs.json>; each job is {svg, width, out, fontDirs?, fontFamily?, resourcesDir?}.
import { Resvg } from '@resvg/resvg-js';
import { readFileSync, writeFileSync } from 'node:fs';

const fontOptions = ({ fontDirs, fontFamily }) =>
  fontDirs ? { loadSystemFonts: false, fontDirs, defaultFontFamily: fontFamily, sansSerifFamily: fontFamily } : { loadSystemFonts: false };

const render = (job) => {
  const resvg = new Resvg(job.svg, {
    fitTo: { mode: 'width', value: job.width },
    font: fontOptions(job),
    resourcesDir: job.resourcesDir
  });

  writeFileSync(job.out, resvg.render().asPng());
};

JSON.parse(readFileSync(process.argv[2], 'utf8')).forEach(render);
