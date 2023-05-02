import { AccountKeys, Address, BaseWalletAdapter, NetworkInfo, scopePollingDetectionStrategy, WalletAdapterNetwork, WalletName, WalletReadyState } from "./BaseWalletAdapter";
import { Web3Provider } from "@ethersproject/providers"
import { WalletAccountChangeError, WalletGetNetworkError, WalletNetworkChangeError, WalletNotConnectedError, WalletNotReadyError, WalletSignMessageError, WalletSignTransactionError } from "../types/error";
import { UnsignedTransaction, Transaction } from "@ethersproject/transactions";

const walletName = "Metamask" as WalletName<"Metamask">

export class MetamaskWalletAdapter extends BaseWalletAdapter {
    name: WalletName<string> = walletName;
    url: string = ""
    icon: string = ""

    protected _provider: any
    protected _network: WalletAdapterNetwork | undefined
    protected _connecting: boolean
    protected _wallet: any | undefined
    protected _api: string | undefined
    protected _chainId: number | undefined
    protected _readyState: WalletReadyState = typeof window === 'undefined' || typeof document === "undefined" ? WalletReadyState.Unsupported : WalletReadyState.NotDetected

    constructor() {
        super()

        this._provider = typeof window !== 'undefined' ? (window as any).ethereum : undefined
        this._network = undefined
        this._connecting = false
        this._wallet = undefined
        this._api = undefined
        this._chainId = undefined

        if(typeof window !== 'undefined' && this._readyState !== WalletReadyState.Unsupported) {
            scopePollingDetectionStrategy(() => {
                if((window as any).ethereum) {
                    this._readyState = WalletReadyState.Installed
                    this.emit('readyStateChange', this._readyState)
                    return true
                }
                return false
            })
        }
    }

    get publicAccount(): AccountKeys {
        return {
            publicKey: this._wallet.publicKey || null,
            address: this._wallet.address || null
        }
    }

    get network(): NetworkInfo {
        return {
            name: this._network,
            api: this._api,
            chainId: this._chainId
        }
    }

    get connecting(): boolean {
        return this._connecting
    }

    get connected(): boolean {
        return !!this._wallet?.isConnected
    }

    get readyState(): WalletReadyState {
        return this._readyState
    }

    async connect(): Promise<void> {
        try {
            if(!this.connected || !this.connecting) return
            if(
                !(
                    this._readyState === WalletReadyState.Loadable ||
                    this._readyState === WalletReadyState.Installed
                )
            ) throw new WalletNotReadyError()

            this._connecting = true

            const provider = this._provider || (window as any).ethereum
            const response = await provider?.request({ method: "eth_requestAccounts" })
            this._wallet = {
                address: response[0],
                publicKey: null,
                isConnected: true
            }

            try {
                const chainId = provider.chainId

                this._chainId = chainId
            } catch (e: any) {
                const errMsg = e.message
                this.emit('error', new WalletGetNetworkError(errMsg))
                throw e
            }

            this.emit("connect", this._wallet.address)
        } catch (e) {
            this.emit('error', e)
            throw e
        } finally {
            this._connecting = false 
        }
    }

    async disconnect(): Promise<void> {
        if(this._connecting || !this.connected) return
        
        this._wallet = undefined
        this._chainId = undefined
    }

    async onAccountChange(): Promise<void> {
        try {
            const wallet = this._wallet
            const provider = this._provider || (window as any).ethereum

            if(!wallet || !provider) throw new WalletNotConnectedError()

            const handleAccountChange = async (newAccount: Address[]) => {
                if (newAccount) {
                  this._wallet = {
                    ...this._wallet,
                    address: newAccount[0] || this._wallet?.address
                  };
                } else {
                  const response = await provider.request({ method: "eth_requestAccounts" })
                  this._wallet = {
                    ...this._wallet,
                    address: response?.address || this._wallet?.address,
                  };
                }
                this.emit('accountChange', newAccount[0]);
              };
              await provider?.on("accountChanged", handleAccountChange);
        
        } catch (e: any) {
            const errMsg = e.message;
            this.emit('error', new WalletAccountChangeError(errMsg));
            throw e;
        }
    }

    async onNetworkChange(): Promise<void> {
        try {
            const wallet = this._wallet
            const provider = this._provider || (window as any).ethereum

            if(!wallet || !provider) throw new WalletNotConnectedError()

            const handleNetworkChange = async (chainId: number) => {
                if (chainId) {
                  this._chainId = chainId
                } else {
                  const response = await provider.chainId
                  this._chainId = response
                }
                this.emit('networkChange', chainId);
              };
              await provider?.on("networkChanged", handleNetworkChange);
        
        } catch (e: any) {
            const errMsg = e.message;
            this.emit('error', new WalletNetworkChangeError(errMsg));
            throw e;
        }
    }

    async signMessage(message: string | Uint8Array): Promise<string> {
        try {
            const wallet = this._wallet
            const provider = this._provider || (window as any).ethereum

            if(!wallet || !provider) throw new WalletNotConnectedError()

            const signature = await provider.request({ method: "personal_sign", params:[message, wallet.address] })

            return signature
        } catch (e: any) {
            const errMsg = e.message;
            this.emit('error', new WalletSignMessageError(errMsg));
            throw e;
        }
    }

    async sendTransaction(transaction: UnsignedTransaction): Promise<Transaction> {
        try {
            const wallet = this._wallet
            const provider = this._provider || (window as any).ethereum

            if(!wallet || !provider) throw new WalletNotConnectedError()

            const signature = await provider.request({ method: "eth_sendTransaction", params:[transaction] })

            return signature
        } catch (e: any) {
            const errMsg = e.message;
            this.emit('error', new WalletSignTransactionError(errMsg));
            throw e;
        }   
    }
}