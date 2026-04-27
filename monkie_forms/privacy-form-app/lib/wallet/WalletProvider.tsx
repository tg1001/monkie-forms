// WalletProvider.tsx
'use client';

import { createContext, useContext, ReactNode } from 'react';
import { useWallet } from './useWallet';

type WalletContextType = ReturnType<typeof useWallet>;

const WalletContext = createContext<WalletContextType | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const wallet = useWallet();
  return (
    <WalletContext.Provider value={wallet}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWalletContext() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWalletContext must be inside WalletProvider');
  return ctx;
}