'use client';

import type { StreamerSettingsView } from '@otmetki/schemas';

import { useCopy } from '@siberiacancode/reactuse';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { settingsAsText, useSettingsFormatter } from '@/entities/streamer/settings';
import { downloadFile } from '@/shared/lib/data-file';

import { settingsFile } from '../../../lib/settings-page';

export const useSettingsActions = (view: StreamerSettingsView) => {
  const t = useTranslations('streamerSettings.page');
  const { label, valueText } = useSettingsFormatter();
  const { copied, copy } = useCopy();

  const onCopy = async () => {
    try {
      await copy(settingsAsText({ displayName: view.displayName, settings: view.settings, label, value: valueText }));
      toast.success(t('copied'));
    } catch {
      toast.error(t('copyFailed'));
    }
  };

  const onDownload = () => downloadFile(settingsFile(view));

  return { copied, onCopy, onDownload };
};
