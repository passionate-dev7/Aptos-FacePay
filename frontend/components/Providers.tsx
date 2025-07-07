'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AptosWalletAdapterProvider } from '@aptos-labs/wallet-adapter-react'
import { Network } from '@aptos-labs/ts-sdk'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      retryDelay: 1000,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
})

interface ProvidersProps {
  children: React.ReactNode
}

export function Providers({ children }: ProvidersProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <AptosWalletAdapterProvider
        autoConnect={true}
        dappConfig={{ 
          network: Network.TESTNET,
          // Add your API key here if needed
          // aptosApiKey: "your-api-key-here"
        }}
        onError={(error) => {
          console.error('Wallet connection error:', error)
        }}
      >
        {children}
      </AptosWalletAdapterProvider>
    </QueryClientProvider>
  )
} 