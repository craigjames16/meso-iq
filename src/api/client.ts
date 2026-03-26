import { API_URL } from '../config/env';
import { storage } from '../utils/storage';

export interface ApiError {
  message: string;
  status?: number;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async getAuthHeaders(): Promise<Record<string, string>> {
    const token = await storage.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    // Get content type to check if it's JSON
    const contentType = response.headers.get('content-type');
    const isJson = contentType?.includes('application/json');
    
    // Get response text first to handle both JSON and non-JSON responses
    const text = await response.text();
    
    // Check if response is HTML (likely a redirect to login page)
    const isHtml = text.trim().startsWith('<!DOCTYPE html>') || text.trim().startsWith('<html');
    
    if (isHtml) {
      // HTML response usually means we're being redirected to login (401)
      console.warn('Received HTML response (likely authentication redirect)');
      await storage.clearAll();
      throw new Error('Unauthorized - Please sign in again');
    }
    
    if (!response.ok) {
      let errorData: Record<string, unknown> = {};

      const trimmed = text?.trim() ?? '';
      const looksLikeJson = trimmed.startsWith('{') || trimmed.startsWith('[');

      if (trimmed && (isJson || looksLikeJson)) {
        try {
          errorData = JSON.parse(text) as Record<string, unknown>;
        } catch {
          errorData = { message: text || response.statusText || 'An error occurred' };
        }
      } else if (trimmed) {
        errorData = { message: text };
      } else {
        errorData = { message: response.statusText || 'An error occurred' };
      }

      const errField = errorData.error;
      const msgField = errorData.message;
      const errorMessage =
        (typeof errField === 'string' && errField) ||
        (typeof msgField === 'string' && msgField) ||
        response.statusText ||
        'An error occurred';

      // Handle 401 Unauthorized - token expired or invalid
      if (response.status === 401) {
        await storage.clearAll();
        throw new Error('Unauthorized - Please sign in again');
      }

      // Throw as Error instance so it can be caught properly
      const errorInstance = new Error(errorMessage);
      (errorInstance as any).status = response.status;
      (errorInstance as any).errorData = errorData;
      throw errorInstance;
    }

    // Handle successful response
    if (!text) {
      // Empty response - return empty object or null based on type
      return {} as T;
    }

    if (!isJson) {
      // Non-JSON response - this shouldn't happen for successful API calls
      console.error('Non-JSON response received for successful request:', text.substring(0, 200));
      throw new Error('Invalid response format: expected JSON');
    }

    try {
      return JSON.parse(text) as T;
    } catch (e) {
      console.error('JSON parse error:', e, 'Response text:', text.substring(0, 200));
      throw new Error(`Failed to parse JSON response: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  }

  async get<T>(endpoint: string): Promise<T> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'GET',
      headers,
    });

    return this.handleResponse<T>(response);
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers,
      body: data ? JSON.stringify(data) : undefined,
    });

    return this.handleResponse<T>(response);
  }

  async put<T>(endpoint: string, data?: any): Promise<T> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'PUT',
      headers,
      body: data ? JSON.stringify(data) : undefined,
    });

    return this.handleResponse<T>(response);
  }

  async delete<T>(endpoint: string, data?: any): Promise<T> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'DELETE',
      headers,
      body: data ? JSON.stringify(data) : undefined,
    });

    return this.handleResponse<T>(response);
  }

  async patch<T>(endpoint: string, data?: any): Promise<T> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'PATCH',
      headers,
      body: data ? JSON.stringify(data) : undefined,
    });

    return this.handleResponse<T>(response);
  }
}

export const apiClient = new ApiClient(API_URL);


