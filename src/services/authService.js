// Authentication Service for FjorTerminal
// Handles user login, registration, and token management

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL + "/api/v1";

class AuthService {
  constructor() {
    this.accessToken = null;
    this.refreshToken = null;
    this.currentUser = null;
    this.loadTokensFromStorage();
  }

  // Load tokens from localStorage
  loadTokensFromStorage() {
    this.accessToken = localStorage.getItem('accessToken');
    this.refreshToken = localStorage.getItem('refreshToken');
    const userStr = localStorage.getItem('currentUser');
    if (userStr) {
      try {
        this.currentUser = JSON.parse(userStr);
      } catch (error) {
        console.error('Error parsing user data:', error);
        this.currentUser = null;
      }
    }
  }

  // Save tokens to localStorage
  saveTokensToStorage(accessToken, refreshToken, user) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    this.currentUser = user;
    
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('currentUser', JSON.stringify(user));
  }

  // Clear tokens from localStorage
  clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
    this.currentUser = null;
    
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('currentUser');
  }

  // Register new user
  async register(userData) {
    try {
      console.log('🔐 Registering new user:', userData.email);
      
      // Validate password match
      if (userData.password !== userData.confirmPassword) {
        throw new Error('Şifreler eşleşmiyor');
      }

      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: userData.email,
          password: userData.password,
          confirmPassword: userData.confirmPassword,
          username: userData.username || userData.email.split('@')[0],
          firstName: userData.firstName || null,
          lastName: userData.lastName || null
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Kayıt başarısız');
      }

      console.log('✅ Registration successful:', data);

      // Save tokens and user data
      if (data.data && data.data.accessToken) {
        this.saveTokensToStorage(
          data.data.accessToken,
          data.data.refreshToken,
          data.data.user
        );
      }

      return {
        success: true,
        user: data.data.user,
        message: 'Kayıt başarılı!'
      };
    } catch (error) {
      console.error('❌ Registration error:', error);
      return {
        success: false,
        error: error.message || 'Kayıt başarısız'
      };
    }
  }

  // Login user
  async login(credentials) {
    try {
      console.log('🔐 Logging in user:', credentials.email);

      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: credentials.email,
          password: credentials.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Giriş başarısız');
      }

      console.log('✅ Login successful:', data);

      // Save tokens and user data
      if (data.data && data.data.accessToken) {
        this.saveTokensToStorage(
          data.data.accessToken,
          data.data.refreshToken,
          data.data.user
        );
      }

      return {
        success: true,
        user: data.data.user,
        message: 'Giriş başarılı!'
      };
    } catch (error) {
      console.error('❌ Login error:', error);
      return {
        success: false,
        error: error.message || 'Giriş başarısız'
      };
    }
  }

  // Logout user
  async logout() {
    try {
      console.log('🔐 Logging out user');

      // Call logout endpoint if we have a token
      if (this.accessToken) {
        await fetch(`${API_BASE_URL}/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.accessToken}`
          },
        });
      }

      // Clear tokens regardless of API response
      this.clearTokens();

      return {
        success: true,
        message: 'Çıkış başarılı'
      };
    } catch (error) {
      console.error('❌ Logout error:', error);
      // Clear tokens even if API call fails
      this.clearTokens();
      return {
        success: true,
        message: 'Çıkış başarılı'
      };
    }
  }

  // Refresh access token
  async refreshAccessToken() {
    try {
      if (!this.refreshToken) {
        console.log('ℹ️ No refresh token available, skipping refresh');
        return {
          success: false,
          error: 'No refresh token available'
        };
      }

      console.log('🔄 Refreshing access token');

      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accessToken: this.accessToken,
          refreshToken: this.refreshToken,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Token refresh failed');
      }

      console.log('✅ Token refreshed successfully');

      // Update access token
      this.accessToken = data.data.accessToken;
      localStorage.setItem('accessToken', data.data.accessToken);

      // Update refresh token if provided
      if (data.data.refreshToken) {
        this.refreshToken = data.data.refreshToken;
        localStorage.setItem('refreshToken', data.data.refreshToken);
      }

      return {
        success: true,
        accessToken: data.data.accessToken
      };
    } catch (error) {
      console.warn('⚠️ Token refresh failed:', error.message);
      // Don't clear tokens on refresh failure - let them expire naturally
      // Only clear if explicitly logged out or token is invalid (401 on actual API call)
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Check if user is authenticated
  isAuthenticated() {
    return !!this.accessToken && !!this.currentUser;
  }

  // Get current user
  getCurrentUser() {
    // Always get from localStorage to ensure we have the latest user
    if (!this.currentUser) {
      const userStr = localStorage.getItem('currentUser');
      if (userStr) {
        try {
          this.currentUser = JSON.parse(userStr);
        } catch (error) {
          console.error('Error parsing user data:', error);
        }
      }
    }
    return this.currentUser;
  }

  // Get access token
  getAccessToken() {
    // Always get from localStorage to ensure we have the latest token
    if (!this.accessToken) {
      this.accessToken = localStorage.getItem('accessToken');
    }
    return this.accessToken;
  }

  // Get refresh token
  getRefreshToken() {
    // Always get from localStorage to ensure we have the latest token
    if (!this.refreshToken) {
      this.refreshToken = localStorage.getItem('refreshToken');
    }
    return this.refreshToken;
  }

  // Get authorization headers
  getAuthHeaders() {
    if (!this.accessToken) {
      return {
        'Content-Type': 'application/json'
      };
    }

    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.accessToken}`
    };
  }

  // Forgot password - request reset code
  async forgotPassword(email) {
    try {
      console.log('🔐 Requesting password reset for:', email);

      const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Şifre sıfırlama talebi başarısız');
      }

      console.log('✅ Password reset code sent');
      return {
        success: true,
        message: data.message || 'Şifre sıfırlama kodu e-posta adresinize gönderildi'
      };
    } catch (error) {
      console.error('❌ Forgot password error:', error);
      return {
        success: false,
        error: error.message || 'Şifre sıfırlama talebi başarısız'
      };
    }
  }

  // Reset password with code
  async resetPassword(email, resetCode, newPassword, confirmPassword) {
    try {
      console.log('🔐 Resetting password for:', email);

      if (newPassword !== confirmPassword) {
        throw new Error('Şifreler eşleşmiyor');
      }

      const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          resetCode,
          newPassword,
          confirmPassword
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Şifre sıfırlama başarısız');
      }

      console.log('✅ Password reset successful');
      return {
        success: true,
        message: data.message || 'Şifreniz başarıyla sıfırlandı'
      };
    } catch (error) {
      console.error('❌ Reset password error:', error);
      return {
        success: false,
        error: error.message || 'Şifre sıfırlama başarısız'
      };
    }
  }

  // Change password
  async changePassword(currentPassword, newPassword, confirmNewPassword) {
    try {
      const headers = this.getAuthHeaders();
      
      const response = await fetch(`${API_BASE_URL}/users/password`, {
        method: 'PUT',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmNewPassword
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to change password');
      }

      return {
        success: true,
        message: data.message || 'Password changed successfully'
      };
    } catch (error) {
      console.error('❌ Change password error:', error);
      return {
        success: false,
        error: error.message || 'Failed to change password'
      };
    }
  }

  // Make authenticated API request with automatic token refresh
  async authenticatedRequest(url, options = {}) {
    try {
      // Add auth headers
      options.headers = {
        ...options.headers,
        ...this.getAuthHeaders()
      };

      let response = await fetch(url, options);

      // If unauthorized, try to refresh token
      if (response.status === 401) {
        console.log('🔄 Token expired, attempting refresh...');
        const refreshResult = await this.refreshAccessToken();

        if (refreshResult.success) {
          // Retry request with new token
          options.headers['Authorization'] = `Bearer ${this.accessToken}`;
          response = await fetch(url, options);
        } else {
          throw new Error('Session expired. Please login again.');
        }
      }

      return response;
    } catch (error) {
      console.error('❌ Authenticated request error:', error);
      throw error;
    }
  }
}

// Create singleton instance
const authService = new AuthService();

export default authService;

