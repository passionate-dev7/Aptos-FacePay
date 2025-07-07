// ====== User and Profile Types ======

export interface ProfileData {
  name: string
  email?: string
  bio?: string
  preferredToken: string
  aptosAddress?: string
  avatar?: string
  socialLinks: {
    twitter?: string
    github?: string
    linkedin?: string
  }
}

export interface SavedFace {
  id: string
  hash: string
  descriptor: number[]
  landmarks: FaceLandmarks
  detection: FaceDetection
  profileData: ProfileData
  blobId?: string
  createdAt: string
  updatedAt: string
}

export interface DetectedFace {
  detection: any // faceapi.FaceDetection
  descriptor: Float32Array
  isSelected?: boolean
  label: ProfileData
  matchedProfile?: ProfileData
  match?: {
    label: string
    distance: number
  }
}

// ====== Payment Types ======

export interface PaymentRequest {
  recipientAddress: string
  amount: string
  token: string
  message?: string
  faceHash?: string
}

export interface PaymentTransaction {
  id: string
  sender: string
  recipient: string
  recipientFaceHash: string
  originalToken: string
  originalAmount: string
  receivedToken: string
  receivedAmount: string
  feeAmount: string
  swapRequired: boolean
  swapDetails: string
  timestamp: number
  status: 'pending' | 'completed' | 'failed'
  txHash?: string
}

// ====== Agent Types ======

export interface AgentStep {
  label: string
  isLoading: boolean
  type: 'scan' | 'agent' | 'connection' | 'token' | 'transaction' | 'hash'
}

export interface AgentResponse {
  content: {
    text: string
    functionCall?: {
      functionName: string
      args: {
        recipientAddress?: string
        amount?: string
        ticker?: string
        platform?: string
        username?: string
      }
    }
  }
  proof?: {
    type: string
    timestamp: number
    metadata: {
      logId: string
    }
  }
}

// ====== Camera and Face Detection Types ======

export interface CameraProps {
  onCapture?: (imageSrc: string) => void
  onError?: (error: string) => void
  className?: string
}

export interface FaceDetectionOptions {
  inputSize?: number
  scoreThreshold?: number
}

export interface FaceRecognitionResult {
  faces: DetectedFace[]
  processingTime: number
  confidence: number
}

// ====== Aptos Blockchain Types ======

export interface AptosAddress {
  address: string
  publicKey?: string
  scheme?: 'ED25519' | 'Secp256k1' | 'Secp256r1'
}

export interface AptosTokenInfo {
  type: string
  symbol: string
  decimals: number
  iconUrl?: string
  balance?: string
}

export interface AptosTransaction {
  hash: string
  sender: string
  recipient?: string
  amount?: string
  token?: string
  status: 'pending' | 'completed' | 'failed'
  timestamp: number
  events?: any[]
  version?: string
  gasUsed?: string
  gasUnitPrice?: string
  success?: boolean
}

export interface AptosTransactionResult {
  hash: string
  success: boolean
  version: string
  gasUsed: string
  gasUnitPrice: string
  timestamp: number
  events: any[]
}

// ====== Wallet Adapter Types ======

export interface WalletSession {
  address: string
  publicKey: string
  connected: boolean
  wallet: {
    name: string
    icon: string
    url: string
  }
}

export interface WalletConfig {
  autoConnect: boolean
  network: 'mainnet' | 'testnet' | 'devnet' | 'localnet'
  optInWallets?: string[]
}

// ====== Storage Types ======

export interface StorageUploadResult {
  blobId: string
  size: number
  uploadTime: number
}

export interface StorageData {
  blobId: string
  data: any
  timestamp: number
  metadata?: Record<string, any>
}

// ====== Smart Contract Types ======

export interface FacePaySystemConfig {
  id: string
  adminCap: string
  registry: string
  supportedTokens: string[]
  feeBps: number
  totalPayments: number
  totalVolume: string
}

export interface UserRegistryEntry {
  id: string
  aptosAddress: string
  faceHash: string
  storageBlobId: string
  preferredToken: string
  displayName: string
  createdAt: number
  updatedAt: number
  isVerified: boolean
  paymentCount: number
}

// ====== State Types ======

export interface AuthState {
  isAuthenticated: boolean
  session: WalletSession | null
  isLoading: boolean
  error: string | null
  connect: (walletName?: string) => Promise<void>
  disconnect: () => void
}

export interface FaceState {
  savedFaces: SavedFace[]
  currentDetection: DetectedFace | null
  isModelLoaded: boolean
  isDetecting: boolean
  error: string | null
  addFace: (face: SavedFace) => void
  removeFace: (index: number) => void
  setCurrentDetection: (detection: DetectedFace | null) => void
  loadModels: () => Promise<void>
}

export interface PaymentState {
  transactions: PaymentTransaction[]
  currentPayment: PaymentRequest | null
  isProcessing: boolean
  error: string | null
  addTransaction: (tx: PaymentTransaction) => void
  updateTransaction: (id: string, updates: Partial<PaymentTransaction>) => void
  setCurrentPayment: (payment: PaymentRequest | null) => void
  processPayment: (payment: PaymentRequest) => Promise<string>
}

// ====== Component Props ======

export interface FaceRegistrationProps {
  onSuccess: (savedFace: SavedFace) => void
  onError: (error: string) => void
  className?: string
}

export interface FaceRegistrationState {
  isCapturing: boolean
  isProcessing: boolean
  isUploading: boolean
  preview: string | null
  error: string | null
  step: 'camera' | 'capture' | 'profile' | 'uploading' | 'complete'
}

export interface FaceRecognitionProps {
  savedFaces: SavedFace[]
  onFaceMatched: (face: DetectedFace) => void
  onError?: (error: string) => void
  className?: string
}

export interface FaceRecognitionState {
  isScanning: boolean
  isListening: boolean
  detectedFace: SavedFace | null
  confidence: number
  error: string | null
  command: VoiceCommand | null
}

export interface VoiceCommand {
  action: 'pay' | 'send' | 'transfer'
  amount: string
  token?: string
  message?: string
}

export interface PaymentInterfaceProps {
  recipient: ProfileData
  onPaymentSubmit: (amount: string, token: string) => void
  isLoading?: boolean
  className?: string
}

// ====== Utility Types ======

export type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E }

export type AsyncResult<T, E = Error> = Promise<Result<T, E>>

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// ====== App Configuration ======

export interface AppConfig {
  aptos: {
    network: 'mainnet' | 'testnet' | 'devnet' | 'localnet'
    nodeUrl: string
    contracts: {
      facepay: string
      registry: string
    }
  }
  storage: {
    enabled: boolean
    provider: 'tusky' | 'walrus' | 'ipfs'
    config: Record<string, any>
  }
  wallet: WalletConfig
  faceRecognition: {
    modelPath: string
    confidence: number
    maxFaces: number
  }
}

// ====== Event Types ======

export interface PaymentInitiatedEvent {
  paymentId: string
  sender: string
  recipientFaceHash: string
  recipientAddress: string
  originalToken: string
  originalAmount: string
  timestamp: number
}

export interface PaymentCompletedEvent {
  paymentId: string
  sender: string
  recipientAddress: string
  receivedToken: string
  receivedAmount: string
  feeAmount: string
  swapRequired: boolean
  timestamp: number
}

export interface UserRegisteredEvent {
  userId: string
  aptosAddress: string
  faceHash: string
  storageBlobId: string
  timestamp: number
}

// ====== Face Detection Types ======

export interface FaceDescriptor {
  descriptor: Float32Array
  landmarks?: FaceLandmarks
  detection?: FaceDetection
}

export interface FaceLandmarks {
  positions: Point[]
  shift: Point
}

export interface FaceDetection {
  box: Box
  classScore: number
  className: string
}

export interface Point {
  x: number
  y: number
}

export interface Box {
  x: number
  y: number
  width: number
  height: number
}

// ====== Storage Configuration ======

export interface TuskyConfig {
  apiKey: string
  baseUrl?: string
}

export interface TuskyVault {
  id: string
  name: string
  description?: string
  encrypted: boolean
  createdAt: string
  updatedAt: string
  members?: TuskyVaultMember[]
}

export interface TuskyVaultMember {
  id: string
  role: 'viewer' | 'contributor' | 'admin'
  joinedAt: string
}

export interface TuskyFile {
  id: string
  name: string
  size: number
  mimeType: string
  blobId: string
  vaultId: string
  parentId?: string
  status: 'active' | 'revoked' | 'deleted'
  storedEpoch: number
  certifiedEpoch: number
  ref: string
  erasureCodeType: string
  createdAt: string
  updatedAt: string
}

export interface TuskyUploadOptions {
  name: string
  mimeType: string
  parentId?: string
  metadata?: Record<string, string>
}

export interface TuskyUploadProgress {
  bytesUploaded: number
  bytesTotal: number
  percentage: number
}

// ====== Wallet State Types ======

export interface WalletState {
  isConnected: boolean
  address: string | null
  balance: string | null
  network: string
  provider: string | null
}

export interface WalletAdapterState {
  isAuthenticated: boolean
  userInfo: {
    address: string
    publicKey: string
    name?: string
    wallet: {
      name: string
      icon: string
      url: string
    }
  } | null
  network: string
  isLoading: boolean
}

// ====== UI Component Types ======

export interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'destructive' | 'ghost' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  disabled?: boolean
  onClick?: () => void
  children: React.ReactNode
  className?: string
}

export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  className?: string
}

export interface ToastProps {
  type: 'success' | 'error' | 'warning' | 'info'
  message: string
  duration?: number
  onClose: () => void
}

// ====== Store Types ======

export interface AppState {
  wallet: WalletState
  walletAdapter: WalletAdapterState
  faces: SavedFace[]
  isLoading: boolean
  error: string | null
}

export interface FaceStore {
  faces: SavedFace[]
  selectedFace: SavedFace | null
  isLoading: boolean
  error: string | null
  addFace: (face: SavedFace) => void
  removeFace: (id: string) => void
  updateFace: (id: string, updates: Partial<SavedFace>) => void
  setSelectedFace: (face: SavedFace | null) => void
  clearError: () => void
}

export interface TransactionStore {
  transactions: AptosTransaction[]
  isLoading: boolean
  error: string | null
  addTransaction: (transaction: AptosTransaction) => void
  clearTransactions: () => void
}

// ====== Pagination and Data Types ======

export interface PaginatedResponse<T> {
  items: T[]
  nextToken?: string
  hasMore: boolean
  total?: number
}

// ====== Face API Models ======

export interface FaceApiModels {
  tinyFaceDetector: boolean
  faceLandmark68Net: boolean
  faceRecognitionNet: boolean
  loaded: boolean
}

export interface FaceMatchResult {
  distance: number
  confidence: number
  isMatch: boolean
  face: SavedFace
}

// ====== Generic Types ======

export type LoadingState = 'idle' | 'loading' | 'success' | 'error'

export interface AsyncState<T> {
  data: T | null
  loading: boolean
  error: string | null
}

export interface FormField<T = string> {
  value: T
  error: string | null
  touched: boolean
}

export interface FormState {
  [key: string]: FormField
} 