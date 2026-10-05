export const GUIDES = {
  maxBodyLength: 50_000,
  authorsLimit: 20,
  mineLimit: 200
} as const;

export const COMMENTS = {
  maxBodyLength: 4000,
  pageLimit: 100,
  targetIdPattern: /^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i
} as const;
