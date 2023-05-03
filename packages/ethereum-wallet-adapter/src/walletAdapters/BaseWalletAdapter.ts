import EventEmitter from 'eventemitter3';
import { Transaction, UnsignedTransaction } from "@ethersproject/transactions"

declare global {
  interface Window {
    ewa_wallets: any;
  }
}

export { EventEmitter };

export type PublicKey = string;
export type Address = string;
export type AuthKey = string;

export interface AccountKeys {
  publicKey: PublicKey | null | undefined;
  address: Address | null;
}

export interface WalletAdapterEvents {
  connect(address: Address): void;
  disconnect(): void;
  error(error: any): void;
  success(value: any): void;
  readyStateChange(readyState: WalletReadyState): void;
  networkChange(network: number): void;
  accountChange(account: string): void;
}

export enum WalletReadyState {
  /**
   * User-installable wallets can typically be detected by scanning for an API
   * that they've injected into the global context. If such an API is present,
   * we consider the wallet to have been installed.
   */
  Installed = 'Installed',
  NotDetected = 'NotDetected',
  /**
   * Loadable wallets are always available to you. Since you can load them at
   * any time, it's meaningless to say that they have been detected.
   */
  Loadable = 'Loadable',
  /**
   * If a wallet is not supported on a given platform (eg. server-rendering, or
   * mobile) then it will stay in the `Unsupported` state.
   */
  Unsupported = 'Unsupported'
}

export type WalletName<T extends string = string> = T & { __brand__: 'WalletName' };

export type NetworkInfo = {
  api?: string;
  chainId?: number;
  name: WalletAdapterNetwork | undefined;
};

export enum WalletAdapterNetwork {
  Mainnet = 'mainnet',
  Testnet = 'testnet',
  Devnet = 'devnet'
}

export interface WalletAdapterProps<Name extends string = string> {
  name: WalletName<Name>;
  url: string;
  icon: string;
  readyState: WalletReadyState;
  connecting: boolean;
  connected: boolean;
  publicAccount: AccountKeys;
  network: NetworkInfo;
  onAccountChange(): Promise<void>;
  onNetworkChange(): Promise<void>;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  sendTransaction(transaction: UnsignedTransaction & { from: Address }): Promise<Transaction>;
  signMessage(
    message: string | Uint8Array
  ): Promise<string>;
}

export type WalletAdapter<Name extends string = string> = WalletAdapterProps<Name> &
  EventEmitter<WalletAdapterEvents>;

export abstract class BaseWalletAdapter
  extends EventEmitter<WalletAdapterEvents>
  implements WalletAdapter
{
  abstract name: WalletName;

  abstract url: string;

  abstract icon: string;

  abstract get readyState(): WalletReadyState;

  abstract get publicAccount(): AccountKeys;

  abstract get network(): NetworkInfo;

  abstract get connecting(): boolean;

  get connected(): boolean {
    return !!this.publicAccount.address;
  }

  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract sendTransaction(transaction: UnsignedTransaction & { from: Address }): Promise<Transaction>;

  abstract signMessage(
    message: string | Uint8Array
  ): Promise<string>;

  abstract onAccountChange(): Promise<void>;
  abstract onNetworkChange(): Promise<void>;
}

export function scopePollingDetectionStrategy(detect: () => boolean): void {
  // Early return when server-side rendering
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const disposers: (() => void)[] = [];

  function detectAndDispose() {
    const detected = detect();
    if (detected) {
      for (const dispose of disposers) {
        dispose();
      }
    }
  }

  // Strategy #1: Try detecting every second.
  const interval =
    // TODO: #334 Replace with idle callback strategy.
    setInterval(detectAndDispose, 1000);
  disposers.push(() => clearInterval(interval));

  // Strategy #2: Detect as soon as the DOM becomes 'ready'/'interactive'.
  if (
    // Implies that `DOMContentLoaded` has not yet fired.
    document.readyState === 'loading'
  ) {
    document.addEventListener('DOMContentLoaded', detectAndDispose, { once: true });
    disposers.push(() => document.removeEventListener('DOMContentLoaded', detectAndDispose));
  }

  // Strategy #3: Detect after the `window` has fully loaded.
  if (
    // If the `complete` state has been reached, we're too late.
    document.readyState !== 'complete'
  ) {
    window.addEventListener('load', detectAndDispose, { once: true });
    disposers.push(() => window.removeEventListener('load', detectAndDispose));
  }

  // Strategy #4: Detect synchronously, now.
  detectAndDispose();
}