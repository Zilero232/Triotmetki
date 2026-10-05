import type { LinkConfirmAnswer } from './link-code.types';

import { LINK_CODE } from '../../config/link-code.constants';
import { LINK_CONFIRM } from '../../config/link-confirm.constants';

const CODE_SHAPE = new RegExp(`^[${LINK_CODE.alphabet}]{${LINK_CODE.length}}$`, 'u');

export const LINK_CONFIRM_DATA = new RegExp(`^${LINK_CONFIRM.prefix}`, 'u');

export const normaliseLinkCode = (raw: string): string => raw.trim().toUpperCase().replaceAll(/\s+/gu, '');

export const looksLikeLinkCode = (raw: string): boolean => CODE_SHAPE.test(normaliseLinkCode(raw));

export const linkConfirmData = (answer: LinkConfirmAnswer): string =>
  answer.answer === 'yes' ? `${LINK_CONFIRM.prefix}${LINK_CONFIRM.yes}:${answer.code}` : `${LINK_CONFIRM.prefix}${LINK_CONFIRM.no}`;

export const parseLinkConfirm = (data: string): LinkConfirmAnswer | null => {
  if (data === `${LINK_CONFIRM.prefix}${LINK_CONFIRM.no}`) {
    return { answer: 'no' };
  }

  const yes = `${LINK_CONFIRM.prefix}${LINK_CONFIRM.yes}:`;

  if (!data.startsWith(yes)) {
    return null;
  }

  const code = data.slice(yes.length);

  return looksLikeLinkCode(code) ? { answer: 'yes', code: normaliseLinkCode(code) } : null;
};
