import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { useTranslations } from 'use-intl';
import { z } from 'zod';

import { revealPath } from '@/entities/app-info';
import { useSelectedClient } from '@/entities/client';
import { QUERY_KEYS } from '@/shared/config';
import { useDisplayFormat, useErrorToast } from '@/shared/lib';

import type { ReportPart } from '../../../api';

import { prepareReport, saveReport, sendReport } from '../../../api';
import { REPORT } from '../../../config';

export const useReportForm = () => {
  const t = useTranslations('report');
  const showError = useErrorToast();
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

  const items = previewQuery.data?.items ?? [];
  const parts = items.filter((item) => !excluded.has(item.part)).map((item) => item.part);
  const previewId = previewQuery.data?.id ?? '';

  const reset = () => {
    setExcluded(new Set());
    form.reset({ message: '', consent: false });
  };

  const send = useMutation({
    mutationFn: (message: string) => sendReport({ previewId, parts, message }),
    onSuccess: (receipt) => {
      toast.success(t('sent', { id: receipt.id.slice(0, REPORT.receiptPrefixLength) }), { description: t('sentHint') });
      setOpen(false);
      reset();
    },
    onError: showError
  });

  const saveZip = useMutation({
    mutationFn: () =>
      saveReport({ previewId, parts, message: form.getValues('message'), text: { filter: t('zipFilter'), fileName: REPORT.fileName } }),
    onSuccess: (path) => {
      if (path) {
        toast.success(t('saved'), { description: path, action: { label: t('reveal'), onClick: () => void revealPath(path).catch(showError) } });
      }
    },
    onError: showError
  });

  return {
    open,
    previewQuery,
    rows: items.map((item) => ({
      part: item.part,
      name: item.name,
      size: kilobytes(item.bytes),
      truncated: item.truncated,
      redactions: item.redactions,
      text: item.text,
      checked: !excluded.has(item.part)
    })),
    register: form.register,
    errors: { message: form.formState.errors.message?.message, consent: form.formState.errors.consent?.message },
    consent: form.watch('consent'),
    canSubmit: parts.length > 0 && previewId !== '',
    isSending: send.isPending,
    isSaving: saveZip.isPending,
    onOpenChange: (next: boolean) => {
      setOpen(next);

      if (!next) {
        reset();
      }
    },
    onToggle: (part: ReportPart, checked: boolean) =>
      setExcluded((current) => (checked ? new Set([...current].filter((item) => item !== part)) : new Set([...current, part]))),
    onConsentChange: (checked: boolean) => form.setValue('consent', checked, { shouldValidate: true }),
    onSend: form.handleSubmit(({ message }) => send.mutate(message)),
    onSave: () => saveZip.mutate()
  };
};
