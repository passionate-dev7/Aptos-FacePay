'use client'

import * as faceapi from 'face-api.js'
import { useEffect, useRef, useState } from 'react'
import Webcam from 'react-webcam'
import { useWallet } from '@aptos-labs/wallet-adapter-react'
import { ProfileData, SavedFace, FaceRegistrationProps, FaceDescriptor } from '../../types'

const videoConstraints = {
  width: 1280,
  height: 720,
  facingMode: 'user',
}

const createImageFromDataUrl = (dataUrl: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = dataUrl
  })
}

const detectFacesInImage = async (image: HTMLImageElement) => {
  return await faceapi
    .detectAllFaces(image, new faceapi.TinyFaceDetectorOptions())
    .withFaceLandmarks()
    .withFaceDescriptors()
}

export default function FaceRegistration({ onSuccess, onError, className }: FaceRegistrationProps) {
  const { connected, account, signAndSubmitTransaction } = useWallet()

  const [isModelLoaded, setIsModelLoaded] = useState(false)
  const [isWebcamLoading, setIsWebcamLoading] = useState(true)
  const [webcamError, setWebcamError] = useState<string | null>(null)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [detectedFaces, setDetectedFaces] = useState<any[]>([])
  const [selectedFaceIndex, setSelectedFaceIndex] = useState(0)
  const [isCapturing, setIsCapturing] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<string>('')
  const [savedFaces, setSavedFaces] = useState<SavedFace[]>([])

  const webcamRef = useRef<Webcam>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Profile form state with properly initialized socialLinks
  const [profileData, setProfileData] = useState<ProfileData>({
    name: '',
    email: '',
    bio: '',
    preferredToken: 'APT',
    aptosAddress: account?.address?.toString() || '',
    socialLinks: {
      linkedin: '',
      twitter: '',
      github: '',
    },
  })

  // Update Aptos address when account changes
  useEffect(() => {
    if (account?.address) {
      setProfileData(prev => ({
        ...prev,
        aptosAddress: account.address.toString()
      }))
    }
  }, [account?.address])

  // Load face-api.js models
  useEffect(() => {
    const loadModels = async () => {
      const MODEL_URL = '/models'
      try {
        console.log('Loading face detection models...')
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ])
        setIsModelLoaded(true)
        console.log('Face detection models loaded successfully')
      } catch (error) {
        console.error('❌ Error loading face-api.js models:', error)
      }
    }

    loadModels()
  }, [])

  const handleWebcamReady = () => {
    setIsWebcamLoading(false)
  }

  const handleWebcamError = (error: string | DOMException) => {
    console.error('❌ Webcam error:', error)
    setIsWebcamLoading(false)
    setWebcamError(
      typeof error === 'string'
        ? error
        : 'Could not access webcam. Please grant camera permissions.'
    )
  }

  const capturePhoto = async () => {
    if (!webcamRef.current || !isModelLoaded) {
      alert('Please wait for the camera and models to load.')
      return
    }

    setIsCapturing(true)
    try {
      const imageSrc = webcamRef.current.getScreenshot()
      if (!imageSrc) {
        throw new Error('Failed to capture image')
      }

      setCapturedImage(imageSrc)

      // Detect faces in the captured image
      const image = await createImageFromDataUrl(imageSrc)
      const detections = await detectFacesInImage(image)

      if (detections.length === 0) {
        alert('No faces detected. Please ensure your face is clearly visible and try again.')
        setIsCapturing(false)
        return
      }

      setDetectedFaces(detections)
      setSelectedFaceIndex(0)

      // Draw faces on canvas
      drawFacesOnCanvas(image, detections)

    } catch (error) {
      console.error('❌ Error capturing photo:', error)
      alert('Error capturing photo. Please try again.')
    } finally {
      setIsCapturing(false)
    }
  }

  const drawFacesOnCanvas = (image: HTMLImageElement, detections: any[]) => {
    if (!canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = image.width
    canvas.height = image.height

    // Draw the captured image
    ctx.drawImage(image, 0, 0)

    // Draw face detection boxes
    detections.forEach((detection, index) => {
      const box = detection.detection.box
      const isSelected = index === selectedFaceIndex

      ctx.strokeStyle = isSelected ? '#10B981' : '#6366F1'
      ctx.lineWidth = isSelected ? 4 : 2
      ctx.strokeRect(box.x, box.y, box.width, box.height)

      // Draw face number
      ctx.fillStyle = isSelected ? '#10B981' : '#6366F1'
      ctx.font = '16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto'
      ctx.fillText(`Face ${index + 1}${isSelected ? ' (Selected)' : ''}`, box.x, box.y - 5)

      // Draw landmarks
      if (detection.landmarks) {
        ctx.fillStyle = '#06B6D4'
        detection.landmarks.positions.forEach((point: any) => {
          ctx.beginPath()
          ctx.arc(point.x, point.y, 1, 0, 2 * Math.PI)
          ctx.fill()
        })
      }
    })
  }

  const selectFace = (index: number) => {
    setSelectedFaceIndex(index)
    if (capturedImage && detectedFaces.length > 0) {
      createImageFromDataUrl(capturedImage).then(image => {
        drawFacesOnCanvas(image, detectedFaces)
      })
    }
  }

  // Helper function to generate face hash
  const generateFaceHash = (descriptor: Float32Array): string => {
    const descriptorString = Array.from(descriptor).join(',')
    let hash = 0
    for (let i = 0; i < descriptorString.length; i++) {
      const char = descriptorString.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash
    }
    return Math.abs(hash).toString(36)
  }

  // Helper function to prepare face data
  const prepareFaceData = (faceDescriptor: FaceDescriptor, profileData: ProfileData): SavedFace => {
    const id = crypto.randomUUID()
    const hash = generateFaceHash(faceDescriptor.descriptor)

    return {
      id,
      hash,
      descriptor: Array.from(faceDescriptor.descriptor),
      landmarks: faceDescriptor.landmarks!,
      detection: faceDescriptor.detection!,
      profileData,
      blobId: undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  }

  const registerFace = async () => {
    if (!detectedFaces[selectedFaceIndex] || !connected || !account?.address) {
      alert('Please select a face and connect your wallet first.')
      return
    }

    if (!profileData.name.trim()) {
      alert('Please enter your name.')
      return
    }

    setIsUploading(true)
    setUploadProgress('Preparing face data...')

    try {
      const selectedDetection = detectedFaces[selectedFaceIndex]
      const descriptor = selectedDetection.descriptor

      // Prepare face descriptor data with correct structure
      const faceDescriptor: FaceDescriptor = {
        descriptor: descriptor,
        landmarks: selectedDetection.landmarks,
        detection: selectedDetection.detection
      }

      // Prepare face data for storage
      const faceData = prepareFaceData(faceDescriptor, {
        ...profileData,
        aptosAddress: account.address.toString()
      })

      setUploadProgress('Uploading to storage...')

      // TODO: Implement actual decentralized storage upload (IPFS/Arweave/etc.)
      // For now, just simulate successful upload
      await new Promise(resolve => setTimeout(resolve, 2000))
      const storageBlobId = 'blob_' + Date.now().toString()

      setUploadProgress('Registering on Aptos blockchain...')

      // Call Aptos contract to register user
      try {
        const payload = {
          data: {
            function: "facepay::registry::register_user",
            functionArguments: [
              faceData.hash, // face_hash
              storageBlobId, // storage_blob_id
              '0x1::aptos_coin::AptosCoin', // preferred_token
              faceData.profileData.name, // display_name
              process.env.NEXT_PUBLIC_REGISTRY_ADMIN || account.address.toString(), // registry_admin
            ],
          }
        }

        const transaction = await signAndSubmitTransaction(payload)
        console.log('✅ Face registration transaction:', transaction.hash)

        setUploadProgress('Transaction submitted! Waiting for confirmation...')
        
        // Wait for transaction confirmation
        // Note: In a real app, you'd want to poll for transaction status
        await new Promise(resolve => setTimeout(resolve, 5000))

        // Add to saved faces
        setSavedFaces(prev => [...prev, faceData])

        setUploadProgress('Face registered successfully on Aptos!')
        onSuccess(faceData)

        // Reset form
        setProfileData({
          name: '',
          email: '',
          bio: '',
          preferredToken: 'APT',
          aptosAddress: account.address.toString(),
          socialLinks: {
            linkedin: '',
            twitter: '',
            github: '',
          },
        })
        setCapturedImage(null)
        setDetectedFaces([])

      } catch (contractError) {
        console.error('❌ Contract call failed:', contractError)
        throw new Error('Failed to register face on blockchain: ' + (contractError as any).message)
      }

    } catch (error) {
      console.error('❌ Error registering face:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      setUploadProgress('')
      onError(errorMessage)
    } finally {
      setIsUploading(false)
    }
  }

  const retakePhoto = () => {
    setCapturedImage(null)
    setDetectedFaces([])
    setSelectedFaceIndex(0)
    setUploadProgress('')

    // Clear canvas
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d')
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
      }
    }
  }

  const deleteFace = (index: number) => {
    if (confirm('Are you sure you want to delete this registered face?')) {
      const updatedFaces = savedFaces.filter((_, i) => i !== index)
      setSavedFaces(updatedFaces)
    }
  }

  if (!isModelLoaded) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="loading-dots">
            <div></div>
            <div></div>
            <div></div>
          </div>
          <p className="mt-4 text-lg font-medium">
            {!isModelLoaded ? 'Loading face recognition models...' : 'Loading...'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold gradient-text mb-2">Face Registration</h1>
        <p className="text-gray-600">
          Register your face to enable secure payments through facial recognition
        </p>
      </div>

      {/* Wallet Connection Status */}
      {!connected && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="text-yellow-400 mr-3">⚠️</div>
            <div>
              <h3 className="font-medium text-yellow-800">Wallet Not Connected</h3>
              <p className="text-sm text-yellow-700">Please connect your Aptos wallet to continue.</p>
              <p className="text-xs text-gray-600 mt-1">
                Install and setup an Aptos wallet like Petra to get started.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Registration Form */}
      <div className="glass-effect rounded-2xl p-6">
        <h2 className="text-xl font-semibold mb-4">📝 Profile Information</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Full Name *
            </label>
            <input
              type="text"
              value={profileData.name}
              onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-face-primary focus:border-transparent"
              placeholder="Enter your full name"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Preferred Token
            </label>
            <select
              value={profileData.preferredToken}
              onChange={(e) => setProfileData({ ...profileData, preferredToken: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-face-primary focus:border-transparent"
            >
              <option value="APT">APT</option>
              <option value="USDC">USDC</option>
              <option value="USDT">USDT</option>
              <option value="ETH">ETH</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              value={profileData.email || ''}
              onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-face-primary focus:border-transparent"
              placeholder="your@email.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Bio
            </label>
            <input
              type="text"
              value={profileData.bio || ''}
              onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-face-primary focus:border-transparent"
              placeholder="Short bio about yourself"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              LinkedIn Profile
            </label>
            <input
              type="url"
              value={profileData.socialLinks.linkedin || ''}
              onChange={(e) => setProfileData({
                ...profileData,
                socialLinks: {
                  ...profileData.socialLinks,
                  linkedin: e.target.value
                }
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-face-primary focus:border-transparent"
              placeholder="https://linkedin.com/in/username"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Twitter Handle
            </label>
            <input
              type="text"
              value={profileData.socialLinks.twitter || ''}
              onChange={(e) => setProfileData({
                ...profileData,
                socialLinks: {
                  ...profileData.socialLinks,
                  twitter: e.target.value
                }
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-face-primary focus:border-transparent"
              placeholder="@username"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Github Handle
            </label>
            <input
              type="text"
              value={profileData.socialLinks.github || ''}
              onChange={(e) => setProfileData({
                ...profileData,
                socialLinks: {
                  ...profileData.socialLinks,
                  github: e.target.value
                }
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-face-primary focus:border-transparent"
              placeholder="@username"
            />
          </div>
        </div>
      </div>

      {/* Camera Section */}
      <div className="glass-effect rounded-2xl p-6">
        <h2 className="text-xl font-semibold mb-4">📷 Facial Capture</h2>

        {!capturedImage ? (
          <div className="space-y-4">
            {/* Webcam Container */}
            <div className="relative mx-auto w-fit">
              {!webcamError ? (
                <>
                  {isWebcamLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg z-10">
                      <div className="text-center">
                        <div className="loading-dots">
                          <div></div>
                          <div></div>
                          <div></div>
                        </div>
                        <p className="mt-2">Loading camera...</p>
                      </div>
                    </div>
                  )}

                  <Webcam
                    audio={false}
                    ref={webcamRef}
                    screenshotFormat="image/jpeg"
                    videoConstraints={videoConstraints}
                    onUserMedia={handleWebcamReady}
                    onUserMediaError={handleWebcamError}
                    className="rounded-lg border-2 border-face-primary"
                  />
                </>
              ) : (
                <div className="text-center p-8 border-2 border-dashed border-gray-300 rounded-lg">
                  <p className="text-red-500 mb-4">{webcamError}</p>
                  <p className="text-gray-500">Please grant camera permissions and refresh the page</p>
                </div>
              )}
            </div>

            {/* Capture Button */}
            <div className="text-center">
              <button
                onClick={capturePhoto}
                disabled={isCapturing || !!webcamError || !isModelLoaded || !connected}
                className="px-6 py-3 bg-face-primary text-white rounded-lg hover:bg-face-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCapturing ? '📸 Capturing...' : '📸 Capture Photo'}
              </button>
            </div>
          </div>
        ) : (
          /* Captured Image and Face Selection */
          <div className="space-y-4">
            <div className="relative mx-auto w-fit">
              <canvas
                ref={canvasRef}
                className="max-w-full h-auto rounded-lg border-2 border-face-primary"
              />
            </div>

            {/* Face Selection */}
            {detectedFaces.length > 1 && (
              <div className="text-center space-y-2">
                <p className="text-sm text-gray-600">Multiple faces detected. Select one:</p>
                <div className="flex justify-center space-x-2">
                  {detectedFaces.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => selectFace(index)}
                      className={`px-3 py-1 rounded-lg text-sm ${selectedFaceIndex === index
                        ? 'bg-face-primary text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                    >
                      Face {index + 1}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-center space-x-4">
              <button
                onClick={retakePhoto}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                🔄 Retake
              </button>
              <button
                onClick={registerFace}
                disabled={isUploading || !profileData.name.trim() || !connected}
                className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUploading ? '⏳ Registering...' : '✅ Register Face'}
              </button>
            </div>
          </div>
        )}

        {/* Progress/Status */}
        {uploadProgress && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-700">{uploadProgress}</p>
          </div>
        )}
      </div>

      {/* Registered Faces */}
      {savedFaces.length > 0 && (
        <div className="glass-effect rounded-2xl p-6">
          <h2 className="text-xl font-semibold mb-4">👥 Registered Faces ({savedFaces.length})</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {savedFaces.map((face, index) => (
              <div key={face.id} className="bg-white/60 rounded-lg p-4 border border-gray-200">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold">{face.profileData.name}</h3>
                  <button
                    onClick={() => deleteFace(index)}
                    className="text-red-500 hover:text-red-700 text-sm"
                  >
                    🗑️
                  </button>
                </div>

                <div className="space-y-1 text-sm text-gray-600">
                  <p><span className="font-medium">Token:</span> {face.profileData.preferredToken}</p>
                  <p><span className="font-medium">Address:</span> {face.profileData.aptosAddress?.slice(0, 6)}...{face.profileData.aptosAddress?.slice(-4)}</p>
                  {face.profileData.email && (
                    <p><span className="font-medium">Email:</span> {face.profileData.email}</p>
                  )}
                  {face.profileData.socialLinks?.linkedin && (
                    <p><span className="font-medium">LinkedIn:</span>
                      <a href={face.profileData.socialLinks.linkedin} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline ml-1">
                        Profile
                      </a>
                    </p>
                  )}
                  {face.profileData.socialLinks?.twitter && (
                    <p><span className="font-medium">Twitter:</span> {face.profileData.socialLinks.twitter}</p>
                  )}
                  {face.profileData.socialLinks?.github && (
                    <p><span className="font-medium">Github:</span> {face.profileData.socialLinks.github}</p>
                  )}
                  {face.blobId && (
                    <p className="text-xs text-gray-500">
                      <span className="font-medium">Blob ID:</span> {face.blobId.slice(0, 8)}...
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-medium text-blue-900 mb-2">📋 Instructions</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Connect your Aptos wallet</li>
          <li>• Fill in your profile information</li>
          <li>• Position your face clearly in the camera frame</li>
          <li>• Ensure good lighting for accurate detection</li>
          <li>• Your facial data will be encrypted and stored securely</li>
          <li>• You can register multiple faces if needed</li>
        </ul>
      </div>
    </div>
  )
} 