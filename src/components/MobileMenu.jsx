import React, { useState, useEffect } from 'react';
import { Menu, X, Settings, LogOut, User, Wallet } from 'lucide-react';

/**
 * Mobile Menu Component
 * Responsive hamburger menu for mobile devices
 */

const MobileMenu = ({ 
  currentUser, 
  walletData, 
  onSettingsClick, 
  onLogout 
}) => {
  const [isOpen, setIsOpen] = useState(false);

  // Close menu on escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when menu is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleSettingsClick = () => {
    setIsOpen(false);
    onSettingsClick();
  };

  const handleLogoutClick = () => {
    setIsOpen(false);
    onLogout();
  };

  return (
    <>
      {/* Hamburger Button - Only visible on mobile */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden p-2 hover:bg-gray-800/50 rounded-lg transition-colors"
        aria-label="Toggle menu"
      >
        {isOpen ? (
          <X className="w-6 h-6 text-white" />
        ) : (
          <Menu className="w-6 h-6 text-white" />
        )}
      </button>

      {/* Backdrop Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Slide-in Menu */}
      <div
        className={`fixed top-0 right-0 h-full w-80 max-w-[85vw] bg-[#0a0a0a] border-l border-gray-800 shadow-2xl transform transition-transform duration-300 ease-in-out z-50 lg:hidden ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Menu Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600/10 rounded-lg">
              <User className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <div className="text-white font-semibold text-sm">
                {currentUser?.username || currentUser?.email || 'User'}
              </div>
              <div className="text-gray-400 text-xs">
                {currentUser?.email}
              </div>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 hover:bg-gray-800/50 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Menu Content */}
        <div className="flex flex-col h-full overflow-y-auto pb-20">
          
          {/* Wallet Balance Section */}
          {walletData && (
            <div className="p-4 border-b border-gray-800">
              <div className="flex items-center gap-2 mb-3">
                <Wallet className="w-4 h-4 text-green-400" />
                <span className="text-gray-400 text-xs font-semibold uppercase">
                  Wallet Balance
                </span>
              </div>
              
              <div className="bg-[#1a1a1a] rounded-lg p-3 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 text-xs">Total</span>
                  <span className="text-white font-semibold">
                    ${walletData.totalWalletBalance?.toFixed(2) || '0.00'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 text-xs">Available</span>
                  <span className="text-green-400 font-semibold text-sm">
                    ${walletData.availableBalance?.toFixed(2) || '0.00'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 text-xs">Unrealized PNL</span>
                  <span className={`font-semibold text-sm ${
                    (walletData.totalUnrealizedProfit || 0) >= 0 
                      ? 'text-green-400' 
                      : 'text-red-400'
                  }`}>
                    ${walletData.totalUnrealizedProfit?.toFixed(2) || '0.00'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Menu Items */}
          <div className="flex-1 p-4 space-y-2">
            <button
              onClick={handleSettingsClick}
              className="w-full flex items-center gap-3 p-3 hover:bg-gray-800/50 rounded-lg transition-colors text-left"
            >
              <Settings className="w-5 h-5 text-gray-400" />
              <span className="text-white">Settings</span>
            </button>

            <button
              onClick={handleLogoutClick}
              className="w-full flex items-center gap-3 p-3 hover:bg-red-600/10 rounded-lg transition-colors text-left group"
            >
              <LogOut className="w-5 h-5 text-gray-400 group-hover:text-red-400" />
              <span className="text-white group-hover:text-red-400">Logout</span>
            </button>
          </div>

          {/* Footer Info */}
          <div className="p-4 border-t border-gray-800">
            <div className="text-gray-500 text-xs text-center">
              FJOR Terminal v1.0
            </div>
            <div className="text-gray-600 text-xs text-center mt-1">
              © 2025 All rights reserved
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default MobileMenu;

