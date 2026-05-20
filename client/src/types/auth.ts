export interface AuthUser {
  id: string;
  email: string;
  role: string;
  fullName: string;
  schoolId: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}
