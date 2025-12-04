import axios, { AxiosError, AxiosInstance } from "axios";

// API base URL
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

// Error response type
export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
  };
}

// Create axios instance
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000,
});

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    // Can add auth headers here if needed in the future
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiError>) => {
    // Extract error message
    const errorMessage =
      error.response?.data?.error?.message ||
      error.message ||
      "An error occurred";

    // Log error for debugging
    console.error("API Error:", {
      status: error.response?.status,
      message: errorMessage,
      code: error.response?.data?.error?.code,
    });

    return Promise.reject(error);
  }
);

// Helper function to handle API errors
export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ApiError>;
    return (
      axiosError.response?.data?.error?.message ||
      axiosError.message ||
      "APIエラーが発生しました"
    );
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "不明なエラーが発生しました";
}

export default apiClient;
