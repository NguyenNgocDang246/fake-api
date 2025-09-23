import axios, { AxiosError } from "axios";
import { API_ROUTES } from "@/app/libs/routes";

export function createApi() {
  const api = axios.create({
    baseURL: "/",
    withCredentials: true,
  });

  const plainApi = axios.create({
    baseURL: "/",
    withCredentials: true,
  });

  api.interceptors.response.use(
    (res) => res,
    async (error: AxiosError) => {
      if (error.response?.status !== 401) {
        return Promise.reject(error);
      }

      try {
        // refresh token
        await plainApi.get(API_ROUTES.AUTH.REFRESH_TOKEN);

        return api(error.config!);
      } catch (err) {
        try {
          await plainApi.post(API_ROUTES.AUTH.LOGOUT);
        } catch (err) {
          void err;
        }
        return Promise.reject(err);
      }
    }
  );

  return api;
}
const api = createApi();
export default api;
