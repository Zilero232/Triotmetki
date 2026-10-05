import { LANGUAGES } from '@/shared/i18n';

export const LANGUAGE_ITEMS = LANGUAGES.map((language) => ({ value: language, label: language.toUpperCase() }));
