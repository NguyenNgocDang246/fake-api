import axios, { AxiosError } from "axios";
import { API_ROUTES } from "@/app/libs/routes";

const ignoreAuthAPIRoute = [
  API_ROUTES.AUTH.LOGOUT,
  API_ROUTES.AUTH.LOGIN,
  API_ROUTES.AUTH.REGISTER,
  API_ROUTES.AUTH.GOOGLE.LOGIN,
  API_ROUTES.AUTH.PASSWORD.FORGOT,
  API_ROUTES.AUTH.PASSWORD.RESET,
  API_ROUTES.AUTH.EMAIL.VERIFY,
  API_ROUTES.AUTH.EMAIL.RESEND,
];

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
        return Promise.reject(error.response?.data);
      }

      if (ignoreAuthAPIRoute.includes(error.config?.url || "")) {
        return Promise.reject(error.response.data);
      }

      try {
        // refresh token
        await plainApi.get(API_ROUTES.AUTH.REFRESH_TOKEN);

        return api(error.config!);
      } catch (err) {
        try {
          await plainApi.get(API_ROUTES.AUTH.LOGOUT);
        } catch (err) {
          void err;
        }
        return Promise.reject(err);
      }
    },
  );

  return api;
}
const api = createApi();
export default api;
