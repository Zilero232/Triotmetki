export const DEV_IPC = {
  queryFlag: 'mock',
  defaultScenario: 'installed',
  scenarios: ['fresh', 'installed', 'update', 'migrate', 'offline', 'no-game'],
  statusByScenario: {
    fresh: 'not_installed',
    installed: 'up_to_date',
    update: 'update_available',
    migrate: 'migration_ready',
    offline: 'offline',
    'no-game': 'no_client'
  },
  presets: [
    {
      id: 'recommended',
      custom: false,
      title: { ru: 'Рекомендуемый', en: 'Recommended' },
      description: {
        ru: 'Основные панели боя и ангара — то, чем пользуется большинство игроков.',
        en: 'The main battle and hangar panels: what most players use.'
      }
    },
    {
      id: 'minimal',
      custom: false,
      title: { ru: 'Минимальный (FPS)', en: 'Minimal (FPS)' },
      description: {
        ru: 'Только отметка в бою, лампа и чистый ангар: минимум нагрузки на слабых ПК.',
        en: 'Only the in-battle MoE panel, the sixth sense lamp and the clean hangar: the lightest load for weak PCs.'
      }
    },
    {
      id: 'streamer',
      custom: false,
      title: { ru: 'Стример', en: 'Streamer' },
      description: {
        ru: 'Панели, которые интересно видеть зрителям: отметка, урон, перезарядка и оборудование, плюс режим стримера с клавишей «убрать панели».',
        en: 'Panels viewers like to see: MoE, damage, reload and equipment, plus the streamer mode with its “hide panels” key.'
      }
    },
    {
      id: 'custom',
      custom: true,
      title: { ru: 'Свой', en: 'Custom' },
      description: { ru: 'Отметьте компоненты сами.', en: 'Pick the components yourself.' }
    }
  ],
  presetMembers: {
    marks_panel: ['recommended', 'minimal', 'streamer'],
    damage_log: ['recommended', 'streamer'],
    hit_log: ['streamer']
  }
} as const;
