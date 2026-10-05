'use client';

import { useQuery } from '@tanstack/react-query';

import { useAuthSession } from '@/entities/auth/session';
import { getBlogEditorAccess } from '@/entities/blog/post';
import { QUERY_KEYS } from '@/shared/constants';

import { BLOG_ACCESS } from '../../../config';

export const useBlogEditorAccess = () => {
  const { data: session, isPending: isSessionPending } = useAuthSession();
  const viewerId = session?.user.id ?? null;
  const { data, isPending } = useQuery({
    queryKey: QUERY_KEYS.blog.access({ viewerId }),
    queryFn: ({ signal }) => getBlogEditorAccess(signal),
    enabled: viewerId !== null,
    staleTime: BLOG_ACCESS.staleMs
  });

  return {
    viewerId,
    isSignedIn: viewerId !== null,
    isPending: isSessionPending || (viewerId !== null && isPending),
    canEdit: data?.canEdit ?? false
  };
};
