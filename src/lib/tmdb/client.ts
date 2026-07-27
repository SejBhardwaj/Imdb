import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { TMDB_CONFIG } from '@/config/tmdb';

class TMDBClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: TMDB_CONFIG.BASE_URL,
      params: {
        api_key: TMDB_CONFIG.API_KEY,
      },
      timeout: 10000,
    });

    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response) {
          console.error('TMDB API Error:', error.response.data);
        } else if (error.request) {
          console.error('TMDB Network Error:', error.request);
        } else {
          console.error('TMDB Error:', error.message);
        }
        return Promise.reject(error);
      }
    );
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get<T>(url, config);
    return response.data;
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.post<T>(url, data, config);
    return response.data;
  }
}

export const tmdbClient = new TMDBClient();
