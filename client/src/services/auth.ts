import { api } from "@/lib/api";
import { clearTokens, setTokens } from "@/lib/auth-storage";
import type { AuthUser, LoginResponse } from "@/types/auth";

export async function login(email: string, password: string): Promise<AuthUser> {
  const response = await api.post<LoginResponse>("/auth/login", { email, password });
  setTokens(response.data.accessToken, response.data.refreshToken);
  return response.data.user;
}

export async function me(): Promise<AuthUser> {
  const response = await api.get<AuthUser>("/auth/me");
  return response.data;
}

export async function logout(): Promise<void> {
  try {
    await api.post("/auth/logout");
  } finally {
    clearTokens();
  }
}
