// Aptos FacePay Configuration
export const APTOS_CONFIG = {
  // Network Configuration
  NETWORK: process.env.NEXT_PUBLIC_APTOS_NETWORK || 'testnet',
  NODE_URL: process.env.NEXT_PUBLIC_APTOS_NODE_URL || 'https://fullnode.testnet.aptoslabs.com/v1',
  FAUCET_URL: process.env.NEXT_PUBLIC_APTOS_FAUCET_URL || 'https://faucet.testnet.aptoslabs.com',

  // Contract Addresses (to be deployed)
  REGISTRY_ADMIN: process.env.NEXT_PUBLIC_REGISTRY_ADMIN || '0x1',
  FACEPAY_ADMIN: process.env.NEXT_PUBLIC_FACEPAY_ADMIN || '0x1',
  ENHANCED_PAYMENT_ADMIN: process.env.NEXT_PUBLIC_ENHANCED_PAYMENT_ADMIN || '0x1',

  // Contract Module Names
  MODULES: {
    REGISTRY: 'facepay::registry',
    FACEPAY: 'facepay::facepay',
    ENHANCED_PAYMENT: 'facepay::enhanced_payment',
  },

  // Storage Configuration
  STORAGE: {
    IPFS_GATEWAY: process.env.NEXT_PUBLIC_IPFS_GATEWAY || 'https://ipfs.io/ipfs/',
    PINATA_API_KEY: process.env.NEXT_PUBLIC_PINATA_API_KEY || '',
    PINATA_SECRET_KEY: process.env.NEXT_PUBLIC_PINATA_SECRET_KEY || '',
  },

  // Application Configuration
  APP: {
    NAME: process.env.NEXT_PUBLIC_APP_NAME || 'Aptos FacePay',
    DESCRIPTION: process.env.NEXT_PUBLIC_APP_DESCRIPTION || 'Facial recognition payment system on Aptos',
    URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  },

  // Feature Flags
  FEATURES: {
    FACE_VERIFICATION: process.env.NEXT_PUBLIC_ENABLE_FACE_VERIFICATION !== 'false',
    TOKEN_SWAPPING: process.env.NEXT_PUBLIC_ENABLE_TOKEN_SWAPPING === 'true',
    VOICE_COMMANDS: process.env.NEXT_PUBLIC_ENABLE_VOICE_COMMANDS !== 'false',
  },

  // Development Settings
  DEBUG: process.env.NEXT_PUBLIC_DEBUG_MODE === 'true',
  MOCK_BLOCKCHAIN: process.env.NEXT_PUBLIC_MOCK_BLOCKCHAIN === 'true',

  // Wallet Configuration
  WALLETS: {
    SUPPORTED: ['Petra', 'Martian', 'Fewcha', 'Pontem'],
    DEFAULT: 'Petra',
  },

  // Transaction Configuration
  TRANSACTION: {
    GAS_LIMIT: 10000,
    GAS_PRICE: 100,
    TIMEOUT: 30000, // 30 seconds
  },

  // Payment Configuration
  PAYMENT: {
    MIN_AMOUNT: 1000000, // 0.01 APT in octas
    DEFAULT_FEE_BPS: 30, // 0.3% fee
    SUPPORTED_TOKENS: ['APT'],
  },
}

// Helper functions for configuration
export const getNetworkConfig = () => ({
  network: APTOS_CONFIG.NETWORK,
  nodeUrl: APTOS_CONFIG.NODE_URL,
  faucetUrl: APTOS_CONFIG.FAUCET_URL,
})

export const getContractAddresses = () => ({
  registryAdmin: APTOS_CONFIG.REGISTRY_ADMIN,
  facepayAdmin: APTOS_CONFIG.FACEPAY_ADMIN,
  enhancedPaymentAdmin: APTOS_CONFIG.ENHANCED_PAYMENT_ADMIN,
})

export const getModuleNames = () => APTOS_CONFIG.MODULES

export const isFeatureEnabled = (feature: keyof typeof APTOS_CONFIG.FEATURES) => {
  return APTOS_CONFIG.FEATURES[feature]
}

export const getStorageConfig = () => APTOS_CONFIG.STORAGE

export const getAppConfig = () => APTOS_CONFIG.APP

// Type definitions
export type NetworkConfig = ReturnType<typeof getNetworkConfig>
export type ContractAddresses = ReturnType<typeof getContractAddresses>
export type ModuleNames = ReturnType<typeof getModuleNames>
export type StorageConfig = ReturnType<typeof getStorageConfig>
export type AppConfig = ReturnType<typeof getAppConfig> 