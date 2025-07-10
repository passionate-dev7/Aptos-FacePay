import React, { useEffect, useState } from 'react';
import { ArrowRight, Camera, ChevronDown, Globe, Mic, NotebookPen, ScanLine, Shield, Sparkles, Star, Users, Wallet, Zap } from "lucide-react";
import Link from 'next/link';
import { ThemeToggle } from './ThemeToggle';
import { WalletSelector } from './ConnectWallet';
import { Badge } from './ui/badge';
import { Button } from './ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const features = [
    {
        icon: <Camera className="w-6 h-6" />,
        title: "Face Recognition",
        desc: "Pay by simply scanning faces"
    },
    {
        icon: <Shield className="w-6 h-6" />,
        title: "zkLogin Security",
        desc: "Zero-knowledge authentication"
    },
    {
        icon: <Mic className="w-6 h-6" />,
        title: "Voice Commands",
        desc: "Hands-free transactions"
    },
    {
        icon: <Zap className="w-6 h-6" />,
        title: "Auto Token Swap",
        desc: "Intelligent DEX integration"
    }
];


const stats = [
    { value: "100ms", label: "Recognition Speed" },
    { value: "99.9%", label: "Accuracy Rate" },
    { value: "24/7", label: "Availability" },
    { value: "0", label: "Data Breaches" }
];
const LandingPage = () => {

    const [isVisible, setIsVisible] = useState(false);
    const [currentFeature, setCurrentFeature] = useState(0);

    useEffect(() => {
        setIsVisible(true);
        const interval = setInterval(() => {
            setCurrentFeature((prev) => (prev + 1) % 4);
        }, 3000);
        return () => clearInterval(interval);
    }, []);


    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-purple-50/50 dark:via-purple-950/20 to-blue-50/50 dark:to-blue-950/20 overflow-hidden">
            {/* Animated Background Elements */}
            <div className="absolute inset-0 opacity-20">
                <div className="absolute top-20 left-20 w-64 h-64 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute top-40 right-20 w-32 h-32 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-full blur-2xl animate-bounce"></div>
                <div className="absolute bottom-20 left-40 w-48 h-48 bg-gradient-to-r from-green-400 to-blue-400 rounded-full blur-3xl animate-pulse delay-1000"></div>
                <div className="absolute bottom-40 right-40 w-96 h-96 bg-gradient-to-r from-orange-400 to-red-400 rounded-full blur-3xl animate-pulse delay-2000"></div>
            </div>

            {/* Header */}
            <header className="relative z-50 border-b bg-background/80 backdrop-blur-xl border-purple-200/50 dark:border-purple-800/50">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                            <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg flex items-center justify-center animate-pulse">
                                <Sparkles className="w-5 h-5 text-white" />
                            </div>
                            <span className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                                Aptos FacePay
                            </span>
                        </div>
                        <nav className="hidden md:flex items-center space-x-8">
                            <Link href="/register" className="flex gap-1 text-muted-foreground hover:text-purple-600 transition-colors duration-300 hover:scale-105">
                                <NotebookPen /> Register
                            </Link>
                            <Link href="/scan" className="flex gap-1 text-muted-foreground hover:text-purple-600 transition-colors duration-300 hover:scale-105">
                                <ScanLine /> Scan & Pay
                            </Link>
                        </nav>
                        <div className="flex items-center space-x-4">
                            <ThemeToggle />
                            <WalletSelector />
                        </div>
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <section className="relative z-10 py-20 md:py-32">
                <div className="container mx-auto px-4">
                    <div className="text-center max-w-4xl mx-auto">
                        <div className={`transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
                            <Badge className="mb-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white animate-pulse shadow-lg">
                                🎭 Revolutionary Payment Rails
                            </Badge>
                            <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 bg-clip-text text-transparent animate-fade-in">
                                Pay Anyone by
                                <span className="block bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent animate-pulse">
                                    Face Recognition
                                </span>
                            </h1>
                            <p className="text-xl md:text-2xl text-muted-foreground mb-8 leading-relaxed">
                                The world's first decentralized payment rails using facial recognition,
                                <br className="hidden md:block" />
                                zkLogin authentication, and Walrus storage on Aptos blockchain.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
                                <Button asChild size="lg" className="cursor-pointer bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg hover:shadow-xl hover:scale-105">
                                    <Link href="/register" className="flex ">
                                        <Camera className="w-5 h-5 mr-2" />
                                        Start Face Registration
                                    </Link>
                                </Button>
                                <Button asChild variant="outline" size="lg" className="border-2 border-purple-300 dark:border-purple-700 hover:bg-purple-50 dark:hover:bg-purple-950/50 transition-all duration-300 hover:scale-105">
                                    <Link href="/scan" className="flex ">
                                        <Zap className="w-5 h-5 mr-2" />
                                        Scan & Pay Now
                                    </Link>
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Floating Feature Cards */}
            <section className="relative z-10 py-16">
                <div className="container mx-auto px-4">
                    <div className="grid md:grid-cols-4 gap-6">
                        {features.map((feature, index) => (
                            <Card
                                key={index}
                                className={`relative overflow-hidden transition-all duration-700 hover:scale-105 hover:shadow-xl ${currentFeature === index ? 'ring-2 ring-purple-500 shadow-lg bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/50 dark:to-pink-950/50' : ''
                                    } ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
                                style={{ transitionDelay: `${index * 200}ms` }}
                            >
                                <CardHeader className="pb-3">
                                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center transition-all duration-300 ${currentFeature === index ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg' : 'bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/50 dark:to-pink-900/50 text-purple-600'
                                        }`}>
                                        {feature.icon}
                                    </div>
                                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-muted-foreground">{feature.desc}</p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </section>

            {/* Stats Section */}
            <section className="relative z-10 py-16 bg-gradient-to-r from-purple-50/50 to-pink-50/50 dark:from-purple-950/20 dark:to-pink-950/20">
                <div className="container mx-auto px-4">
                    <div className="grid md:grid-cols-4 gap-8 text-center">
                        {stats.map((stat, index) => (
                            <div
                                key={index}
                                className={`transition-all duration-700 hover:scale-110 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
                                    }`}
                                style={{ transitionDelay: `${index * 150}ms` }}
                            >
                                <div className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">{stat.value}</div>
                                <div className="text-muted-foreground text-sm uppercase tracking-wider">{stat.label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Interactive Demo Preview */}
            <section className="relative z-10 py-20">
                <div className="container mx-auto px-4">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold mb-4">
                            Experience the Future of Payments
                        </h2>
                        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                            Watch how our revolutionary facial recognition technology transforms digital payments
                        </p>
                    </div>

                    <div className="max-w-4xl mx-auto">
                        <Card className="overflow-hidden bg-gradient-to-br from-background to-purple-50/50 dark:to-purple-950/20 border-2 border-purple-200/50 dark:border-purple-800/50 shadow-2xl">
                            <CardContent className="p-8">
                                <div className="aspect-video bg-gradient-to-br from-purple-100/50 to-pink-100/50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg flex items-center justify-center relative overflow-hidden">
                                    <div className="absolute inset-0 bg-gradient-to-r from-purple-400/20 to-pink-400/20 animate-pulse"></div>
                                    <div className="relative z-10 text-center">
                                        <div className="w-24 h-24 bg-gradient-to-r from-purple-500/20 to-pink-500/20 backdrop-blur-sm rounded-full flex items-center justify-center mb-4 mx-auto animate-bounce">
                                            <Camera className="w-12 h-12 text-purple-600" />
                                        </div>
                                        <h3 className="text-2xl font-bold mb-2">Demo Preview</h3>
                                        <p className="text-muted-foreground mb-6">Interactive facial recognition demo coming soon</p>
                                        <Button asChild variant="secondary" className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 backdrop-blur-sm hover:from-purple-500/30 hover:to-pink-500/30 transition-all duration-300 hover:scale-105">
                                            <Link href="/scan" className='flex items-center'>
                                                Try Live Demo
                                                <ArrowRight className="w-4 h-4 ml-2" />
                                            </Link>
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="relative z-10 py-20 bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600">
                <div className="container mx-auto px-4 text-center">
                    <div className="max-w-3xl mx-auto">
                        <Star className="w-16 h-16 text-white/80 mx-auto mb-6 animate-spin-slow" />
                        <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                            Ready to Revolutionize Your Payments?
                        </h2>
                        <p className="text-xl text-white/90 mb-8">
                            Join thousands of users who are already using FacePay for secure, instant transactions
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <Button asChild size="lg" variant="secondary" className="bg-white text-purple-600 hover:bg-white/90 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                                <Link href="/register" className='flex'>
                                    <Users className="w-5 h-5 mr-2" />
                                    Register Your Face
                                </Link>
                            </Button>
                            <Button asChild size="lg" variant="outline" className="border-white text-white hover:bg-white/10 transition-all duration-300 hover:scale-105">
                                <Link href="/features" className='flex'>
                                    <Globe className="w-5 h-5 mr-2" />
                                    Explore Features
                                </Link>
                            </Button>
                        </div>
                    </div>
                </div>
            </section>

            {/* Scroll Indicator */}
            <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50">
                <div className="animate-bounce">
                    <ChevronDown className="w-6 h-6 text-muted-foreground" />
                </div>
            </div>
        </div>
    );
};

export default LandingPage;