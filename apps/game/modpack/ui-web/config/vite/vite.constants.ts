import path from 'node:path';

const UI_WEB_ROOT = path.resolve(import.meta.dirname, '../..');

export const UI_BUILD = {
  root: UI_WEB_ROOT,
  source: path.resolve(UI_WEB_ROOT, 'src'),
  alias: '@',
  outDir: path.resolve(UI_WEB_ROOT, '../packages/ui/gameface'),
  hudMode: 'hud',
  advisorMode: 'advisor',
  viewerMode: 'viewer',
  armorMode: 'armor',
  pages: {
    dir: 'pages',
    settings: path.resolve(UI_WEB_ROOT, 'pages/index.html'),
    hud: path.resolve(UI_WEB_ROOT, 'pages/hud.html'),
    viewer: path.resolve(UI_WEB_ROOT, 'pages/viewer.html'),
    armor: path.resolve(UI_WEB_ROOT, 'pages/armor.html')
  },
  scripts: {
    advisor: { entry: path.resolve(UI_WEB_ROOT, 'src/advisor.ts'), file: 'preset_advisor.js' }
  },
  script: {
    target: 'chrome94'
  },
  dev: {
    mockEntry: '/src/dev.ts',
    page: '/pages/index.html'
  },
  html: {
    extension: '.html',
    moduleScript: /[ \t]*<script type="module"[^>]*>([\s\S]*?)<\/script>\n?/,
    bodyEnd: '</body>'
  },
  style: {
    target: 'chrome58',
    pixelsPerRem: 1,
    remProperties: ['*', '!text-shadow'],
    classPrefix: 'otmetki'
  },
  icon: {
    file: 'icon.png',
    size: 48,
    radius: 8,
    stroke: 2.6,
    mark: { inset: 9, viewBox: 24 },
    tokens: { background: 'color-bg-deep', accent: 'color-accent' }
  }
} as const;
