'use client';

import type { SettingsGroupKey, SettingsSource } from '@otmetki/schemas';

import { useFormatter, useTranslations } from 'next-intl';
import { match } from 'ts-pattern';

import type { SettingsRow } from '../../../lib/settings-format';
import type { NumberTextInput, SettingsValueParts } from './use-settings-formatter.types';

import { SETTINGS_FORMAT, SETTINGS_VALUE } from '../../../config';
import { fieldMessage, isSettingsGroup, settingsOption, settingsValueView } from '../../../lib/settings-value';

export const useSettingsFormatter = () => {
  const t = useTranslations('streamerSettings');
  const format = useFormatter();

  const groupLabel = (group: SettingsGroupKey): string => t(`groups.${group}`);

  const fieldLabel = (path: string): string => {
    const message = fieldMessage(path);

    return message ? t(`fields.${message}`) : path;
  };

  const label = (key: string): string => (isSettingsGroup(key) ? groupLabel(key) : fieldLabel(key));

  const optionLabel = (value: string): string => {
    const option = settingsOption(value);

    return option ? t(`options.${option}`) : value;
  };

  const numberText = ({ value, digits }: NumberTextInput): string =>
    format.number(
      value,
      digits === null
        ? { maximumFractionDigits: SETTINGS_FORMAT.sensitivityDigits }
        : { minimumFractionDigits: digits, maximumFractionDigits: digits }
    );

  const valueParts = (row: SettingsRow): SettingsValueParts =>
    match(settingsValueView(row))
      .with({ kind: 'options' }, ({ options, isList }) => ({ items: options.map((option) => t(`options.${option}`)), isList }))
      .with({ kind: 'number' }, ({ value, unit, digits }) => {
        const text = numberText({ value, digits });

        return { items: [unit ? t(`units.${unit}`, { value: text }) : text], isList: false };
      })
      .with({ kind: 'list' }, ({ items }) => ({ items, isList: true }))
      .with({ kind: 'text' }, ({ text }) => ({ items: [text], isList: false }))
      .exhaustive();

  const valueText = (row: SettingsRow): string => valueParts(row).items.join(SETTINGS_FORMAT.listSeparator);

  const sourceLabel = (source: SettingsSource): string => t(`sources.${source}`);

  const checkedText = (checkedAt: string): string =>
    t('common.checkedAt', { date: format.dateTime(new Date(checkedAt), SETTINGS_VALUE.checkedDate) });

  return { groupLabel, fieldLabel, label, optionLabel, numberText, valueParts, valueText, sourceLabel, checkedText };
};
