import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw, Settings, LogOut, User, Lock, Eye, EyeOff, X } from 'lucide-react';
import SettingsModal from './SettingsModal';
import FjorTerminalLogo from './FjorTerminalLogo';
import authService from '../services/authService';
import { showSuccess, showError } from './NotificationSystem';

const Header = ({ 
  onTickerShortcutsChange, 
  onPositionSettingsChange, 
  onLeverageSettingsChange, 
  onExchangeSettingsChange, 
  onCryptoDetectedCoinsChange, 
  tickerShortcuts = [], 
  positionSettings = {}, 
  leverageSettings = {}, 
  exchangeSettings = {}, 
  cryptoDetectedCoins = [], 
  walletData = {},
  currentUser = null,
  onLogout = () => {}
}) => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const userMenuRef = useRef(null);
  const userButtonRef = useRef(null);
  
  // Change password form state
  const [changePasswordData, setChangePasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Calculate dropdown position
  const calculateDropdownPosition = () => {
    if (userButtonRef.current) {
      const rect = userButtonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 8, // 8px gap below button
        left: rect.right - 256 // 256px is dropdown width, align to right
      });
    }
  };

  // Toggle user menu and calculate position
  const toggleUserMenu = () => {
    if (!isUserMenuOpen) {
      calculateDropdownPosition();
    }
    setIsUserMenuOpen(!isUserMenuOpen);
  };

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target) &&
          userButtonRef.current && !userButtonRef.current.contains(event.target)) {
        setIsUserMenuOpen(false);
      }
    };

    if (isUserMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isUserMenuOpen]);

  // Recalculate position on window resize
  useEffect(() => {
    if (isUserMenuOpen) {
      const handleResize = () => calculateDropdownPosition();
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, [isUserMenuOpen]);

  // Helper functions
  const getUserInitials = () => {
    if (!currentUser) return 'U';
    if (currentUser.username) {
      return currentUser.username.substring(0, 2).toUpperCase();
    }
    if (currentUser.email) {
      return currentUser.email.substring(0, 2).toUpperCase();
    }
    return 'U';
  };

  const getUserDisplayName = () => {
    if (!currentUser) return 'User';
    return currentUser.username || currentUser.email?.split('@')[0] || 'User';
  };

  const getUserEmail = () => {
    if (!currentUser) return '';
    return currentUser.email || '';
  };

  // Handle change password
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setIsChangingPassword(true);

    try {
      // Validate passwords
      if (changePasswordData.newPassword !== changePasswordData.confirmNewPassword) {
        showError('Password Mismatch', 'New passwords do not match', null, 4000);
        setIsChangingPassword(false);
        return;
      }

      if (changePasswordData.newPassword.length < 6) {
        showError('Invalid Password', 'Password must be at least 6 characters', null, 4000);
        setIsChangingPassword(false);
        return;
      }

      const result = await authService.changePassword(
        changePasswordData.currentPassword,
        changePasswordData.newPassword,
        changePasswordData.confirmNewPassword
      );

      if (result.success) {
        showSuccess('Password Changed', 'Your password has been changed successfully', null, 4000);
        setIsChangePasswordOpen(false);
        setChangePasswordData({
          currentPassword: '',
          newPassword: '',
          confirmNewPassword: ''
        });
      } else {
        showError('Change Password Failed', result.error || 'Failed to change password', null, 4000);
      }
    } catch (error) {
      showError('Error', error.message || 'An error occurred while changing password', null, 4000);
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Format balance for display (remove $ sign if already exists, parse and format)
  const formatBalance = (balance) => {
    if (!balance || balance === '0.00') return '0.00';
    
    // Remove $ sign and any commas
    const cleanBalance = balance.toString().replace(/[$,]/g, '');
    const numBalance = parseFloat(cleanBalance);
    
    if (isNaN(numBalance)) return '0.00';
    
    // Format with thousands separator and 2 decimal places
    return numBalance.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  return (
    <div className="w-full">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between bg-[#121212] border border-[#222222] p-2 md:p-3 space-y-2 md:space-y-0 md:space-x-4 text-xs md:text-sm overflow-x-auto">
        {/* Left top section */}
        <div className="flex items-center space-x-2 flex-shrink-0">
          <FjorTerminalLogo size={24} />
        </div>
        
        {/* Center top text */}
        
        
        {/* Right top balances and user info */}
        <div className="flex items-center space-x-4 text-[10px] md:text-xs whitespace-nowrap flex-shrink-0">
                  <div className="text-right">
                    <div className="font-semibold">
                      ${formatBalance(walletData.walletBalance)}
                    </div>
                    <div className="text-white/60">
                      Wallet Balance
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="font-semibold">
                      ${formatBalance(walletData.availableBalance)}
                    </div>
                    <div className="text-white/60">
                      Available Balance
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className={`font-semibold ${parseFloat(walletData.unrealizedProfit?.toString().replace(/[$,]/g, '') || '0') >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      ${formatBalance(walletData.unrealizedProfit)}
                    </div>
                    <div className="text-white/60">
                      Unrealized Profit
                    </div>
                  </div>
          
          <div className="flex items-center space-x-1">
            <span className="text-[11px] font-semibold">
              {walletData.isConnected ? '✅ Connected' : '❌ Not Connected'}
            </span>
          </div>
          
          <button 
            onClick={() => setIsSettingsOpen(true)}
            aria-label="Settings" 
            className="flex items-center space-x-1 border border-white/30 rounded px-2 py-1 text-[11px] text-white/70 hover:text-white hover:border-white transition-colors"
          >
            <Settings className="w-3 h-3" />
            <span>Settings</span>
          </button>
          
          {/* User Profile Dropdown */}
          <div className="relative">
            <button
              ref={userButtonRef}
              onClick={toggleUserMenu}
              className="flex items-center space-x-2 border border-white/30 rounded px-2 py-1 text-[11px] hover:bg-white/10 transition-colors"
            >
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center text-xs font-bold text-white">
                {getUserInitials()}
              </div>
              <span className="font-semibold text-white">
                {getUserDisplayName()}
              </span>
            </button>
          </div>
          
          <button 
            onClick={() => window.location.reload()}
            aria-label="Refresh" 
            className="w-7 h-7 rounded-full border border-white/30 flex items-center justify-center hover:bg-white/10 transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
          </button>
        </div>
      </div>
      
      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onTickerShortcutsChange={onTickerShortcutsChange}
        onPositionSettingsChange={onPositionSettingsChange}
        onLeverageSettingsChange={onLeverageSettingsChange}
        onExchangeSettingsChange={onExchangeSettingsChange}
        onCryptoDetectedCoinsChange={onCryptoDetectedCoinsChange}
        tickerShortcuts={tickerShortcuts}
        positionSettings={positionSettings}
        leverageSettings={leverageSettings}
        exchangeSettings={exchangeSettings}
        cryptoDetectedCoins={cryptoDetectedCoins}
      />

      {/* User Dropdown Menu - Fixed Position Portal */}
      {isUserMenuOpen && (
        <div
          ref={userMenuRef}
          className="fixed w-64 bg-[#1a1a1a] border border-[#333] rounded-lg shadow-2xl overflow-hidden"
          style={{
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
            zIndex: 9999
          }}
        >
          {/* User Info Section */}
          <div className="p-4 border-b border-[#333]">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center text-lg font-bold text-white flex-shrink-0">
                {getUserInitials()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-white text-sm truncate">
                  {getUserDisplayName()}
                </div>
                <div className="text-gray-400 text-xs truncate">
                  {getUserEmail()}
                </div>
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <div className="py-2">
            <button
              onClick={() => {
                setIsUserMenuOpen(false);
                setIsSettingsOpen(true);
              }}
              className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-gray-300 hover:bg-white/10 transition-colors"
            >
              <User className="w-4 h-4" />
              <span>Profile Settings</span>
            </button>
            
            <button
              onClick={() => {
                setIsUserMenuOpen(false);
                setIsChangePasswordOpen(true);
              }}
              className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-gray-300 hover:bg-white/10 transition-colors"
            >
              <Lock className="w-4 h-4" />
              <span>Change Password</span>
            </button>
            
            <button
              onClick={() => {
                setIsUserMenuOpen(false);
                onLogout();
              }}
              className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {isChangePasswordOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-75">
          <div className="relative w-full max-w-md bg-[#1a1a1a] border border-[#333] rounded-lg shadow-2xl">
            {/* Close Button */}
            <button
              onClick={() => {
                setIsChangePasswordOpen(false);
                setChangePasswordData({
                  currentPassword: '',
                  newPassword: '',
                  confirmNewPassword: ''
                });
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="p-6">
              {/* Header */}
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-white mb-2">
                  Change Password
                </h2>
                <p className="text-gray-400 text-sm">
                  Enter your current password and choose a new one
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleChangePassword} className="space-y-4">
                {/* Current Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    <Lock className="w-4 h-4 inline mr-2" />
                    Current Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPasswords.current ? 'text' : 'password'}
                      value={changePasswordData.currentPassword}
                      onChange={(e) => setChangePasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                      required
                      className="w-full bg-[#0f0f0f] border border-[#333] rounded-lg px-3 py-3 pr-10 text-white placeholder-gray-500 focus:border-blue-400 focus:outline-none transition-colors"
                      placeholder="Enter your current password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                    >
                      {showPasswords.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* New Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    <Lock className="w-4 h-4 inline mr-2" />
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPasswords.new ? 'text' : 'password'}
                      value={changePasswordData.newPassword}
                      onChange={(e) => setChangePasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                      required
                      className="w-full bg-[#0f0f0f] border border-[#333] rounded-lg px-3 py-3 pr-10 text-white placeholder-gray-500 focus:border-blue-400 focus:outline-none transition-colors"
                      placeholder="Enter your new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                    >
                      {showPasswords.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm New Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    <Lock className="w-4 h-4 inline mr-2" />
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPasswords.confirm ? 'text' : 'password'}
                      value={changePasswordData.confirmNewPassword}
                      onChange={(e) => setChangePasswordData(prev => ({ ...prev, confirmNewPassword: e.target.value }))}
                      required
                      className="w-full bg-[#0f0f0f] border border-[#333] rounded-lg px-3 py-3 pr-10 text-white placeholder-gray-500 focus:border-blue-400 focus:outline-none transition-colors"
                      placeholder="Confirm your new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                    >
                      {showPasswords.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="flex space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsChangePasswordOpen(false);
                      setChangePasswordData({
                        currentPassword: '',
                        newPassword: '',
                        confirmNewPassword: ''
                      });
                    }}
                    className="flex-1 bg-[#0f0f0f] border border-[#333] text-gray-300 font-semibold py-3 px-4 rounded-lg transition-all duration-200 hover:bg-[#1a1a1a]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isChangingPassword}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-600 disabled:to-gray-700 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-center space-x-2 disabled:cursor-not-allowed"
                  >
                    {isChangingPassword ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Changing...</span>
                      </>
                    ) : (
                      'Change Password'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Header;
