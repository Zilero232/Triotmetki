export type DownloadStateInput = {
  isPending: boolean;
  isError: boolean;
  isPublished: boolean;
  hasManager: boolean;
};

export type DownloadState = {
  isAvailable: boolean;
  isPreparing: boolean;
};
