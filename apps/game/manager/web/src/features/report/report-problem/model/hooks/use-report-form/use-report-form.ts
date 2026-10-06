import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslations } from 'use-intl';
import { z } from 'zod';

import { useSelectedClient } from '@/entities/client';
import { QUERY_KEYS } from '@/shared/config';
import { toggledSet, useDisplayFormat } from '@/shared/lib';

import type { ReportPart } from '../../../api';
import type { ReportToggleInput } from './use-report-form.types';

import { prepareReport } from '../../../api';
import { REPORT } from '../../../config';
import { includedParts, reportRows } from '../../../lib';
import { useSaveReport } from '../use-save-report';
import { useSendReport } from '../use-send-report';

export const useReportForm = () => {
  const t = useTranslations('report');
  const { kilobytes } = useDisplayFormat();
  const { clientPath } = useSelectedClient();
  const [open, setOpen] = useState(false);
  const [excluded, setExcluded] = useState<ReadonlySet<ReportPart>>(() => new Set());
  const schema = z.object({
    message: z.string().trim().max(REPORT.messageMaxLength, t('validation.message')),
    consent: z.boolean().refine(Boolean, t('validation.consent'))
  });

  const form = useForm({ resolver: zodResolver(schema), defaultValues: { message: '', consent: false } });
  const previewQuery = useQuery({
    queryKey: QUERY_KEYS.reportPreview(clientPath),
    queryFn: () => prepareReport(clientPath),
    enabled: open,
    staleTime: 0,
    gcTime: 0
  });

  const close = () => {
    setOpen(false);
    setExcluded(new Set());
    form.reset({ message: '', consent: false });
  };

  const send = useSendReport({ onSent: close });
  const saveZip = useSaveReport();
  const items = previewQuery.data?.items ?? [];
  const parts = includedParts({ items, excluded });
  const previewId = previewQuery.data?.id ?? '';

  return {
    open,
    previewQuery,
    rows: reportRows({ items, excluded, sizeOf: kilobytes }),
    register: form.register,
    errors: { message: form.formState.errors.message?.message, consent: form.formState.errors.consent?.message },
    consent: form.watch('consent'),
    canSubmit: parts.length > 0 && previewId !== '',
    isSending: send.isPending,
    isSaving: saveZip.isPending,
    onOpenChange: (next: boolean) => (next ? setOpen(true) : close()),
    onToggle: ({ part, checked }: ReportToggleInput) => setExcluded((current) => toggledSet({ set: current, item: part, isOn: !checked })),
    onConsentChange: (checked: boolean) => form.setValue('consent', checked, { shouldValidate: true }),
    onSend: form.handleSubmit(({ message }) => send.mutate({ previewId, parts, message })),
    onSave: () => saveZip.mutate({ previewId, parts, message: form.getValues('message') })
  };
};
