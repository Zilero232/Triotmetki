import { useState } from 'react';

import type { UseTankSearchInput } from './use-tank-search.types';

export const useTankSearch = ({ garage, matches, onSearch }: UseTankSearchInput) => {
  const [text, setText] = useState('');

  const change = (next: string): void => {
    setText(next);
    onSearch(next);
  };

  const isSearching = text.trim() !== '';
  const rows = isSearching ? matches : garage;

  return {
    text,
    isSearching,
    rows,
    isEmpty: isSearching && rows.length === 0,
    change,
    clear: () => change('')
  };
};
