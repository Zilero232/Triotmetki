export type SignedHeader = {
  name: string;
  value: string;
};

export type SignedPrefixInput = {
  method: string;
  path: string;
  timestamp: string;
  nonce: string;
  headers?: readonly SignedHeader[];
};

export type SignedMessageInput = SignedPrefixInput & {
  body: Buffer;
};

export type FreshTimestampInput = {
  timestamp: string | undefined;
  now: Date;
};
