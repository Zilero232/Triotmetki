export type TimingSafeEqualInput = {
  left: string;
  right: string;
};

export type HmacInput = {
  key: string | Buffer;
  data: string | Buffer;
};

export type VerifySignatureInput = {
  header: string | undefined;
  key: string | Buffer;
  body: string | Buffer;
};

export type MatchSignatureInput = {
  header: string | undefined;
  digest: string | undefined;
};
