import '@/styles/globals.css'
import { MetamaskWalletAdapter, WalletProvider } from 'ethereum-wallet-adapter'
import type { AppProps } from 'next/app'
import { useMemo } from 'react'

export default function App({ Component, pageProps }: AppProps) {
  const wallets = [
    new MetamaskWalletAdapter()
  ]
  
  return (
    <WalletProvider wallets={wallets} autoConnect={true}>
      <Component {...pageProps} />
    </WalletProvider>
  )
}
