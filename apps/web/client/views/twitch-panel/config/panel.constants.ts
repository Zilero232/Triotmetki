export const TWITCH_PANEL = {
  helperScript: 'https://extension-files.twitch.tv/helper/v1/twitch-ext.min.js',
  panelScript: '/twitch-panel.js',
  refreshMs: 60_000,
  copyKeys: [
    'title',
    'session',
    'live',
    'noSession',
    'battles',
    'winRate',
    'avgDamage',
    'wn8',
    'marks',
    'closest',
    'noMarks',
    'open',
    'notConnected',
    'error'
  ]
} as const;

export const PANEL_STYLE = `
:root{color-scheme:dark;--bg:#111114;--panel:#18181d;--line:#2c2c32;--text:#ececf1;--dim:#9a9aa6;--accent:#d4b25a}
:root[data-theme=light]{color-scheme:light;--bg:#f6f6f8;--panel:#fff;--line:#dcdce2;--text:#16161a;--dim:#5e5e6a;--accent:#9c7a1f}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--text);font:13px/1.4 system-ui,-apple-system,"Segoe UI",sans-serif}
#panel{display:flex;flex-direction:column;gap:10px;padding:12px}
.head{display:flex;flex-direction:column;gap:2px}
.eyebrow{color:var(--accent);font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase}
.nick{font-size:18px}
.block{display:flex;flex-direction:column;gap:8px;padding:10px;border:1px solid var(--line);border-radius:8px;background:var(--panel)}
.block-title{margin:0;color:var(--dim);font-size:11px;font-weight:600;letter-spacing:.08em;text-transform:uppercase}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.stat{display:flex;flex-direction:column}
.stat-value{font-size:16px;font-weight:700;font-variant-numeric:tabular-nums}
.stat-label{color:var(--dim);font-size:11px}
.counts{display:flex;gap:8px}
.count{flex:1;padding:6px;border-radius:6px;background:var(--bg);text-align:center}
.mark{display:flex;flex-direction:column;gap:4px}
.mark-row{display:flex;justify-content:space-between;gap:8px}
.bar{height:4px;border-radius:2px;background:var(--line);overflow:hidden}
.bar>span{display:block;height:100%;background:var(--accent)}
.empty{margin:0;color:var(--dim)}
.open{color:var(--accent);font-weight:600;text-decoration:none}
.note{margin:0;color:var(--dim);font-size:10px}
`;
