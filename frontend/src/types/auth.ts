export interface User {
  id: string
  email: string
  username?: string
  firstName: string
  lastName: string
  avatar?: string
  role: 'STUDENT' | 'TEACHER' | 'ADMIN'
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'PENDING_VERIFICATION'
  tenantId?: string
  lastLoginAt?: string
  emailVerified?: string
  createdAt: string
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  email: string
  password: string
  firstName: string
  lastName: string
  username?: string
  role?: 'STUDENT' | 'TEACHER'
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

export interface AuthResponse {
  success: boolean
  data?: {
    user: User
    tokens: AuthTokens
  }
  error?: string
}

export interface AuthContextType {
  user: User | null
  tokens: AuthTokens | null
  isLoading: boolean
  login: (credentials: LoginCredentials) => Promise<void>
  register: (data: RegisterData) => Promise<void>
  logout: () => void
  refreshToken: () => Promise<void>
}