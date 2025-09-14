// server/core/types/api_response.ts
export interface ApiSuccessResponse<T = unknown> {
  status: "success";
  data: T | null;
}

export interface ApiErrorResponse<E = unknown> {
  status: "error";
  message: string;
  errors: E | null;
}

export type ApiResponseModel<T = unknown, E = unknown> =
  | ApiSuccessResponse<T>
  | ApiErrorResponse<E>;
