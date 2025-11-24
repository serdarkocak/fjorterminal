import React, { useState } from 'react';
import { X, Mail, Key, Lock, CheckCircle, Eye, EyeOff } from 'lucide-react';
import authService from '../services/authService';

const ForgotPasswordModal = ({ isOpen, onClose }) => {
  const [step, setStep] = useState(1); // 1: Email, 2: Code, 3: New Password, 4: Success
  const [email, setEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  if (!isOpen) return null;

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      const result = await authService.forgotPassword(email);
      if (result.success) {
        setSuccess(result.message);
        setStep(2);
      } else {
        setError(result.error || 'An error occurred');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCodeSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (resetCode.length !== 6) {
      setError('Code must be 6 digits');
      return;
    }

    setStep(3);
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      setIsLoading(false);
      return;
    }

    try {
      const result = await authService.resetPassword(email, resetCode, newPassword, confirmPassword);
      if (result.success) {
        setStep(4);
      } else {
        setError(result.error || 'Password reset failed');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setStep(1);
    setEmail('');
    setResetCode('');
    setNewPassword('');
    setConfirmPassword('');
    setError('');
    setSuccess('');
    onClose();
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
      setError('');
      setSuccess('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-75">
      <div className="relative w-full max-w-md bg-[#1a1a1a] border border-[#333] rounded-lg shadow-2xl">
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6">
          {/* Header */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-white mb-2">
              {step === 1 && 'Forgot Password'}
              {step === 2 && 'Verification Code'}
              {step === 3 && 'New Password'}
              {step === 4 && 'Success!'}
            </h2>
            <p className="text-gray-400 text-sm">
              {step === 1 && 'We will send a password reset code to your email address'}
              {step === 2 && 'Enter the 6-digit code sent to your email address'}
              {step === 3 && 'Set your new password'}
              {step === 4 && 'Your password has been successfully reset'}
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 bg-red-500/10 border border-red-500/30 text-red-500 rounded-lg p-3 text-sm">
              {error}
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="mb-4 bg-green-500/10 border border-green-500/30 text-green-500 rounded-lg p-3 text-sm">
              {success}
            </div>
          )}

          {/* Step 1: Email */}
          {step === 1 && (
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  <Mail className="w-4 h-4 inline mr-2" />
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full bg-[#0f0f0f] border border-[#333] rounded-lg px-3 py-3 text-white placeholder-gray-500 focus:border-blue-400 focus:outline-none transition-colors"
                  placeholder="example@email.com"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-600 disabled:to-gray-700 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-center space-x-2 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <span>Send Code</span>
                    <Mail className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Step 2: Code */}
          {step === 2 && (
            <form onSubmit={handleCodeSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  <Key className="w-4 h-4 inline mr-2" />
                  Verification Code
                </label>
                <input
                  type="text"
                  value={resetCode}
                  onChange={(e) => setResetCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  required
                  maxLength={6}
                  className="w-full bg-[#0f0f0f] border border-[#333] rounded-lg px-3 py-3 text-center text-2xl tracking-widest text-white placeholder-gray-500 focus:border-blue-400 focus:outline-none transition-colors"
                  placeholder="000000"
                />
                <p className="text-gray-500 text-xs mt-2 text-center">
                  Enter the 6-digit code sent to your email address
                </p>
              </div>

              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={handleBack}
                  className="flex-1 bg-[#0f0f0f] border border-[#333] text-gray-300 font-semibold py-3 px-4 rounded-lg transition-all duration-200 hover:bg-[#1a1a1a]"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={resetCode.length !== 6}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-600 disabled:to-gray-700 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 disabled:cursor-not-allowed"
                >
                  Verify
                </button>
              </div>
            </form>
          )}

          {/* Step 3: New Password */}
          {step === 3 && (
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  <Lock className="w-4 h-4 inline mr-2" />
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    className="w-full bg-[#0f0f0f] border border-[#333] rounded-lg px-3 py-3 pr-10 text-white placeholder-gray-500 focus:border-blue-400 focus:outline-none transition-colors"
                    placeholder="Enter your new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  <Lock className="w-4 h-4 inline mr-2" />
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="w-full bg-[#0f0f0f] border border-[#333] rounded-lg px-3 py-3 pr-10 text-white placeholder-gray-500 focus:border-blue-400 focus:outline-none transition-colors"
                    placeholder="Confirm your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={handleBack}
                  className="flex-1 bg-[#0f0f0f] border border-[#333] text-gray-300 font-semibold py-3 px-4 rounded-lg transition-all duration-200 hover:bg-[#1a1a1a]"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-600 disabled:to-gray-700 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-center space-x-2 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Resetting...</span>
                    </>
                  ) : (
                    'Reset Password'
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Step 4: Success */}
          {step === 4 && (
            <div className="text-center space-y-4">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
              </div>
              <h3 className="text-xl font-semibold text-white">Your Password Has Been Successfully Reset!</h3>
              <p className="text-gray-400 text-sm">
                You can now log in with your new password.
              </p>
              <button
                onClick={handleClose}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200"
              >
                OK
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordModal;

