/**
 * HTTP API client wrapper
 * TODO: Implement axios/fetch wrapper with base URL config, interceptors, and error handling
 */

import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { ApiResponse, ApiError, RequestConfig } from '@/types/api';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: BASE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // TODO: Add request interceptor for authentication
    // TODO: Add response interceptor for error handling
    // TODO: Add retry logic for failed requests
  }

  /**
   * TODO: Implement GET request wrapper
   */
  async get<T = unknown>(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.get<ApiResponse<T>>(url, config);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * TODO: Implement POST request wrapper
   */
  async post<T = unknown>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.post<ApiResponse<T>>(
        url,
        data,
        config
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * TODO: Implement PUT request wrapper
   */
  async put<T = unknown>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.put<ApiResponse<T>>(url, data, config);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * TODO: Implement DELETE request wrapper
   */
  async delete<T = unknown>(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.delete<ApiResponse<T>>(url, config);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * TODO: Implement error handling and logging
   */
  private handleError(error: unknown): ApiError {
    if (axios.isAxiosError(error)) {
      const apiError: ApiError = {
        code: error.response?.status.toString() || 'UNKNOWN',
        message: error.response?.data?.error || error.message,
        details: error.response?.data,
        timestamp: new Date().toISOString(),
      };
      return apiError;
    }

    return {
      code: 'UNKNOWN',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    };
  }
}

export const apiClient = new ApiClient();
