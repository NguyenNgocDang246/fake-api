import { NextResponse } from "next/server";
import { RESPONSE_STATUS, ERROR_MESSAGES } from "@/core/constants";
import { STATUS_CODE } from "@/core/constants";

export default class ApiResponse {
  static success<T>({
    data,
    status = STATUS_CODE.OK,
  }: {
    data: T;
    status?: STATUS_CODE;
  }) {
    return NextResponse.json(
      { status: RESPONSE_STATUS.SUCCESS, data },
      { status }
    );
  }

  static error<T>({
    errors = null,
    message = ERROR_MESSAGES.SERVER_ERROR,
    status = STATUS_CODE.SERVER_ERROR,
  }: {
    errors?: T | null;
    message?: string;
    status?: STATUS_CODE;
  } = {}) {
    return NextResponse.json(
      { status: RESPONSE_STATUS.ERROR, message, errors },
      { status }
    );
  }
}
