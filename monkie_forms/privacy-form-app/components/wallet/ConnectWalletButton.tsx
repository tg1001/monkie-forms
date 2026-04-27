'use client';

import { useState } from 'react';
import { useWalletContext } from '@/lib/wallet/WalletProvider';

export function ConnectWalletButton() {
  const {
    isInstalled,
    isConnected,
    isConnecting,
    walletName,
    shieldedAddress,
    unshieldedAddress,
    networkId,
    indexerUri,
    error,
    connect,
    disconnect,
  } = useWalletContext();

  const [showDropdown, setShowDropdown] = useState(false);

  const truncated = shieldedAddress
    ? `${shieldedAddress.slice(0, 8)}...${shieldedAddress.slice(-6)}`
    : '';

  if (isConnected && shieldedAddress) {
    return (
      <div className="relative">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <span className="w-2 h-2 bg-green-300 rounded-full animate-pulse" />
          <span>{walletName ?? 'Connected'}</span>
          <span className="font-mono opacity-80">{truncated}</span>
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showDropdown && (
          <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-gray-100 py-2 z-50">
            <div className="px-4 py-3 border-b border-gray-100">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 bg-green-500 rounded-full" />
                <p className="text-xs font-semibold text-green-600">
                  {walletName ?? 'Wallet'} — {networkId ?? 'preprod'}
                </p>
              </div>
              <p className="text-xs text-gray-500 mb-1">Shielded Address</p>
              <p className="font-mono text-xs break-all text-gray-800">{shieldedAddress}</p>
              {unshieldedAddress && (
                <div className="mt-2">
                  <p className="text-xs text-gray-500 mb-1">Unshielded Address</p>
                  <p className="font-mono text-xs break-all text-gray-800">{unshieldedAddress}</p>
                </div>
              )}
              {indexerUri && (
                <div className="mt-2">
                  <p className="text-xs text-gray-500 mb-1">Indexer</p>
                  <p className="font-mono text-xs break-all text-blue-600">{indexerUri}</p>
                </div>
              )}
            </div>

            <button
              onClick={() => {
                if (shieldedAddress) navigator.clipboard.writeText(shieldedAddress);
                setShowDropdown(false);
              }}
              className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm text-gray-700"
            >
              Copy Shielded Address
            </button>
            <button
              onClick={() => {
                disconnect();
                setShowDropdown(false);
              }}
              className="w-full text-left px-4 py-2 hover:bg-red-50 text-red-600 text-sm"
            >
              Disconnect
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={connect}
        disabled={isConnecting}
        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
      >
        {isConnecting ? 'Connecting...' : 'Connect Wallet'}
      </button>
      {!isInstalled && !error && (
        <p className="text-xs text-gray-400">Detecting wallet...</p>
      )}
      {isInstalled && !error && !isConnecting && (
        <p className="text-xs text-green-600">Wallet detected — click to connect</p>
      )}
      {error && (
        <p className="text-xs text-red-500 max-w-xs text-right">{error}</p>
      )}
    </div>
  );
}