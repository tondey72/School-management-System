import axios from "axios";
import { getAccessToken } from "./auth-storage";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "/api"
});

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
