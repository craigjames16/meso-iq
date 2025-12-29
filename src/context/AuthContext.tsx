import React, { createContext, useState, useEffect, useCallback } from 'react';
import { AuthContextType, AuthState, SignInCredentials, SignUpCredentials, User } from '../types/auth';
import { authService } from '../services/authService';
import { storage } from '../utils/storage';

const initialState: AuthState = {
  user: null,
  token: null,
  isLoading: true,
  isAuthenticated: false,
};

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [state, setState] = useState<AuthState>(initialState);

  const loadStoredAuth = useCallback(async () => {
    try {
      const token = await storage.getToken();
      const user = await storage.getUser();

      if (token && user) {
        // Validate token by checking session
        const isValid = await authService.validateToken();
        if (isValid) {
          setState({
            user: user as User,
            token,
            isLoading: false,
            isAuthenticated: true,
          });
        } else {
          // Token invalid, clear storage
          await storage.clearAll();
          setState({
            user: null,
            token: null,
            isLoading: false,
            isAuthenticated: false,
          });
        }
      } else {
        setState({
          user: null,
          token: null,
          isLoading: false,
          isAuthenticated: false,
        });
      }
    } catch (error) {
      console.error('Error loading stored auth:', error);
      await storage.clearAll();
      setState({
        user: null,
        token: null,
        isLoading: false,
        isAuthenticated: false,
      });
    }
  }, []);

  useEffect(() => {
    loadStoredAuth();
  }, [loadStoredAuth]);

  const signIn = useCallback(async (credentials: SignInCredentials) => {
    try {
      setState((prev) => ({ ...prev, isLoading: true }));
      const response = await authService.signIn(credentials);
      setState({
        user: response.user,
        token: response.token,
        isLoading: false,
        isAuthenticated: true,
      });
    } catch (error: any) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        isAuthenticated: false,
      }));
      throw error;
    }
  }, []);

  const signUp = useCallback(async (credentials: SignUpCredentials) => {
    try {
      setState((prev) => ({ ...prev, isLoading: true }));
      const response = await authService.signUp(credentials);
      setState({
        user: response.user,
        token: response.token,
        isLoading: false,
        isAuthenticated: true,
      });
    } catch (error: any) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        isAuthenticated: false,
      }));
      throw error;
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, isLoading: true }));
      await authService.signOut();
      setState({
        user: null,
        token: null,
        isLoading: false,
        isAuthenticated: false,
      });
    } catch (error: any) {
      // Even if signout fails, clear local state
      setState({
        user: null,
        token: null,
        isLoading: false,
        isAuthenticated: false,
      });
      throw error;
    }
  }, []);

  const refreshSession = useCallback(async () => {
    try {
      const session = await authService.getSession();
      if (session) {
        setState({
          user: session.user,
          token: session.token,
          isLoading: false,
          isAuthenticated: true,
        });
      } else {
        setState({
          user: null,
          token: null,
          isLoading: false,
          isAuthenticated: false,
        });
      }
    } catch (error) {
      setState({
        user: null,
        token: null,
        isLoading: false,
        isAuthenticated: false,
      });
    }
  }, []);

  const value: AuthContextType = {
    ...state,
    signIn,
    signUp,
    signOut,
    refreshSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

