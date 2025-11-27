import authService from './authService';

class UserSettingsService {
  constructor() {
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || '';
    this.baseURL = apiBaseUrl ? `${apiBaseUrl}/api` : '/api';
  }

  async getAuthHeaders() {
    const token = authService.getAccessToken();
    if (!token) {
      throw new Error('Not authenticated');
    }

    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  }

  // Get user settings
  async getUserSettings() {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseURL}/UserSettings`, {
        method: 'GET',
        headers
      });

      if (!response.ok) {
        // If 401, token might be expired - clear and force re-login
        if (response.status === 401) {
          console.warn('⚠️ 401 Unauthorized - Token expired, clearing auth');
          authService.clearTokens();
          window.location.reload();
          return { success: false, error: 'Session expired, please login again' };
        }
        
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to get user settings');
      }

      const data = await response.json();
      console.log('✅ User settings loaded from backend:', data);
      
      return {
        success: true,
        settings: {
          tickerShortcuts: data.tickerShortcuts ? JSON.parse(data.tickerShortcuts) : [],
          positionSettings: data.positionSettings ? JSON.parse(data.positionSettings) : {},
          leverageSettings: data.leverageSettings ? JSON.parse(data.leverageSettings) : {},
          cryptoDetectedCoins: data.cryptoDetectedCoins ? JSON.parse(data.cryptoDetectedCoins) : []
        }
      };
    } catch (error) {
      console.error('❌ Failed to get user settings:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Update user settings
  async updateUserSettings(settings) {
    try {
      const headers = await this.getAuthHeaders();
      
      // Convert objects/arrays to JSON strings
      const payload = {
        tickerShortcuts: settings.tickerShortcuts ? JSON.stringify(settings.tickerShortcuts) : null,
        positionSettings: settings.positionSettings ? JSON.stringify(settings.positionSettings) : null,
        leverageSettings: settings.leverageSettings ? JSON.stringify(settings.leverageSettings) : null,
        cryptoDetectedCoins: settings.cryptoDetectedCoins ? JSON.stringify(settings.cryptoDetectedCoins) : null
      };

      const response = await fetch(`${this.baseURL}/UserSettings`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to update user settings');
      }

      console.log('✅ User settings updated on backend');
      return {
        success: true
      };
    } catch (error) {
      console.error('❌ Failed to update user settings:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Delete user settings
  async deleteUserSettings() {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseURL}/UserSettings`, {
        method: 'DELETE',
        headers
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to delete user settings');
      }

      console.log('✅ User settings deleted from backend');
      return {
        success: true
      };
    } catch (error) {
      console.error('❌ Failed to delete user settings:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

const userSettingsService = new UserSettingsService();
export default userSettingsService;

