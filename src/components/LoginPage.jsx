import React, { useState } from 'react';
import { Eye, EyeOff, Mail, Lock, User, ArrowRight, Shield, Zap } from 'lucide-react';
import FjorTerminalLogo from './FjorTerminalLogo';
import ForgotPasswordModal from './ForgotPasswordModal';

const LoginPage = ({ onLogin, onRegister, isLoading = false }) => {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    username: '',
    rememberMe: false
  });

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isLoginMode) {
      onLogin(formData);
    } else {
      onRegister(formData);
    }
  };

  const toggleMode = () => {
    setIsLoginMode(!isLoginMode);
    setFormData({
      email: '',
      password: '',
      confirmPassword: '',
      username: '',
      rememberMe: false
    });
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[#0a0a0a]">
        <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a1a] via-[#0a0a0a] to-[#1a1a1a] opacity-50"></div>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23333%22%20fill-opacity%3D%220.1%22%3E%3Ccircle%20cx%3D%2230%22%20cy%3D%2230%22%20r%3D%221%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-20"></div>
      </div>

      {/* Login Container */}
      <div className="relative z-10 w-full max-w-md">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <FjorTerminalLogo size={48} />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">FjorTerminal</h1>
          <p className="text-gray-400 text-sm">
            {isLoginMode ? 'Sign in to your account' : 'Create a new account'}
          </p>
        </div>

        {/* Login Form */}
        <div className="bg-[#1a1a1a] border border-[#333] rounded-lg p-6 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username (Register only) */}
            {!isLoginMode && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  <User className="w-4 h-4 inline mr-2" />
                  Username
                </label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  required={!isLoginMode}
                  className="w-full bg-[#0f0f0f] border border-[#333] rounded-lg px-3 py-3 text-white placeholder-gray-500 focus:border-blue-400 focus:outline-none transition-colors"
                  placeholder="Enter your username"
                />
              </div>
            )}

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <Mail className="w-4 h-4 inline mr-2" />
                Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                className="w-full bg-[#0f0f0f] border border-[#333] rounded-lg px-3 py-3 text-white placeholder-gray-500 focus:border-blue-400 focus:outline-none transition-colors"
                placeholder="example@email.com"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <Lock className="w-4 h-4 inline mr-2" />
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                  className="w-full bg-[#0f0f0f] border border-[#333] rounded-lg px-3 py-3 pr-10 text-white placeholder-gray-500 focus:border-blue-400 focus:outline-none transition-colors"
                  placeholder="Enter your password"
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

            {/* Confirm Password (Register only) */}
            {!isLoginMode && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  <Shield className="w-4 h-4 inline mr-2" />
                  Confirm Password
                </label>
              <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  required={!isLoginMode}
                  className="w-full bg-[#0f0f0f] border border-[#333] rounded-lg px-3 py-3 text-white placeholder-gray-500 focus:border-blue-400 focus:outline-none transition-colors"
                  placeholder="Confirm your password"
                />
              </div>
            )}

            {/* Remember Me (Login only) */}
            {isLoginMode && (
              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="rememberMe"
                  checked={formData.rememberMe}
                  onChange={handleInputChange}
                  className="w-4 h-4 text-blue-600 bg-[#0f0f0f] border-[#333] rounded focus:ring-blue-500 focus:ring-2"
                />
                <label className="ml-2 text-sm text-gray-300">
                  Remember me
                </label>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-600 disabled:to-gray-700 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-center space-x-2 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>{isLoginMode ? 'Signing in...' : 'Registering...'}</span>
                </>
              ) : (
                <>
                  <span>{isLoginMode ? 'Sign In' : 'Sign Up'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Mode Toggle */}
          <div className="mt-6 text-center">
            <p className="text-gray-400 text-sm">
              {isLoginMode ? "Don't have an account?" : 'Already have an account?'}
              <button
                onClick={toggleMode}
                className="ml-1 text-blue-400 hover:text-blue-300 font-medium transition-colors"
              >
                {isLoginMode ? 'Sign up' : 'Sign in'}
              </button>
            </p>
          </div>

          {/* Forgot Password (Login only) */}
          {isLoginMode && (
            <div className="mt-4 text-center">
              <button
                onClick={() => setShowForgotPasswordModal(true)}
                className="text-gray-400 hover:text-blue-400 text-sm transition-colors"
              >
                Forgot password
              </button>
            </div>
          )}
        </div>

        {/* Features Preview */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
          <div className="bg-[#1a1a1a] border border-[#333] rounded-lg p-4">
            <div className="text-blue-400 mb-2">
              <Zap className="w-6 h-6 mx-auto" />
            </div>
            <h3 className="text-white font-medium text-sm mb-1">Fast Trading</h3>
            <p className="text-gray-400 text-xs">Real-time transactions</p>
          </div>
          <div className="bg-[#1a1a1a] border border-[#333] rounded-lg p-4">
            <div className="text-green-400 mb-2">
              <Shield className="w-6 h-6 mx-auto" />
            </div>
            <h3 className="text-white font-medium text-sm mb-1">Secure</h3>
            <p className="text-gray-400 text-xs">Industry-standard security</p>
          </div>
          <div className="bg-[#1a1a1a] border border-[#333] rounded-lg p-4">
            <div className="text-yellow-400 mb-2">
              <User className="w-6 h-6 mx-auto" />
            </div>
            <h3 className="text-white font-medium text-sm mb-1">Personal</h3>
            <p className="text-gray-400 text-xs">Customizable experience</p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-gray-500 text-xs">
            © 2025 FjorTerminal. All rights reserved.
          </p>
          <p className="text-gray-600 text-xs mt-1">
            Cryptocurrency trading involves high risk.
          </p>
        </div>
      </div>

      {/* Forgot Password Modal */}
      <ForgotPasswordModal
        isOpen={showForgotPasswordModal}
        onClose={() => setShowForgotPasswordModal(false)}
      />
    </div>
  );
};

export default LoginPage;
