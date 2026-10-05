import { useQuery } from '@tanstack/react-query';

import { QUERY_KEYS } from '@/shared/config';

import type { UseConflictsInput } from './use-conflicts.types';

import { getConflicts } from '../../../api';

export const useConflicts = ({ clientPath, enabled }: UseConflictsInput) =>
  useQuery({ queryKey: QUERY_KEYS.conflicts(clientPath), queryFn: () => getConflicts(clientPath), enabled: clientPath !== null && enabled });
