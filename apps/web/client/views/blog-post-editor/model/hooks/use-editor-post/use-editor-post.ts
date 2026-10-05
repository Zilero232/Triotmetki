'use client';

import { useQuery } from '@tanstack/react-query';

import { useBlogEditorAccess } from '@/features/blog/editor-access';
import { isNotFoundError } from '@/shared/api/source';
import { QUERY_KEYS } from '@/shared/constants';

import { getEditorPost } from '../../../api';

export const useEditorPost = (id: string | undefined) => {
  const { viewerId, canEdit } = useBlogEditorAccess();
  const { data, isPending, isFetching, error, refetch } = useQuery({
    queryKey: QUERY_KEYS.blog.editor.post({ viewerId, id: id ?? '' }),
    queryFn: ({ signal }) => getEditorPost({ id: id ?? '', signal }),
    enabled: id !== undefined && canEdit
  });

  return {
    isEdit: id !== undefined,
    post: id === undefined ? null : (data ?? null),
    isPostPending: id !== undefined && isPending,
    isNotFound: isNotFoundError(error),
    isError: error !== null && !data,
    isRetrying: isFetching,
    retry: () => void refetch()
  };
};
