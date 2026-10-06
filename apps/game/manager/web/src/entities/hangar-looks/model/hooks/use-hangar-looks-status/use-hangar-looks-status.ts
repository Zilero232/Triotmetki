import { useQuery } from '@tanstack/react-query';

import { QUERY_KEYS } from '@/shared/config';

import { getHangarLooksStatus } from '../../../api';

export const useHangarLooksStatus = (clientPath: string | null) =>
  useQuery({ queryKey: QUERY_KEYS.hangarLooks(clientPath), queryFn: () => getHangarLooksStatus(clientPath), enabled: clientPath !== null });
