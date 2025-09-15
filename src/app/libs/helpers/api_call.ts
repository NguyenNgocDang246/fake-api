// lib/api.ts
import axios, { AxiosError, AxiosRequestConfig } from "axios";
import { STATUS_CODE } from "@/server/core/constants";
import { API_ROUTES } from "../routes";

interface RetryAxiosRequestConfig extends AxiosRequestConfig {
  _retry?: boolean;
}

// Định nghĩa item trong failedQueue
interface FailedRequest {
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}

const api = axios.create({
  baseURL: "/",
  withCredentials: true, // để cookie (httpOnly) được gửi đi
});

let isRefreshing = false;
let failedQueue: FailedRequest[] = [];

const processQueue = (error: unknown) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve();
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (res) => res,
  async (err: AxiosError) => {
    const originalRequest = err.config as RetryAxiosRequestConfig;
    const route = originalRequest.url;
    if (route == API_ROUTES.AUTH.LOGIN || route == API_ROUTES.AUTH.REGISTER) {
      return Promise.reject(err.response);
    }
    if (err.response?.status === STATUS_CODE.UNAUTHORIZED && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => api(originalRequest))
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Gọi refresh token
        await api.get("/auth/refresh-token");

        processQueue(null);
        return api(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr);

        await api.get("/auth/logout");
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(err.response);
  }
);

export default api;
