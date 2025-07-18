'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { SavedFace, DetectedFace, ProfileData } from '../types'

// Dynamically import FaceRecognition to avoid SSR issues with face-api.js and webcam
const FaceRecognition = dynamic(() => import('../components/face/FaceRecognition'), { ssr: false })

export default function ScanPage() {
    const [savedFaces, setSavedFaces] = useState<SavedFace[]>([])
    const [matchedProfile, setMatchedProfile] = useState<ProfileData | null>(null)
    const [detectedFace, setDetectedFace] = useState<DetectedFace | null>(null)

    useEffect(() => {
        // Load saved faces from localStorage (same as index.tsx)
        const loadSavedFaces = () => {
            try {
                const saved = localStorage.getItem('aptos-facepay-faces')
                if (saved) {
                    const parsed = JSON.parse(saved)
                    // Convert descriptor arrays back to Float32Array
                    const processedFaces = parsed.map((face: any) => ({
                        ...face,
                        descriptor: new Float32Array(face.descriptor),
                    }))
                    setSavedFaces(processedFaces)
                }
            } catch (error) {
                setSavedFaces([])
            }
        }
        loadSavedFaces()
    }, [])

    // Handle what happens when a face is matched
    const handleFaceMatched = (detected: DetectedFace) => {
        setDetectedFace(detected)
        setMatchedProfile(detected.matchedProfile || null)
        // You can trigger payment logic here if you want
        // For now, just log:
        console.log('Matched face:', detected)
    }

    return (
        <div className="min-h-screen  py-10">
            <div className="max-w-5xl mx-auto">
                <FaceRecognition
                    savedFaces={savedFaces}
                    onFaceMatched={handleFaceMatched}
                />
            </div>
        </div>
    )
}
