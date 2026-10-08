'use client';

import { usePlayerProfile } from '@/entities/player/profile';

export const useSessionPage = (nickname: string) => usePlayerProfile(nickname);
