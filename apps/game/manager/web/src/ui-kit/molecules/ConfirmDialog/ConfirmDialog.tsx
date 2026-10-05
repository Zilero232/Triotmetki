import type { ConfirmDialogProps } from './ConfirmDialog.types';

import { Button } from '../../atoms';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../Dialog';

export const ConfirmDialog = ({
  title,
  description,
  confirmLabel,
  cancelLabel,
  tone = 'default',
  isPending = false,
  trigger,
  open,
  onOpenChange,
  onConfirm
}: ConfirmDialogProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogTrigger render={trigger} />
    <DialogContent role='alertdialog'>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        {description && <DialogDescription>{description}</DialogDescription>}
      </DialogHeader>
      <DialogFooter>
        <DialogClose render={<Button variant='ghost'>{cancelLabel}</Button>} />
        <DialogClose
          render={
            <Button isPending={isPending} variant={tone === 'danger' ? 'danger' : 'primary'} onClick={onConfirm}>
              {confirmLabel}
            </Button>
          }
        />
      </DialogFooter>
    </DialogContent>
  </Dialog>
);
