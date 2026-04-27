'use client';

import { ConnectWalletButton } from '@/components/wallet/ConnectWalletButton';
import { useWalletContext } from '@/lib/wallet/WalletProvider';

export default function Home() {
  const {
    isConnected,
    shieldedAddress,
    unshieldedAddress,
    networkId,
  } = useWalletContext();

  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🌙</span>
            <h1 className="text-xl font-bold text-gray-900">Privacy Forms</h1>
          </div>
          <ConnectWalletButton />
        </div>
      </header>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <h2 className="text-5xl font-bold text-gray-900 mb-6">
            Privacy-Preserving
            <br />
            <span className="text-purple-600">Form Submissions</span>
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Submit applications with sensitive data that stays private until you are selected.
            Powered by Midnight Network and zero-knowledge proofs.
          </p>

          {!isConnected ? (
            <div className="space-y-4">
              <p className="text-gray-700">Connect your Lace wallet to get started</p>
              <div className="flex justify-center">
                <ConnectWalletButton />
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-xl p-8 max-w-2xl mx-auto text-left space-y-4">
              <h3 className="text-2xl font-bold text-center">Wallet Connected</h3>

              {networkId && (
                <div className="bg-green-50 px-4 py-2 rounded-lg flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full" />
                  <p className="text-sm text-green-700 font-medium">Network: {networkId}</p>
                </div>
              )}

              {shieldedAddress && (
                <div className="bg-purple-50 p-4 rounded-lg">
                  <p className="text-xs text-purple-600 mb-1 font-medium">Shielded Address</p>
                  <p className="font-mono text-sm break-all">{shieldedAddress}</p>
                </div>
              )}

              {unshieldedAddress && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1 font-medium">Unshielded Address</p>
                  <p className="font-mono text-sm break-all">{unshieldedAddress}</p>
                </div>
              )}

              <div className="text-center pt-2">
                <button
                  onClick={() => window.location.href = '/apply'}
                  className="px-8 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-colors"
                >
                  Start Application
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="mt-20 grid md:grid-cols-3 gap-8">
          <div className="bg-white p-6 rounded-xl shadow-md">
            <div className="text-4xl mb-4">🔒</div>
            <h3 className="text-xl font-bold mb-2">Privacy First</h3>
            <p className="text-gray-600">
              Sensitive data stays private using cryptographic commitments on Midnight Network.
            </p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-md">
            <div className="text-4xl mb-4">✅</div>
            <h3 className="text-xl font-bold mb-2">Zero-Knowledge Proofs</h3>
            <p className="text-gray-600">
              Verify your application without revealing private information to anyone.
            </p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-md">
            <div className="text-4xl mb-4">🎯</div>
            <h3 className="text-xl font-bold mb-2">Selective Disclosure</h3>
            <p className="text-gray-600">
              Reveal passport or DOB only after acceptance, never before.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}