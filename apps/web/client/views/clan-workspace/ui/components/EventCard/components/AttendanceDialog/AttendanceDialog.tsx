'use client';

import { ClipboardCheck } from 'lucide-react';
import { useTranslations } from 'next-intl';

import {
  Button,
  buttonVariants,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Select
} from '@/ui-kit';

import type { AttendanceDialogProps } from './AttendanceDialog.types';

import { useAttendanceEditor } from '../../../../../model/hooks';

import s from './AttendanceDialog.module.scss';

export const AttendanceDialog = ({ clanId, event, members }: AttendanceDialogProps) => {
  const t = useTranslations('clanWorkspace.attendance');
  const editor = useAttendanceEditor({ clanId, event, members });

  return (
    <Dialog open={editor.isOpen} onOpenChange={editor.onOpenChange}>
      <DialogTrigger className={buttonVariants({ variant: 'secondary', size: 'sm' })}>
        <ClipboardCheck aria-hidden size={14} />
        {t('open')}
      </DialogTrigger>
      <DialogContent className={s.dialog}>
        <DialogHeader>
          <DialogTitle>{t('title', { title: event.title })}</DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>
        <ul className={s.list}>
          {editor.rows.map((row) => (
            <li key={row.accountId} className={s.row}>
              <span className={s.name}>{row.nickname}</span>
              <Select
                aria-label={t('statusFor', { nickname: row.nickname })}
                items={editor.statuses.map((status) => ({ value: status, label: t(`statuses.${status}`) }))}
                value={row.status}
                onValueChange={(status) => editor.onStatusChange({ accountId: row.accountId, status })}
              />
            </li>
          ))}
        </ul>
        <DialogFooter>
          <DialogClose className={buttonVariants({ variant: 'ghost', size: 'sm' })}>{t('cancel')}</DialogClose>
          <Button disabled={editor.changed === 0 || editor.isSaving} size='sm' onClick={editor.onSave}>
            {t('save', { count: editor.changed })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
