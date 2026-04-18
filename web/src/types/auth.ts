// 会员认证相关类型定义

export type MembershipTier = 'FREE' | 'BASIC' | 'PRO' | 'ENTERPRISE';

export interface User {
  id: string;
  email: string;
  name: string | null;
  membership: MembershipTier;
  aiQuotaTotal: number;
  aiQuotaUsed: number;
  createdAt: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}
