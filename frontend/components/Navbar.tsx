import React from "react";
import { ThemeToggle } from "./ThemeToggle";
import { WalletSelector } from "./ConnectWallet";

const Navbar = ({
  currentView,
  setCurrentView,
}: {
  currentView: "register" | "recognize";
  setCurrentView: (currentView: "register" | "recognize") => void;
}) => {
  return (
    <header className="glass-effect border-b border-white/20 sticky top-0 z-50 dark:bg-slate-900/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-face-primary to-face-secondary rounded-lg flex items-center justify-center">
              <span className="font-bold text-xl">🎭</span>
            </div>
            <div>
              <h1 className="text-xl font-bold gradient-text">Aptos FacePay</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Pay by Face
              </p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex space-x-8">
            <button
              onClick={() => setCurrentView("register")}
              className={`px-3 py-2 rounded-lg transition-colors ${currentView === "register"
                ? "bg-face-primary text-black dark:text-white"
                : "text-gray-600 dark:text-gray-300 hover:text-face-primary dark:hover:text-face-primary"
                }`}
            >
              📝 Register
            </button>
            <button
              onClick={() => setCurrentView("recognize")}
              className={`px-3 py-2 rounded-lg transition-colors ${currentView === "recognize"
                ? "bg-face-primary text-black dark:text-white"
                : "text-gray-600 dark:text-gray-300 hover:text-face-primary dark:hover:text-face-primary"
                }`}
            >
              🎯 Recognize
            </button>
          </nav>

          {/* Wallet Connection & Auth */}
          <div className="flex items-center space-x-4">
            {/* {savedFaces.length > 0 && (
                            <button
                                onClick={clearAllFaces}
                                className="px-3 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                            >
                                🗑️ Clear All
                            </button>
                        )} */}

            <ThemeToggle />
            <WalletSelector />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
