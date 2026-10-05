import { z } from 'zod';

import { REPLAY_UPLOAD } from '../../config/upload.constants';

export const modVisibilitySchema = z.enum(REPLAY_UPLOAD.modVisibilities);
