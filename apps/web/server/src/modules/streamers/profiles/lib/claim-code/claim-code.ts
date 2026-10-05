import { randomBytes } from 'node:crypto';

import type { BioHasCodeInput } from './claim-code.types';

import { CLAIM } from '../../config/claims.constants';

export const newClaimCode = (): string => `${CLAIM.codePrefix}${randomBytes(CLAIM.codeBytes).toString('hex')}`;

export const bioHasCode = ({ bio, code }: BioHasCodeInput): boolean => Boolean(bio?.toLowerCase().includes(code.toLowerCase()));
