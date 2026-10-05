'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { useBlogEditorAccess } from '@/features/blog/editor-access';
import { QUERY_KEYS } from '@/shared/constants';

import { listEditorPosts, removeBlogPost } from '../../../api';

export const useEditorPosts = () => {
  const t = useTranslations('blog.editor.list');
  const queryClient = useQueryClient();
  const { viewerId, canEdit } = useBlogEditorAccess();
  const query = useQuery({
    queryKey: QUERY_KEYS.blog.editor.list({ viewerId }),
    queryFn: ({ signal }) => listEditorPosts(signal),
    enabled: canEdit
  });

  const remove = useMutation({
    mutationFn: removeBlogPost,
    onSuccess: () => {
      toast.success(t('deleted'));
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.blog.all });
    },
    onError: () => toast.error(t('deleteFailed'))
  });

  return {
    query,
    isRemoving: remove.isPending,
    onRemove: (id: string) => remove.mutate(id)
  };
};
