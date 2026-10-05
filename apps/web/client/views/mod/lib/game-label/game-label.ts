import { MOD_PAGE } from '../../config';

export const gameLabel = (pattern: string): string => pattern.replace(MOD_PAGE.gameWildcard, '');
