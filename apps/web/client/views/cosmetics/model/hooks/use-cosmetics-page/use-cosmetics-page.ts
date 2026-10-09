'use client';

import type { CosmeticsInventory, EquipCosmeticsInput } from '@otmetki/schemas';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { groupBy } from 'remeda';
import { toast } from 'sonner';

import { getCosmetics } from '@/entities/player/cosmetics';
import { QUERY_KEYS } from '@/shared/constants';

import type { EquipSlotInput } from './use-cosmetics-page.types';

import { equipCosmetics, purchaseCosmetic } from '../../../api';
import { COSMETICS_PAGE } from '../../../config';
import { cosmeticAction } from '../../../lib/cosmetic-action';

export const useCosmeticsPage = () => {
  const t = useTranslations('cosmetics.toast');
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: QUERY_KEYS.me.cosmetics, queryFn: getCosmetics });

  const onSaved = (next: CosmeticsInventory) => {
    queryClient.setQueryData(QUERY_KEYS.me.cosmetics, next);
    void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.me.progression.shells });
    void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.cosmetics.all });
  };

  const purchase = useMutation({
    mutationFn: purchaseCosmetic,
    onSuccess: (next) => {
      onSaved(next);
      toast.success(t('bought'));
    },
    onError: () => toast.error(t('failed'))
  });

  const equip = useMutation({
    mutationFn: (input: EquipCosmeticsInput) => equipCosmetics(input),
    onSuccess: (next) => {
      onSaved(next);
      toast.success(t('equipped'));
    },
    onError: () => toast.error(t('failed'))
  });

  const inventory = query.data;
  const bySlot = groupBy(inventory?.items ?? [], (item) => item.slot);
  const isBusy = purchase.isPending || equip.isPending;

  return {
    query,
    sections: COSMETICS_PAGE.slots.map((slot) => ({
      slot,
      items: (bySlot[slot] ?? []).map((item) => ({
        item,
        action: inventory ? cosmeticAction({ item, equipped: inventory.equipped, isPlus: inventory.isPlus, balance: inventory.balance }) : 'plus'
      }))
    })),
    isBusy,
    onBuy: (code: string) => purchase.mutate(code),
    onEquip: ({ slot, code }: EquipSlotInput) => {
      const input: EquipCosmeticsInput = { [slot]: code };

      equip.mutate(input);
    }
  };
};
