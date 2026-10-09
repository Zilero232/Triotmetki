import { nicknameSchema } from '@otmetki/schemas';
import * as z from 'zod';

export const nicknameFormSchema = z.object({ nickname: nicknameSchema });
