import { useState, useEffect } from "react";
import { NextPage } from "next";
import Head from "next/head";
import { SavedFace, DetectedFace, ProfileData } from "../types";
import FaceRegistration from "../components/face/FaceRegistration";
import FaceRecognition from "../components/face/FaceRecognition";
import Navbar from "@/components/Navbar";
import LandingPage from "@/components/LandingPage";

const Home: NextPage = () => {
  const [savedFaces, setSavedFaces] = useState<SavedFace[]>([]);
  const [currentView, setCurrentView] = useState<"register" | "recognize">(
    "register"
  );
  const [matchedFace, setMatchedFace] = useState<DetectedFace | null>(null);

  // Load saved faces from localStorage on component mount
  useEffect(() => {
    const loadSavedFaces = () => {
      try {
        const saved = localStorage.getItem("aptos-facepay-faces");
        if (saved) {
          const parsed = JSON.parse(saved);
          // Convert descriptor arrays back to Float32Array
          const processedFaces = parsed.map((face: any) => ({
            ...face,
            descriptor: new Float32Array(face.descriptor),
          }));
          setSavedFaces(processedFaces);
        }
      } catch (error) {
        console.error("❌ Error loading saved faces:", error);
      }
    };

    loadSavedFaces();
  }, []);

  // Save faces to localStorage whenever savedFaces changes
  useEffect(() => {
    if (savedFaces.length > 0) {
      try {
        // Convert Float32Array to regular arrays for JSON serialization
        const serializedFaces = savedFaces.map((face) => ({
          ...face,
          descriptor: Array.from(face.descriptor),
        }));
        localStorage.setItem(
          "aptos-facepay-faces",
          JSON.stringify(serializedFaces)
        );
      } catch (error) {
        console.error("❌ Error saving faces:", error);
      }
    }
  }, [savedFaces]);

  const handleFaceSaved = (faces: SavedFace[]) => {
    setSavedFaces(faces);
    console.log("✅ Faces updated:", faces.length);
  };

  const handleFaceMatched = (face: DetectedFace) => {
    setMatchedFace(face);
    console.log("🎯 Face matched:", face.label.name);
  };

  const clearAllFaces = () => {
    if (confirm("Are you sure you want to clear all registered faces?")) {
      setSavedFaces([]);
      localStorage.removeItem("aptos-facepay-faces");
      setMatchedFace(null);
    }
  };

  return (
    <>
      <Head>
        <title>Aptos FacePay - Pay by Face</title>
        <meta
          name="description"
          content="Revolutionary payment rails for SUI blockchain using facial recognition"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <LandingPage />

    </>
  );
};

export default Home;
