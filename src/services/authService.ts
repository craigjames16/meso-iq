import { apiClient } from '../api/client';
import { endpoints } from '../api/endpoints';
import { storage } from '../utils/storage';
import { SignInCredentials, SignUpCredentials, User, AuthResponse } from '../types/auth';

export const authService = {
  async signIn(credentials: SignInCredentials): Promise<AuthResponse> {
    try {
      const response = await apiClient.post<{ user: User; token: string }>(
        endpoints.AUTH.SIGNIN,
        {
          email: credentials.email,
          password: credentials.password,
        }
      );

      if (!response.token || !response.user) {
        throw new Error('Authentication failed: Invalid response');
      }

      await storage.setToken(response.token);
      await storage.setUser(response.user);

      return {
        user: response.user,
        token: response.token,
      };
    } catch (error: any) {
      throw new Error(error.message || 'Sign in failed');
    }
  },

  async signUp(credentials: SignUpCredentials): Promise<AuthResponse> {
    try {
      const response = await apiClient.post<{ user: User; token: string }>(
        endpoints.AUTH.SIGNUP,
        {
          email: credentials.email,
          password: credentials.password,
        }
      );

      if (!response.token || !response.user) {
        throw new Error('Authentication failed: Invalid response');
      }

      await storage.setToken(response.token);
      await storage.setUser(response.user);

      return {
        user: response.user,
        token: response.token,
      };
    } catch (error: any) {
      throw new Error(error.message || 'Sign up failed');
    }
  },

  async deleteAccount(): Promise<void> {
    try {
      await apiClient.delete(endpoints.USERS);
      await storage.clearAll();
    } catch (error: any) {
      throw new Error(error.message || 'Failed to delete account');
    }
  },

  async signOut(): Promise<void> {
    try {
      // Call signout endpoint if available
      try {
        await apiClient.post(endpoints.AUTH.SIGNOUT);
      } catch (error) {
        // Endpoint might not exist, continue with local cleanup
        console.warn('Signout endpoint not available, clearing local storage only');
      }

      // Clear local storage
      await storage.clearAll();
    } catch (error: any) {
      // Even if API call fails, clear local storage
      await storage.clearAll();
      throw new Error(error.message || 'Sign out failed');
    }
  },

  async getSession(): Promise<{ user: User; token: string } | null> {
    try {
      // Try to get session from API
      const response = await apiClient.get<{ user: User; token?: string }>(
        endpoints.AUTH.SESSION
      );

      if (response.user) {
        const token = response.token || (await storage.getToken());
        if (token) {
          await storage.setToken(token);
          await storage.setUser(response.user);
          return {
            user: response.user,
            token,
          };
        }
      }

      // Fallback to local storage
      const token = await storage.getToken();
      const user = await storage.getUser();

      if (token && user) {
        return {
          user,
          token,
        };
      }

      return null;
    } catch (error) {
      // If API fails, check local storage
      const token = await storage.getToken();
      const user = await storage.getUser();

      if (token && user) {
        return {
          user,
          token,
        };
      }

      return null;
    }
  },

  async validateToken(): Promise<boolean> {
    try {
      const session = await this.getSession();
      return !!session;
    } catch (error) {
      return false;
    }
  },
};


