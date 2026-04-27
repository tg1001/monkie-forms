export type MidnightNetworkId =
  | 'mainnet'
  | 'testnet-02'
  | 'preview'
  | 'devnet'
  | 'undeployed';

export interface InitialAPI {
  rdns: string;
  name: string;
  icon: string;
  apiVersion: string;
  connect: (networkId: MidnightNetworkId) => Promise<ConnectedAPI>;
}

export interface Configuration {
  indexerUri: string;
  indexerWsUri: string;
  proverServerUri?: string;
  substrateNodeUri: string;
  networkId: MidnightNetworkId;
}

export interface ConnectionStatus {
  status: 'connected' | 'disconnected';
  networkId?: MidnightNetworkId;
}

export interface ShieldedAddresses {
  shieldedAddress: string;
  shieldedCoinPublicKey: string;
  shieldedEncryptionPublicKey: string;
}

export interface UnshieldedAddress {
  unshieldedAddress: string;
}

export interface ConnectedAPI {
  getConfiguration: () => Promise<Configuration>;
  getConnectionStatus: () => Promise<ConnectionStatus>;
  getShieldedBalances: () => Promise<Record<string, bigint>>;
  getUnshieldedBalances: () => Promise<Record<string, bigint>>;
  getDustBalance: () => Promise<bigint>;
  getShieldedAddresses: () => Promise<ShieldedAddresses>;
  getUnshieldedAddress: () => Promise<UnshieldedAddress>;
  getDustAddress: () => Promise<{ dustAddress: string }>;
  balanceUnsealedTransaction: (tx: string) => Promise<{ tx: string }>;
  balanceSealedTransaction: (tx: string) => Promise<{ tx: string }>;
  submitTransaction: (tx: string) => Promise<void>;
  hintUsage: (methodNames: string[]) => Promise<void>;
}

declare global {
  interface Window {
    midnight?: {
      [key: string]: InitialAPI;
    };
  }
}