import { useEffect, useState } from 'react';

import type { ArmorDrawReport, ArmorMapData, ArmorMode, ArmorReadoutData } from '@/entities/armor/armor-map';
import type { CameraMove } from '@/features/viewer/orbit-camera';

import { gameface } from '@/shared/api/gameface';
import { onDistinct } from '@/shared/lib/on-distinct';

import type { ArmorState, ArmorStatus } from '../../../lib/armor-protocol';
import type { ModulesPickResult } from '../../../lib/modules-pick';
import type { ScreenFraction } from '../../../lib/screen-point';

import { ARMOR_VIEWER } from '../../../config';
import {
  answerEscape,
  drawReportText,
  parseArmorHover,
  parseArmorMap,
  parseArmorState,
  parseArmorStatus,
  sendArmor
} from '../../../lib/armor-protocol';

const { properties } = ARMOR_VIEWER;

export const useArmorViewer = () => {
  const [state, setState] = useState<ArmorState | null>(null);
  const [map, setMap] = useState<ArmorMapData | null>(null);
  const [hover, setHover] = useState<ArmorReadoutData | null>(null);
  const [status, setStatus] = useState<ArmorStatus | null>(null);

  useEffect(() => {
    gameface.fitView();

    const takeState = onDistinct((raw: string | null) => {
      const next = parseArmorState(raw);

      if (next) {
        setState(next);
      }
    });

    const takeMap = onDistinct((raw: string | null) => setMap(parseArmorMap(raw)));
    const takeHover = onDistinct((raw: string | null) => setHover(parseArmorHover(raw)));
    const takeStatus = onDistinct((raw: string | null) => setStatus(parseArmorStatus(raw)));
    const takeEscape = onDistinct((raw: string | null) => {
      if (raw) {
        answerEscape();
      }
    });

    gameface.onDataChanged(() => {
      takeState(gameface.text(properties.state));
      takeMap(gameface.text(properties.map));
      takeHover(gameface.text(properties.hover));
      takeStatus(gameface.text(properties.status));
      takeEscape(gameface.text(properties.escape));
    });

    sendArmor({ command: 'ready' });
  }, []);

  return {
    state,
    map,
    hover,
    status,
    close: () => sendArmor({ command: 'close' }),
    move: (move: CameraMove) => sendArmor({ command: 'move', ...move }),
    hoverAt: (point: ScreenFraction) => sendArmor({ command: 'hover', ...point }),
    leave: () => sendArmor({ command: 'leave' }),
    pickMode: (mode: ArmorMode) => sendArmor({ command: 'mode', mode }),
    pickShell: (index: number) => sendArmor({ command: 'shell', index }),
    pickDistance: (metres: number) => sendArmor({ command: 'distance', m: metres }),
    pickTank: (cd: number) => sendArmor({ command: 'tank', cd }),
    pickModules: ({ turret, gun }: ModulesPickResult) => sendArmor({ command: 'modules', turret, gun }),
    pickAttacker: (cd: number) => sendArmor({ command: 'attacker', cd }),
    search: (text: string) => sendArmor({ command: 'search', text }),
    flyTo: (preset: string) => sendArmor({ command: 'camera', preset }),
    openSite: () => sendArmor({ command: 'site' }),
    describe: (text: string) => sendArmor({ command: 'diag', text }),
    reportDraw: (report: ArmorDrawReport) => sendArmor({ command: 'diag', text: drawReportText(report) })
  };
};
