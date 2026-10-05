import { createContext, use } from 'react';

export const PointerScopeContext = createContext(false);

export const usePointerScope = (): boolean => use(PointerScopeContext);
