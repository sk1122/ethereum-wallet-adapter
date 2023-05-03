import { Transaction, UnsignedTransaction } from '@ethersproject/transactions';
import { createContext, useContext } from 'react';
import {
  AccountKeys,
  Address,
  NetworkInfo,
  WalletAdapter,
  WalletName,
  WalletReadyState
} from '../walletAdapters/BaseWalletAdapter';

export interface Wallet {
  adapter: WalletAdapter;
  readyState: WalletReadyState;
}

export interface WalletContextState {
  autoConnect: boolean;
  wallets: Wallet[];
  wallet: Wallet | null;
  account: AccountKeys | null;
  connecting: boolean;
  connected: boolean;
  disconnecting: boolean;
  network: NetworkInfo;
  select(walletName?: WalletName): Promise<void>;
  connect(walletName?: WalletName): Promise<void>;
  disconnect(): Promise<void>;
  sendTransaction(transaction: UnsignedTransaction & { from: Address }, options?: any): Promise<Transaction>;
  signMessage(
    message: string | Uint8Array
  ): Promise<string>;
}

const DEFAULT_CONTEXT = {
  autoConnect: false,
  connecting: false,
  connected: false,
  disconnecting: false
} as WalletContextState;

export const WalletContext = createContext<WalletContextState>(
  DEFAULT_CONTEXT as WalletContextState
);

export function useWallet(): WalletContextState {
  return useContext(WalletContext);
}