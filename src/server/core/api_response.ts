import { NextResponse } from "next/server";
import { RESPONSE_STATUS, ERROR_MESSAGES } from "@/server/core/constants";
import { STATUS_CODE } from "@/server/core/constants";

export default class ApiResponse {
  static success<T>({
    data = null,
    statusCode = STATUS_CODE.OK,
  }: {
    data?: T | null;
    statusCode?: STATUS_CODE;
  } = {}) {
    return NextResponse.json({ status: RESPONSE_STATUS.SUCCESS, data }, { status: statusCode });
  }

  static error<T>({
    errors = null,
    message = ERROR_MESSAGES.SERVER_ERROR,
    statusCode = STATUS_CODE.SERVER_ERROR,
  }: {
    errors?: T | null;
    message?: string;
    statusCode?: STATUS_CODE;
  } = {}) {
    if (statusCode == STATUS_CODE.NO_CONTENT) {
      return new NextResponse(null, { status: STATUS_CODE.NO_CONTENT });
    }
    return NextResponse.json(
      { status: RESPONSE_STATUS.ERROR, message, errors },
      { status: statusCode }
    );
  }
}
