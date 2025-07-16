'use client';

import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Camera, CheckCircle, AlertCircle, User, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ProfileData } from '@/types';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { Textarea } from '@/components/ui/textarea';
import Webcam from 'react-webcam';
import * as faceapi from 'face-api.js';
import { uploadDataAndGetBlobId } from '@/lib/storage';

// Map token symbols to their addresses
const TOKEN_ADDRESS_MAP: Record<string, string> = {
    APT: "0x1::aptos_coin::AptosCoin",
    USDC: "0xf22bede237a07e121b56d91a491eb7bcdfd1f5907926a9e58338f964a01b17fa::asset::USDC",
    USDT: "0xf22bede237a07e121b56d91a491eb7bcdfd1f5907926a9e58338f964a01b17fa::asset::USDT",
    WETH: "0xf22bede237a07e121b56d91a491eb7bcdfd1f5907926a9e58338f964a01b17fa::asset::WETH",
};

export default function RegisterPage() {
    const { connected, account, signAndSubmitTransaction } = useWallet()

    const [step, setStep] = useState(1);
    const [isCapturing, setIsCapturing] = useState(false);
    const [faceDetected, setFaceDetected] = useState(false);
    const [registrationStatus, setRegistrationStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');

    const [isModelLoaded, setIsModelLoaded] = useState(false);
    const [isWebcamLoading, setIsWebcamLoading] = useState(true);
    const [webcamError, setWebcamError] = useState<string | null>(null);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [detectedFaces, setDetectedFaces] = useState<any[]>([]);
    const [selectedFaceIndex, setSelectedFaceIndex] = useState(0);
    const webcamRef = useRef<Webcam>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Add state for upload progress and uploading
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState('');

    const [formData, setFormData] = useState<ProfileData>({
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

    // Load face-api.js models
    useEffect(() => {
        const loadModels = async () => {
            const MODEL_URL = '/models';
            try {
                await Promise.all([
                    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
                ]);
                setIsModelLoaded(true);
            } catch (error) {
                setIsModelLoaded(false);
            }
        };
        loadModels();
    }, []);

    const handleWebcamReady = () => {
        setIsWebcamLoading(false);
    };

    const handleWebcamError = (error: string | DOMException) => {
        setIsWebcamLoading(false);
        setWebcamError(
            typeof error === 'string'
                ? error
                : 'Could not access webcam. Please grant camera permissions.'
        );
    };

    const createImageFromDataUrl = (dataUrl: string): Promise<HTMLImageElement> => {
        return new Promise((resolve, reject) => {
            const img = new window.Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = dataUrl;
        });
    };

    const detectFacesInImage = async (image: HTMLImageElement) => {
        return await faceapi
            .detectAllFaces(image, new faceapi.TinyFaceDetectorOptions())
            .withFaceLandmarks()
            .withFaceDescriptors();
    };

    const capturePhoto = async () => {
        if (!webcamRef.current || !isModelLoaded) {
            alert('Please wait for the camera and models to load.');
            return;
        }
        setIsCapturing(true);
        try {
            const imageSrc = webcamRef.current.getScreenshot();
            console.log("Image Src", imageSrc);

            if (!imageSrc) {
                throw new Error('Failed to capture image');
            }
            setCapturedImage(imageSrc);
            // Detect faces in the captured image
            const image = await createImageFromDataUrl(imageSrc);
            console.log("IMage", image);

            const detections = await detectFacesInImage(image);
            console.log("detections", detections);

            if (detections.length === 0) {
                alert('No faces detected. Please ensure your face is clearly visible and try again.');
                setIsCapturing(false);
                return;
            }
            setDetectedFaces(detections);
            setSelectedFaceIndex(0);
            drawFacesOnCanvas(image, detections);
            setFaceDetected(true);
        } catch (error) {
            alert('Error capturing photo. Please try again.');
        } finally {
            setIsCapturing(false);
        }
    };

    const drawFacesOnCanvas = (image: HTMLImageElement, detections: any[]) => {
        if (!canvasRef.current) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        canvas.width = image.width;
        canvas.height = image.height;
        ctx.drawImage(image, 0, 0);
        detections.forEach((detection, index) => {
            const box = detection.detection.box;
            const isSelected = index === selectedFaceIndex;
            ctx.strokeStyle = isSelected ? '#10B981' : '#6366F1';
            ctx.lineWidth = isSelected ? 4 : 2;
            ctx.strokeRect(box.x, box.y, box.width, box.height);
            ctx.fillStyle = isSelected ? '#10B981' : '#6366F1';
            ctx.font = '16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto';
            ctx.fillText(`Face ${index + 1}${isSelected ? ' (Selected)' : ''}`, box.x, box.y - 5);
            if (detection.landmarks) {
                ctx.fillStyle = '#06B6D4';
                detection.landmarks.positions.forEach((point: any) => {
                    ctx.beginPath();
                    ctx.arc(point.x, point.y, 1, 0, 2 * Math.PI);
                    ctx.fill();
                });
            }
        });
    };

    const selectFace = (index: number) => {
        setSelectedFaceIndex(index);
        if (capturedImage && detectedFaces.length > 0) {
            createImageFromDataUrl(capturedImage).then(image => {
                drawFacesOnCanvas(image, detectedFaces);
            });
        }
    };

    const retakePhoto = () => {
        setCapturedImage(null);
        setDetectedFaces([]);
        setSelectedFaceIndex(0);
        setFaceDetected(false);
        if (canvasRef.current) {
            const ctx = canvasRef.current.getContext('2d');
            if (ctx) {
                ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            }
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData(prev => ({
            ...prev,
            [e.target.name]: e.target.value
        }));
    };

    // New: handle social input change
    const handleSocialInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({
            ...prev,
            socialLinks: {
                ...prev.socialLinks,
                [e.target.name]: e.target.value
            }
        }));
    };

    useEffect(() => {
        return () => {
            if (webcamRef.current) {
                // @ts-ignore
                webcamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, []);


    // Helper function to generate face hash
    const generateFaceHash = (descriptor: Float32Array): string => {
        const descriptorString = Array.from(descriptor).join(',');
        let hash = 0;
        for (let i = 0; i < descriptorString.length; i++) {
            const char = descriptorString.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(36);
    };

    // Register face using local state (no parameters)
    const registerFace = async () => {
        if (!detectedFaces[selectedFaceIndex] || !connected || !account?.address) {
            alert('Please select a face and connect your wallet first.');
            return;
        }
        if (!formData.name.trim()) {
            alert('Please enter your name.');
            return;
        }
        setIsUploading(true);
        setUploadProgress('Preparing face data...');
        try {
            const selectedDetection = detectedFaces[selectedFaceIndex];
            const descriptor = selectedDetection.descriptor;
            // Prepare face descriptor data
            const faceDescriptor = {
                descriptor: descriptor,
                landmarks: selectedDetection.landmarks,
                detection: selectedDetection.detection
            };
            // Prepare face data for storage
            const faceData = {
                id: crypto.randomUUID(),
                hash: generateFaceHash(descriptor),
                descriptor: Array.from(descriptor),
                landmarks: selectedDetection.landmarks,
                detection: selectedDetection.detection,
                profileData: {
                    ...formData,
                    aptosAddress: account.address.toString()
                },
                blobId: undefined,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };
            console.log("faceData", faceData);

            setUploadProgress('Uploading to storage...');

            const storageBlobId = await uploadDataAndGetBlobId(faceData, account.address.toString());
            console.log("storageBlobId", storageBlobId);

            if (!storageBlobId) {
                setUploadProgress("")
                return
            };

            setUploadProgress('Registering on Aptos blockchain...');
            try {
                // Get the token address from the map, default to APT if not found
                const tokenType = TOKEN_ADDRESS_MAP[formData.preferredToken] || TOKEN_ADDRESS_MAP['APT'];
                // For Aptos wallet-adapter, use top-level payload (not wrapped in {data: ...})
                const payload = {
                    function: "facepay::registry::register_user",
                    typeArguments: [],
                    arguments: [
                        faceData.hash,
                        storageBlobId,
                        tokenType,
                        faceData.profileData.name,
                        process.env.NEXT_PUBLIC_REGISTRY_ADMIN || account.address.toString(),
                    ],
                };
                const transaction = await signAndSubmitTransaction(payload);
                setUploadProgress('Transaction submitted! Waiting for confirmation...', transaction);
                await new Promise(resolve => setTimeout(resolve, 5000));
                setUploadProgress('Face registered successfully on Aptos!');
                setFormData({
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
                });
                setCapturedImage(null);
                setDetectedFaces([]);
            } catch (contractError: any) {
                setUploadProgress('');
                alert('Failed to register face on blockchain: ' + (contractError && contractError.message));
            }
        } catch (error: any) {
            setUploadProgress('');
            alert(error.message || 'Unknown error occurred');
        } finally {
            setIsUploading(false);
        }
    };


    // New: renderStep refactored for 4 steps
    const renderStep = () => {
        switch (step) {
            case 1:
                // Personal Details
                return (
                    <div className="space-y-6">
                        <div className="text-center">
                            <div className="w-16 h-16 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center mx-auto mb-4">
                                <User className="w-8 h-8 text-white" />
                            </div>
                            <h2 className="text-2xl font-bold mb-2">Personal Information</h2>
                            <p className="text-muted-foreground">Tell us a bit about yourself</p>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="name">Full Name</Label>
                                <Input
                                    id="name"
                                    name="name"
                                    placeholder="Enter your full name"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                />
                            </div>
                            <div>
                                <Label htmlFor="bio">Bio</Label>
                                <Textarea
                                    id="bio"
                                    name="bio"
                                    placeholder="Enter bio"
                                    value={formData.bio}
                                    onChange={handleInputChange}
                                />
                            </div>
                            <div>
                                <Label htmlFor="email">Email Address</Label>
                                <Input
                                    id="email"
                                    name="email"
                                    type="email"
                                    placeholder="Enter your email"
                                    value={formData.email}
                                    onChange={handleInputChange}
                                />
                            </div>
                            <div>
                                <Label htmlFor="preferredToken">Preferred Token</Label>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button className="w-full justify-between" variant="outline">
                                            {formData.preferredToken}
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="start" className="w-full min-w-[160px]">
                                        <DropdownMenuItem onSelect={() => setFormData(prev => ({ ...prev, preferredToken: 'APT' }))}>
                                            APT
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onSelect={() => setFormData(prev => ({ ...prev, preferredToken: 'USDC' }))}>
                                            USDC
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onSelect={() => setFormData(prev => ({ ...prev, preferredToken: 'USDT' }))}>
                                            USDT
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onSelect={() => setFormData(prev => ({ ...prev, preferredToken: 'ETH' }))}>
                                            ETH
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </div>
                        <Button
                            onClick={() => setStep(2)}
                            className="w-full"
                            disabled={!formData.name || !formData.email}
                        >
                            Continue to Social Details
                        </Button>
                    </div>
                );
            case 2:
                // Social Details
                return (
                    <div className="space-y-6">
                        <div className="text-center">
                            <div className="w-16 h-16 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center mx-auto mb-4">
                                <User className="w-8 h-8 text-white" />
                            </div>
                            <h2 className="text-2xl font-bold mb-2">Social Details</h2>
                            <p className="text-muted-foreground">Add your social links (optional)</p>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="linkedin">LinkedIn</Label>
                                <Input
                                    id="linkedin"
                                    name="linkedin"
                                    placeholder="https://linkedin.com/in/username"
                                    value={formData.socialLinks.linkedin}
                                    onChange={handleSocialInputChange}
                                />
                            </div>
                            <div>
                                <Label htmlFor="twitter">Twitter</Label>
                                <Input
                                    id="twitter"
                                    name="twitter"
                                    placeholder="@username"
                                    value={formData.socialLinks.twitter}
                                    onChange={handleSocialInputChange}
                                />
                            </div>
                            <div>
                                <Label htmlFor="github">Github</Label>
                                <Input
                                    id="github"
                                    name="github"
                                    placeholder="@username"
                                    value={formData.socialLinks.github}
                                    onChange={handleSocialInputChange}
                                />
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                                Back
                            </Button>
                            <Button onClick={() => setStep(3)} className="flex-1">
                                Continue to Face Registration
                            </Button>
                        </div>
                    </div>
                );
            case 3:
                // Face Registration (Image Capture)
                return (
                    <div className="space-y-6">
                        <div className="text-center">
                            <div className="w-16 h-16 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center mx-auto mb-4">
                                <Camera className="w-8 h-8 text-white" />
                            </div>
                            <h2 className="text-2xl font-bold mb-2">Face Registration</h2>
                            <p className="text-muted-foreground">We'll capture your face securely for payments</p>
                        </div>
                        <Alert>
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                                Your facial data will be encrypted and stored securely. Only facial hashes are stored on-chain.
                            </AlertDescription>
                        </Alert>
                        <div className="glass-effect rounded-2xl p-6">
                            <h2 className="text-xl font-semibold mb-4">📷 Facial Capture</h2>
                            {!capturedImage ? (
                                <div className="space-y-4">
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
                                                    videoConstraints={{ width: 640, height: 480, facingMode: 'user' }}
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
                                    <div className="text-center">
                                        <Button
                                            onClick={capturePhoto}
                                            disabled={isCapturing || !!webcamError || !isModelLoaded}
                                            className="px-6 py-3 bg-face-primary text-white rounded-lg hover:bg-face-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {isCapturing ? '📸 Capturing...' : '📸 Capture Photo'}
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="relative mx-auto w-fit">
                                        <canvas
                                            ref={canvasRef}
                                            className="max-w-full h-auto rounded-lg border-2 border-face-primary"
                                        />
                                    </div>
                                    {detectedFaces.length > 1 && (
                                        <div className="text-center space-y-2">
                                            <p className="text-sm text-gray-600">Multiple faces detected. Select one:</p>
                                            <div className="flex justify-center space-x-2">
                                                {detectedFaces.map((_, index) => (
                                                    <Button
                                                        key={index}
                                                        onClick={() => selectFace(index)}
                                                        className={`px-3 py-1 rounded-lg text-sm ${selectedFaceIndex === index
                                                            ? 'bg-face-primary text-white'
                                                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                                            }`}
                                                    >
                                                        Face {index + 1}
                                                    </Button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    <div className="flex justify-center space-x-4">
                                        <Button
                                            onClick={retakePhoto}
                                            className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                                        >
                                            🔄 Retake
                                        </Button>
                                        <Button
                                            onClick={() => setStep(4)}
                                            disabled={!faceDetected}
                                            className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Continue
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                );
            case 4:
                // Completion
                return (
                    <div className="space-y-6 text-center">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                            <CheckCircle className="w-8 h-8 text-green-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-green-600">Registration Complete!</h2>
                        <p className="text-muted-foreground">
                            Your face has been successfully registered. You can now make payments using facial recognition.
                        </p>
                        {capturedImage && (
                            <img
                                src={capturedImage}
                                alt="Captured face"
                                className="max-w-full h-auto rounded-lg border-2 border-face-primary mb-4 mx-auto"
                            />
                        )}
                        <div className="flex gap-3">
                            <Button asChild variant="outline" className="flex-1" onClick={() => setStep(3)}>
                                <ArrowLeft size={20} /> <span className='ml-2'>Back</span>
                            </Button>
                            <Button
                                className="flex-1"
                                onClick={registerFace}
                                disabled={isUploading}
                            >
                                {isUploading ? 'Registering on Blockchain...' : 'Register Face on Blockchain'}
                            </Button>
                        </div>
                        {uploadProgress && (
                            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                                <p className="text-sm text-blue-700">{uploadProgress}</p>
                            </div>
                        )}
                    </div>
                );
            default:
                return null;
        }
    };


    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-purple-50/50 dark:via-purple-950/20 to-blue-50/50 dark:to-blue-950/20">
            {/* Main Content */}
            <main className="container mx-auto px-4 py-12">
                <div className="max-w-md mx-auto">
                    {/* Progress Indicator */}
                    <div className="mb-8">
                        <div className="flex justify-between items-center mb-4">
                            {[1, 2, 3, 4].map((i) => (
                                <div
                                    key={i}
                                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${i <= step
                                        ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                                        : 'bg-gray-200 text-gray-400'
                                        }`}
                                >
                                    {i}
                                </div>
                            ))}
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                                className="bg-gradient-to-r from-purple-600 to-pink-600 h-2 rounded-full transition-all duration-500"
                                style={{ width: `${(step / 4) * 100}%` }}
                            ></div>
                        </div>
                    </div>
                    {/* Step Content */}
                    <Card className="border-2 border-purple-200/50 dark:border-purple-800/50 shadow-xl bg-gradient-to-br from-background to-purple-50/20 dark:to-purple-950/10">
                        <CardHeader className="text-center">
                            <CardTitle className="text-2xl">
                                Step {step} of 4
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {renderStep()}
                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    );
}