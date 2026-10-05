import type { PyValue } from '../../../python-literal/python-literal.types';
import type { ParseConditionsInput, PersonalMissionCondition, PersonalMissionJson } from '../personal-missions.types';

import { isPyDict } from '../../../python-literal/python-literal';
import { renderText } from '../localization/localization';
import { PERSONAL_MISSION_KEYS } from '../personal-missions.constants';

const symbol = (name: string): string => (name.split('.').pop() ?? name).toLowerCase();

const toJson = (value: PyValue | undefined): PersonalMissionJson => {
  if (value === undefined || value === null || typeof value !== 'object') {
    return value ?? null;
  }

  if (Array.isArray(value)) {
    return value.map(toJson);
  }

  if (value.kind === 'name') {
    return symbol(value.name);
  }

  if (value.kind === 'call') {
    return { call: symbol(value.name), ...Object.fromEntries(Object.entries(value.kwargs).map(([key, item]) => [key, toJson(item)])) };
  }

  return Object.fromEntries(Object.entries(value.entries).map(([key, item]) => [key, toJson(item)]));
};

const asRecord = (value: PersonalMissionJson): Record<string, PersonalMissionJson> =>
  typeof value === 'object' && value !== null && !Array.isArray(value) ? value : {};

const numberOf = (value: PersonalMissionJson | undefined): number | null => (typeof value === 'number' ? value : null);

const stringOf = (value: PersonalMissionJson | undefined): string | null => (typeof value === 'string' ? value : null);

const descriptionKind = (value: PyValue | undefined): string | null => {
  if (typeof value !== 'object' || value === null || Array.isArray(value) || value.kind !== 'call') {
    return null;
  }

  return PERSONAL_MISSION_KEYS.descriptionKind.exec(value.name)?.[1]?.toLowerCase() ?? symbol(value.name);
};

export const parseConditions = ({ mission, config, localize }: ParseConditionsInput): PersonalMissionCondition[] => {
  if (!isPyDict(config)) {
    return [];
  }

  return Object.entries(config.entries).flatMap(([progressId, raw]) => {
    if (!isPyDict(raw)) {
      return [];
    }

    const settings = asRecord(toJson(raw.entries.config));
    const description = asRecord(toJson(raw.entries.description));
    const params = asRecord(settings.params ?? null);
    const goal = numberOf(settings.goal) ?? numberOf(settings.totalGoal);
    const values = { ...params, ...settings, goal };
    const title = localize(PERSONAL_MISSION_KEYS.conditionTitle({ mission, progressId }));
    const text = localize(PERSONAL_MISSION_KEYS.conditionDescription({ mission, progressId }));

    return [
      {
        progressId,
        isMain: settings.isMain === true,
        isAward: settings.isAward !== false,
        template: stringOf(toJson(raw.entries.type)),
        display: descriptionKind(raw.entries.description),
        icon: stringOf(description.iconID) ?? stringOf(description.displayType),
        goal,
        params,
        title: title ?? null,
        description: text ? renderText({ template: text, values }) : null
      }
    ];
  });
};
