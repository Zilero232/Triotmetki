import { ShellApcrIcon, ShellApIcon, ShellHeatIcon, ShellHeIcon } from '@otmetki/icons';
import { BookMarked, ChevronsRight, CircleHelp, Fan, Gauge, House, Layers, LayoutGrid, ScanEye, Settings2, UserCog } from 'lucide-react';

export const PROMO_MOCK = {
  manager: {
    side: [
      { key: 'home', icon: House, isActive: false },
      { key: 'components', icon: LayoutGrid, isActive: true },
      { key: 'sets', icon: Layers, isActive: false },
      { key: 'profiles', icon: UserCog, isActive: false },
      { key: 'settings', icon: Settings2, isActive: false },
      { key: 'help', icon: CircleHelp, isActive: false }
    ],
    toggles: [
      { key: 'marksPanel', isOn: true },
      { key: 'teamHp', isOn: true },
      { key: 'damageLog', isOn: true },
      { key: 'crosshair', isOn: false }
    ],
    progress: 72
  },
  marks: {
    percent: 86.42,
    delta: 0.37,
    trend: [78.1, 79.4, 79, 80.2, 81.9, 81.4, 83, 84.6, 85.1, 86.42],
    thresholds: [
      { key: 'first', value: 65, isDone: true },
      { key: 'second', value: 85, isDone: true },
      { key: 'third', value: 95, isDone: false }
    ],
    damageToNext: 4870,
    battlesToNext: 23,
    chart: { width: 360, height: 64 }
  },
  teamHp: {
    sides: [
      { key: 'allies', hp: 14250, share: 67 },
      { key: 'enemies', hp: 9870, share: 47 }
    ],
    score: { allies: 9, enemies: 6 },
    tanks: {
      allies: [
        { id: 'a1', hp: 1 },
        { id: 'a2', hp: 0.82 },
        { id: 'a3', hp: 0.64 },
        { id: 'a4', hp: 0 },
        { id: 'a5', hp: 0.91 },
        { id: 'a6', hp: 0.4 },
        { id: 'a7', hp: 1 },
        { id: 'a8', hp: 0 },
        { id: 'a9', hp: 0.72 },
        { id: 'a10', hp: 0.55 },
        { id: 'a11', hp: 0.3 },
        { id: 'a12', hp: 1 },
        { id: 'a13', hp: 0 },
        { id: 'a14', hp: 0.86 },
        { id: 'a15', hp: 0.6 }
      ],
      enemies: [
        { id: 'e1', hp: 0 },
        { id: 'e2', hp: 0.35 },
        { id: 'e3', hp: 0 },
        { id: 'e4', hp: 0.8 },
        { id: 'e5', hp: 0 },
        { id: 'e6', hp: 0.62 },
        { id: 'e7', hp: 0 },
        { id: 'e8', hp: 1 },
        { id: 'e9', hp: 0 },
        { id: 'e10', hp: 0.44 },
        { id: 'e11', hp: 0.9 },
        { id: 'e12', hp: 0 },
        { id: 'e13', hp: 0 },
        { id: 'e14', hp: 0.7 },
        { id: 'e15', hp: 0.25 }
      ]
    }
  },
  damageLog: {
    totals: [
      { key: 'dealt', value: 3240 },
      { key: 'blocked', value: 1180 },
      { key: 'assisted', value: 860 }
    ],
    entries: [
      { id: 'a', shell: ShellApIcon, tankClass: 'heavyTank', damage: 390 },
      { id: 'b', shell: ShellApcrIcon, tankClass: 'mediumTank', damage: 412 },
      { id: 'c', shell: ShellHeatIcon, tankClass: 'AT-SPG', damage: 440 },
      { id: 'd', shell: ShellHeIcon, tankClass: 'lightTank', damage: 95 }
    ]
  },
  crosshair: {
    reload: {
      seconds: 7.4,
      clip: [
        { id: 'c1', isLoaded: true },
        { id: 'c2', isLoaded: true },
        { id: 'c3', isLoaded: true },
        { id: 'c4', isLoaded: false }
      ]
    },
    zoom: 8
  },
  gear: {
    equipment: [
      { key: 'turbocharger', icon: Gauge, mark: 'bonus' },
      { key: 'ventilation', icon: Fan, mark: undefined },
      { key: 'rammer', icon: ChevronsRight, mark: 'bonus' },
      { key: 'optics', icon: ScanEye, mark: undefined },
      { key: 'directive', icon: BookMarked, mark: undefined }
    ]
  },
  hits: {
    entries: [
      { id: 'a', tankClass: 'mediumTank', outcome: 'pen', damage: 240 },
      { id: 'b', tankClass: 'AT-SPG', outcome: 'ricochet', damage: 0 },
      { id: 'c', tankClass: 'heavyTank', outcome: 'noPen', damage: 0 },
      { id: 'd', tankClass: 'lightTank', outcome: 'crit', damage: 0 }
    ],
    blocked: 1180
  }
} as const;
