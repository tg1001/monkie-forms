'use client';

import { useState, useEffect, useCallback } from 'react';
import '@midnight-ntwrk/dapp-connector-api';
import type { InitialAPI } from './types';
import {
  NetworkId,
  getZswapNetworkId,
  setNetworkId,
} from '@midnight-ntwrk/midnight-js-network-id';

interface WalletState {
  isInstalled: boolean;
  isConnected: boolean;
  isConnecting: boolean;
  walletName: string | null;
  walletRdns: string | null;
  shieldedAddress: string | null;
  unshieldedAddress: string | null;
  networkId: NetworkId | null;
  indexerUri: string | null;
  error: string | null;
  // FIX: Allow the connected API instance to be stored here, 
  // not just the InitialAPI. Use 'any' or import 'ConnectedAPI' from './types'
  walletApi: any | null; 
  contractAddress: string | null;
}

const USE_MOCK = process.env.NEXT_PUBLIC_MIDNIGHT_MOCK === 'true';

function getNetworkIdFromEnv(envValue: string | undefined): NetworkId {
  // FIX: Return string literals cast to NetworkId instead of accessing an object
  switch ((envValue ?? '').toLowerCase()) {
    case 'mainnet':
      return 'MainNet' as NetworkId;
    case 'testnet-02':
      return 'TestNet' as NetworkId;
    case 'preview':
      return 'Preview' as NetworkId;
    case 'devnet':
      return 'DevNet' as NetworkId;
    case 'undeployed':
      return 'Undeployed' as NetworkId;
    default:
      return 'TestNet' as NetworkId;
  }
}

const RAW_NETWORK = process.env.NEXT_PUBLIC_MIDNIGHT_NETWORK;
const TARGET_NETWORK: NetworkId = getNetworkIdFromEnv(RAW_NETWORK);
setNetworkId(TARGET_NETWORK);

console.log('[useWallet] Target network:', TARGET_NETWORK, 'Raw:', RAW_NETWORK);
console.log('[useWallet] Mock mode:', USE_MOCK);

function findLaceWallet(): InitialAPI | null {
  if (typeof window === 'undefined' || !window.midnight) return null;

  const providers = Object.values(window.midnight);
  if (providers.length === 0) return null;

  const lace = providers.find((p: any) => {
    if (!p || typeof p !== 'object') return false;
    const name = (p.name ?? '').toLowerCase();
    const rdns = (p.rdns ?? '').toLowerCase();
    return (
      name.includes('lace') ||
      rdns.includes('lace') ||
      rdns.includes('iohk') ||
      rdns.includes('iog')
    );
  });

  if (lace) return lace as InitialAPI;
  if (window.midnight.mnLace) return window.midnight.mnLace as InitialAPI;
  return providers[0] as InitialAPI;
}

function listAllProviders() {
  if (typeof window === 'undefined' || !window.midnight) return [];
  return Object.entries(window.midnight).map(([key, p]: [string, any]) => ({
    key,
    name: p?.name ?? '(no name)',
    rdns: p?.rdns ?? '(no rdns)',
    apiVersion: p?.apiVersion ?? '(no version)',
  }));
}

export function useWallet() {
  const [state, setState] = useState<WalletState>({
    isInstalled: false,
    isConnected: false,
    isConnecting: false,
    walletName: null,
    walletRdns: null,
    shieldedAddress: null,
    unshieldedAddress: null,
    networkId: null,
    indexerUri: null,
    error: null,
    walletApi: null,
    contractAddress: null,
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let attempts = 0;
    const maxAttempts = 20;
    const interval = setInterval(() => {
      attempts++;
      const providers = listAllProviders();
      console.log(`[useWallet] Detection attempt ${attempts}:`, providers);

      if (providers.length > 0) {
        console.log('[useWallet] Wallet provider(s) detected:', providers);
        setState((prev) => ({ ...prev, isInstalled: true }));
        clearInterval(interval);
      } else if (attempts >= maxAttempts) {
        console.log('[useWallet] No wallet detected after 10s');
        clearInterval(interval);
      }
    }, 500);

    return () => clearInterval(interval);
  }, []);

  const connect = useCallback(async () => {
    setState((prev) => ({ ...prev, isConnecting: true, error: null }));

    if (USE_MOCK) {
      console.log('[useWallet] Using mock wallet mode');
      setState({
        isInstalled: true,
        isConnected: true,
        isConnecting: false,
        walletName: 'Mock Wallet',
        walletRdns: 'mock',
        shieldedAddress: 'addr1_mock_shielded_address_1234567890abcdef',
        unshieldedAddress: 'addr1_mock_unshielded_address_abcdef1234567890',
        networkId: TARGET_NETWORK,
        indexerUri: 'https://mock-indexer.preview.nightfall.org',
        error: null,
        walletApi: null,
        contractAddress: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ?? null,
      });
      return;
    }

    try {
      const wallet = findLaceWallet();

      console.log('[useWallet] All providers:', listAllProviders());
      console.log('[useWallet] Selected wallet:', wallet ? {
        name: wallet.name,
        rdns: wallet.rdns,
        apiVersion: wallet.apiVersion,
        keys: Object.keys(wallet),
      } : null);

      if (!wallet) {
        const providers = listAllProviders();
        throw new Error(
          providers.length === 0
            ? 'No Midnight wallet found. Make sure Lace is installed and unlocked.'
            : `No compatible wallet found. Detected: ${providers.map((p) => p.name).join(', ')}`
        );
      }

      console.log('[useWallet] Calling wallet.connect with:', `"${TARGET_NETWORK}"`);
      setNetworkId(TARGET_NETWORK);
      const api = await wallet.connect(TARGET_NETWORK);
      console.log('[useWallet] wallet.connect() succeeded, api keys:', Object.keys(api));

      const config = await api.getConfiguration();
      console.log('[useWallet] config raw:', JSON.stringify(config));

      const status = await api.getConnectionStatus();
      console.log('[useWallet] status raw:', JSON.stringify(status));

      if (status.status !== 'connected') {
        throw new Error(
          `Wallet reported status "${status.status}". ` +
          `Wallet networkId: "${config.networkId}", app expects: "${TARGET_NETWORK}".`
        );
      }

      if (config.networkId !== TARGET_NETWORK) {
        throw new Error(
          `Network mismatch: app expects "${TARGET_NETWORK}" but wallet returned "${config.networkId}". ` +
          `Switch Lace to match and try again.`
        );
      }

      const shieldedData = await api.getShieldedAddresses();
      console.log('[useWallet] shieldedData:', JSON.stringify(shieldedData));

      let unshieldedAddress: string | null = null;
      try {
        const unshieldedData = await api.getUnshieldedAddress();
        unshieldedAddress = unshieldedData.unshieldedAddress;
        console.log('[useWallet] unshieldedAddress:', unshieldedAddress);
      } catch (e) {
        console.log('[useWallet] Unshielded address not available:', e);
      }

      setState({
        isInstalled: true,
        isConnected: true,
        isConnecting: false,
        walletName: wallet.name ?? 'Wallet',
        walletRdns: wallet.rdns ?? null,
        shieldedAddress: shieldedData.shieldedAddress,
        unshieldedAddress,
        networkId: config.networkId as NetworkId, // FIX: Corrected typo from MidnightNetworkId
        indexerUri: config.indexerUri,
        error: null,
        walletApi: api, // This now correctly sets without throwing TS errors
        contractAddress: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ?? null,
      });

    } catch (err: unknown) {
      const raw = err instanceof Error ? err : new Error(String(err));
      console.log('[useWallet] connect error raw message:', raw.message);
      console.log('[useWallet] connect error raw stack:', raw.stack);

      setState((prev) => ({
        ...prev,
        isConnecting: false,
        isConnected: false,
        error: raw.message,
      }));
    }
  }, []);

  const disconnect = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isConnected: false,
      walletName: null,
      walletRdns: null,
      shieldedAddress: null,
      unshieldedAddress: null,
      networkId: null,
      indexerUri: null,
      error: null,
      walletApi: null,
      contractAddress: null,
    }));
  }, []);

  return { ...state, connect, disconnect, targetNetwork: TARGET_NETWORK };
}