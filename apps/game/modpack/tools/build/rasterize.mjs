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
