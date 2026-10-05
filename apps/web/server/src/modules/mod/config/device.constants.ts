export const MOD_DEVICE = {
  idPrefix: 'dev_',
  idBytes: 12,
  idPattern: /^dev_[\w-]{16}$/u,
  trackerPrefix: 'mod-device:',
  secretContext: 'otmetki-mod-device:',
  header: 'x-otmetki-device',
  signatureHeader: 'x-otmetki-signature',
  timestampHeader: 'x-otmetki-timestamp',
  nonceHeader: 'x-otmetki-nonce'
} as const;

export const MOD_REQUEST = {
  version: 'v2',
  maxSkewSeconds: 300,
  noncePattern: /^[\w-]{16,64}$/u,
  noncePrefix: 'otmetki:mod:nonce:',
  nonceTtlSeconds: 900
} as const;
