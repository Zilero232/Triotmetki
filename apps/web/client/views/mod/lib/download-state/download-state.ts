import type { DownloadState, DownloadStateInput } from './download-state.types';

export const downloadState = ({ isPending, isError, isPublished, hasManager }: DownloadStateInput): DownloadState => {
  const isAnswered = !isPending && !isError;

  return {
    isAvailable: hasManager || isError,
    isPreparing: isAnswered && !isPublished
  };
};
