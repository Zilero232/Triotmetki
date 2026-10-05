export const BUILD_SHARE = {
  popularLimit: 10,
  publicWhere: { visibility: 'public', status: 'published' },
  order: {
    popular: [{ likesCount: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
    recent: [{ createdAt: 'desc' }, { id: 'desc' }]
  }
} as const;
