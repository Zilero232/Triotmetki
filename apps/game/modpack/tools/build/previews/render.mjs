// Draws each HUD component's preview with the built HUD page in Chromium and saves it as a 16:9 catalog preview.
// The panel is scaled to fit the frame, but never below minScale for its height or minWidthScale for its width, so its
// body text stays legible in the manager's card: a taller panel shows its top rows, a wider one (team_hp's full-width
// bars) its middle, faded out at the cut edges; a preview anchored at its start (states.py PREVIEW_ANCHORS) keeps its left
// edge and fades out on the right only.
// usage: node render.mjs <hud.html> <job.json> <out dir>   (job.json: tools/build/previews/states.py `job()`)
import { chromium } from '@playwright/test';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const FRAME = { width: 640, height: 360, pixelRatio: 2 };
const FIT = { width: 0.92, height: 0.84, minScale: 2.2, minWidthScale: 1.6, maxScale: 4 };
const FADE_PX = 72;
const SETTLE_MS = 1200;
const IMAGE_HOST = 'http://img.local/';
const PANEL = '#hud button[aria-label]';
const BACKDROPS = {
  battle: '#20241d',
  hangar: '#22252a'
};

const bridge = ({ state, scale, viewport }) => `<script>
window.model = { state: ${JSON.stringify(state)}, send: function () {} };
window.engine = { whenReady: Promise.resolve(), on: function () {} };
window.viewEnv = {
  getClientSizePx: function () { return { width: ${viewport.width}, height: ${viewport.height} }; },
  addDataChangedCallback: function () { return 1; },
  setInputArea: function () {},
  resizeViewPx: function () {}
};
new MutationObserver(function (changes) {
  changes.forEach(function (change) {
    change.addedNodes.forEach(function (node) {
      (node.querySelectorAll ? Array.from(node.querySelectorAll('img')) : []).concat(node.tagName === 'IMG' ? [node] : []).forEach(function (image) {
        var source = image.getAttribute('src') || '';
        if (source.indexOf('img://') === 0) { image.setAttribute('src', '${IMAGE_HOST}' + source.slice(6)); }
      });
    });
  });
}).observe(document, { subtree: true, childList: true });
</script><style>html { font-size: ${scale}px; }</style>`;

const backdrop = (name) => `<div style="position:fixed;inset:0;z-index:-1;background:${BACKDROPS[name]}"></div>`;

const fadeStyle = 'position:fixed;z-index:2147483647;pointer-events:none';

const fades = ({ name, viewport, left }) => {
  const colour = BACKDROPS[name];
  const bottom =
    viewport.height > FRAME.height
      ? `<div style="${fadeStyle};left:0;right:0;top:${FRAME.height - FADE_PX}px;height:${FADE_PX}px;background:linear-gradient(180deg, transparent, ${colour})"></div>`
      : '';

  const cutLeft = left > 0 && left * 2 + FRAME.width >= viewport.width;
  const cutRight = left + FRAME.width < viewport.width;
  const sides =
    (cutLeft
      ? `<div style="${fadeStyle};top:0;bottom:0;left:${left}px;width:${FADE_PX}px;background:linear-gradient(270deg, transparent, ${colour})"></div>`
      : '') +
    (cutRight
      ? `<div style="${fadeStyle};top:0;bottom:0;left:${left + FRAME.width - FADE_PX}px;width:${FADE_PX}px;background:linear-gradient(90deg, transparent, ${colour})"></div>`
      : '');

  return bottom + sides;
};

const pageFile = ({ html, preview, scale, viewport, left, directory }) => {
  const overlays = `${backdrop(preview.backdrop)}${fades({ name: preview.backdrop, viewport, left })}`;
  const page = html.replace('<head>', `<head>${bridge({ state: preview.state, scale, viewport })}`).replace('<body>', `<body>${overlays}`);
  const file = path.join(directory, `${preview.id}.html`);

  writeFileSync(file, page);

  return pathToFileURL(file).href;
};

const panelSize = async (tab) => {
  await tab.waitForTimeout(SETTLE_MS);

  return tab.$eval(PANEL, (element) => ({ width: element.offsetWidth, height: element.offsetHeight }));
};

const fitScale = ({ width, height }) =>
  Math.min(
    FIT.maxScale,
    Math.max(FIT.minWidthScale, (FRAME.width * FIT.width) / Math.max(width, 1)),
    Math.max(FIT.minScale, (FRAME.height * FIT.height) / Math.max(height, 1))
  );

const evenCeil = (value) => Math.ceil(value / 2) * 2;

const viewportFor = ({ width, height }, scale) => ({
  width: Math.max(FRAME.width, evenCeil(width * scale + FRAME.width * (1 - FIT.width))),
  height: Math.max(FRAME.height, Math.ceil(height * scale + FRAME.height * (1 - FIT.height)))
});

const frameLeft = ({ preview, size, scale, viewport }) => {
  const centred = (viewport.width - FRAME.width) / 2;

  if (preview.anchor !== 'start') {
    return centred;
  }

  return Math.min(centred, Math.max(0, Math.floor((viewport.width - size.width * scale - FRAME.width * (1 - FIT.width)) / 2)));
};

const serveImages = async (tab, images) => {
  await tab.route(`${IMAGE_HOST}**`, (route) => {
    const file = images[decodeURIComponent(route.request().url().slice(IMAGE_HOST.length))];

    return file ? route.fulfill({ path: file, contentType: 'image/png' }) : route.fulfill({ status: 404 });
  });
};

const render = async ({ tab, html, preview, out, directory }) => {
  await tab.setViewportSize({ width: FRAME.width, height: FRAME.height });
  await tab.goto(pageFile({ html, preview, scale: 1, viewport: FRAME, left: 0, directory }));
  const size = await panelSize(tab);
  const scale = fitScale(size);
  const viewport = viewportFor(size, scale);
  const left = frameLeft({ preview, size, scale, viewport });

  await tab.setViewportSize(viewport);
  await tab.goto(pageFile({ html, preview, scale, viewport, left, directory }));
  await panelSize(tab);

  await tab.screenshot({
    path: path.join(out, `${preview.id}.png`),
    clip: { x: left, y: 0, width: FRAME.width, height: FRAME.height }
  });
};

const main = async ([htmlPath, jobPath, out]) => {
  const html = readFileSync(htmlPath, 'utf8');
  const job = JSON.parse(readFileSync(jobPath, 'utf8'));
  const directory = path.join(tmpdir(), 'otmetki-preview-pages');

  mkdirSync(out, { recursive: true });
  mkdirSync(directory, { recursive: true });

  const browser = await chromium.launch();
  const tab = await browser.newPage({ viewport: { width: FRAME.width, height: FRAME.height }, deviceScaleFactor: FRAME.pixelRatio });

  await serveImages(tab, job.images);

  for (const preview of job.previews) {
    await render({ tab, html, preview, out, directory });
    process.stdout.write(`Rendered ${preview.id}\n`);
  }

  await browser.close();
};

main(process.argv.slice(2)).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
