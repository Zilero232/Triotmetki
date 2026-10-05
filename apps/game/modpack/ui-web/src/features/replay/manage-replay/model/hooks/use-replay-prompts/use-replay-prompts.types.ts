export type PendingKind = 'remove' | 'watch';

export type PendingAction = {
  kind: PendingKind;
  id: string;
};

export type RenameDraft = {
  id: string;
  value: string;
};
