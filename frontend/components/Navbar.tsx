import React from "react";
import { ThemeToggle } from "./ThemeToggle";
import { WalletSelector } from "./ConnectWallet";
import { NotebookPen, ScanLine, Sparkles } from "lucide-react";
import Link from "next/link";

const Navbar = () => {
  return (
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
  );
};

export default Navbar;
