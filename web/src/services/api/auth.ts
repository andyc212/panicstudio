import type { LoginRequest, RegisterRequest, AuthResponse } from '@types';
import { apiClient } from './client';

export async function login(data: LoginRequest): Promise<AuthResponse> {
  const response = await apiClient.post<AuthResponse>('/auth/login', data);
  return response.data;
}

export async function register(data: RegisterRequest): Promise<AuthResponse> {
  const response = await apiClient.post<AuthResponse>('/auth/register', data);
  return response.data;
}

export async function getMe() {
  const response = await apiClient.get<{ user: AuthResponse['user'] }>('/auth/me');
  return response.data.user;
}
