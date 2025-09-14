import { NextResponse } from "next/server";
import { RESPONSE_STATUS, ERROR_MESSAGES } from "@/server/core/constants";
import { STATUS_CODE } from "@/server/core/constants";
import { ApiResponseModel } from "@/models/api_response.model";

export default class ApiResponse {
  static success<T>({
    data = null,
    statusCode = STATUS_CODE.OK,
  }: {
    data?: T | null;
    statusCode?: STATUS_CODE;
  } = {}) {
    const body: ApiResponseModel<T> = { status: RESPONSE_STATUS.SUCCESS, data };
    return NextResponse.json(body, { status: statusCode });
  }

  static error<E>({
    errors = null,
    message = ERROR_MESSAGES.SERVER_ERROR,
    statusCode = STATUS_CODE.SERVER_ERROR,
  }: {
    errors?: E | null;
    message?: string;
    statusCode?: STATUS_CODE;
  } = {}) {
    if (statusCode == STATUS_CODE.NO_CONTENT) {
      return new NextResponse(null, { status: STATUS_CODE.NO_CONTENT });
    }
    const body: ApiResponseModel<E> = { status: RESPONSE_STATUS.ERROR, message, errors };
    return NextResponse.json(body, { status: statusCode });
  }
}
