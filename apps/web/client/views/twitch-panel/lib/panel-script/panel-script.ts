import type { TwitchPanel } from '@otmetki/schemas';

import type { PanelConfig, PanelElementInput, PanelStatInput, PanelWindow } from './panel-script.types';

export const runPanelScript = (): void => {
  const root = document.getElementById('panel');

  if (!root?.dataset.config) {
    return;
  }

  const config: PanelConfig = JSON.parse(root.dataset.config);
  const { copy } = config;
  const number = new Intl.NumberFormat(config.locale, { maximumFractionDigits: 0 });
  const percent = new Intl.NumberFormat(config.locale, { style: 'percent', maximumFractionDigits: 1 });
  const markPercent = new Intl.NumberFormat(config.locale, { style: 'percent', minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const el = ({ tag, className = '', text }: PanelElementInput) => {
    const node = document.createElement(tag);

    node.className = className;

    if (text !== undefined) {
      node.textContent = text;
    }

    return node;
  };

  const stat = ({ label, value }: PanelStatInput) => {
    const box = el({ tag: 'div', className: 'stat' });

    box.append(el({ tag: 'span', className: 'stat-value', text: value }), el({ tag: 'span', className: 'stat-label', text: label }));

    return box;
  };

  const footer = () => el({ tag: 'p', className: 'note', text: copy.attribution });
  const fail = () => root.replaceChildren(el({ tag: 'p', className: 'empty', text: copy.error }), footer());

  const sessionBlock = (session: TwitchPanel['session']) => {
    const block = el({ tag: 'section', className: 'block' });

    block.append(el({ tag: 'h2', className: 'block-title', text: session?.isOpen ? copy.live : copy.session }));

    if (!session || session.battles === 0) {
      block.append(el({ tag: 'p', className: 'empty', text: copy.noSession }));

      return block;
    }

    const grid = el({ tag: 'div', className: 'grid' });

    grid.append(
      stat({ label: copy.battles, value: number.format(session.battles) }),
      stat({ label: copy.winRate, value: percent.format(session.wins / session.battles) }),
      stat({ label: copy.avgDamage, value: number.format(session.avgDamage) }),
      stat({ label: copy.wn8, value: session.wn8 === null ? '—' : number.format(session.wn8) })
    );

    block.append(grid);

    return block;
  };

  const marksBlock = (marks: TwitchPanel['marks']) => {
    const block = el({ tag: 'section', className: 'block' });
    const counts = el({ tag: 'div', className: 'counts' });

    counts.append(
      el({ tag: 'span', className: 'count', text: `3 × ${marks.moe3}` }),
      el({ tag: 'span', className: 'count', text: `2 × ${marks.moe2}` }),
      el({ tag: 'span', className: 'count', text: `1 × ${marks.moe1}` })
    );

    block.append(el({ tag: 'h2', className: 'block-title', text: copy.marks }), counts);

    if (marks.closest.length === 0) {
      block.append(el({ tag: 'p', className: 'empty', text: copy.noMarks }));

      return block;
    }

    block.append(el({ tag: 'h2', className: 'block-title', text: copy.closest }));

    for (const line of marks.closest) {
      const mark = el({ tag: 'div', className: 'mark' });
      const row = el({ tag: 'div', className: 'mark-row' });
      const bar = el({ tag: 'div', className: 'bar' });
      const fill = el({ tag: 'span' });

      row.append(el({ tag: 'span', text: line.tankName }), el({ tag: 'strong', text: markPercent.format(line.percent / 100) }));
      fill.style.width = `${Math.max(0, Math.min(100, line.percent))}%`;
      bar.append(fill);
      mark.append(row, bar);
      block.append(mark);
    }

    return block;
  };

  const render = (data: TwitchPanel) => {
    const head = el({ tag: 'header', className: 'head' });
    const nodes = [head, sessionBlock(data.session), marksBlock(data.marks)];

    head.append(
      el({ tag: 'span', className: 'eyebrow', text: copy.title }),
      el({ tag: 'strong', className: 'nick', text: data.nickname ?? copy.notConnected })
    );

    if (data.profileUrl) {
      const link = Object.assign(document.createElement('a'), {
        className: 'open',
        textContent: copy.open,
        href: data.profileUrl,
        target: '_blank',
        rel: 'noreferrer'
      });

      nodes.push(link);
    }

    root.replaceChildren(...nodes, footer());
  };

  let channel = new URLSearchParams(window.location.search).get('channel');

  const load = () => {
    if (!channel) {
      fail();

      return;
    }

    fetch(`${config.apiUrl}/streamers/twitch-panel/${encodeURIComponent(channel)}`)
      .then((response): Promise<TwitchPanel> => (response.ok ? response.json() : Promise.reject(new Error(String(response.status)))))
      .then(render)
      .catch(fail);
  };

  const panelWindow: PanelWindow = window;
  const ext = panelWindow.Twitch?.ext;

  if (ext) {
    ext.onContext((context) => {
      if (context.theme) {
        document.documentElement.dataset.theme = context.theme;
      }
    });

    ext.onAuthorized((auth) => {
      channel = auth.channelId;
      load();
    });
  } else {
    load();
  }

  window.setInterval(load, config.refreshMs);
};
