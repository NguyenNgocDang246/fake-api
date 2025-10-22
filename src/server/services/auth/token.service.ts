import { SignJWT, jwtVerify } from "jose";
import {
  UserToAccessTokenDTO,
  UserToRefreshTokenDTO,
  AccessTokenPayloadDTO,
  RefreshTokenPayloadDTO,
  AccessTokenPayloadSchema,
  RefreshTokenPayloadSchema,
  ResetPasswordTokenPayloadDTO,
  ResetPasswordTokenPayloadSchema,
  VerifyEmailTokenPayloadSchema,
  VerifyEmailTokenPayloadDTO,
} from "@/models/auth.model";
import { AppError } from "@/server/core/errors";
import { STATUS_CODE, TOKEN_MESSAGE } from "@/server/core/constants";
import IdConverter from "@/app/libs/helpers/idConverter";
import {
  ACCESS_TOKEN_EXPIRATION_TIME_IN_STRING,
  REFRESH_TOKEN_EXPIRATION_TIME_IN_STRING,
  RESET_PASSWORD_TOKEN_EXPIRATION_TIME_IN_STRING,
  VERIFY_EMAIL_TOKEN_EXPIRATION_TIME_IN_STRING,
} from "@/server/core/constants";
const ACCESS_SECRET = new TextEncoder().encode(process.env["ACCESS_SECRET"] || "access_secret");
const REFRESH_SECRET = new TextEncoder().encode(process.env["REFRESH_SECRET"] || "refresh_secret");
const RESET_PASSWORD_SECRET = new TextEncoder().encode(
  process.env["RESET_PASSWORD_SECRET"] || "reset_password_secret"
);
const VERIFY_EMAIL_SECRET = new TextEncoder().encode(
  process.env["VERIFY_EMAIL_SECRET"] || "verify_email_secret"
);

class TokenService {
  async createAccessToken({ id }: UserToAccessTokenDTO): Promise<string> {
    try {
      const public_id = IdConverter.encode(id);
      return new SignJWT({ public_id })
        .setProtectedHeader({ alg: "HS256" })
        .setExpirationTime(ACCESS_TOKEN_EXPIRATION_TIME_IN_STRING)
        .sign(ACCESS_SECRET);
    } catch (error) {
      void error;
      throw new AppError();
    }
  }

  async verifyAccessToken(token: string): Promise<AccessTokenPayloadDTO> {
    try {
      const { payload } = await jwtVerify(token, ACCESS_SECRET);
      const id = IdConverter.decode(payload["public_id"] as string);
      return AccessTokenPayloadSchema.parse({ id });
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError({
        message: TOKEN_MESSAGE.INVALID_EXPIRED_TOKEN,
        statusCode: STATUS_CODE.UNAUTHORIZED,
      });
    }
  }

  async createRefreshToken({ id, token_version }: UserToRefreshTokenDTO): Promise<string> {
    try {
      const public_id = IdConverter.encode(id);
      return new SignJWT({ public_id, token_version: token_version.toString() })
        .setProtectedHeader({ alg: "HS256" })
        .setExpirationTime(REFRESH_TOKEN_EXPIRATION_TIME_IN_STRING)
        .sign(REFRESH_SECRET);
    } catch (error) {
      void error;
      throw new AppError();
    }
  }

  async verifyRefreshToken(token: string): Promise<RefreshTokenPayloadDTO> {
    try {
      const { payload } = await jwtVerify(token, REFRESH_SECRET);
      const id = IdConverter.decode(payload["public_id"] as string);
      const result = RefreshTokenPayloadSchema.parse({
        id,
        token_version: BigInt(payload["token_version"] as string),
      });

      return result;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError();
    }
  }

  async createResetPasswordToken({ id, token_version }: ResetPasswordTokenPayloadDTO) {
    try {
      const public_id = IdConverter.encode(id);
      return new SignJWT({ public_id, token_version: token_version.toString() })
        .setProtectedHeader({ alg: "HS256" })
        .setExpirationTime(RESET_PASSWORD_TOKEN_EXPIRATION_TIME_IN_STRING)
        .sign(RESET_PASSWORD_SECRET);
    } catch (error) {
      void error;
      throw new AppError();
    }
  }

  async verifyResetPasswordToken(token: string): Promise<ResetPasswordTokenPayloadDTO> {
    try {
      const { payload } = await jwtVerify(token, RESET_PASSWORD_SECRET);
      const id = IdConverter.decode(payload["public_id"] as string);
      const result = ResetPasswordTokenPayloadSchema.parse({
        id,
        token_version: BigInt(payload["token_version"] as string),
      });
      return result;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError({
        message: TOKEN_MESSAGE.INVALID_EXPIRED_TOKEN,
        statusCode: STATUS_CODE.UNAUTHORIZED,
      });
    }
  }
  async createVerifyEmailToken({ id, token_version }: VerifyEmailTokenPayloadDTO) {
    try {
      const public_id = IdConverter.encode(id);
      return new SignJWT({ public_id, token_version: token_version.toString() })
        .setProtectedHeader({ alg: "HS256" })
        .setExpirationTime(VERIFY_EMAIL_TOKEN_EXPIRATION_TIME_IN_STRING)
        .sign(VERIFY_EMAIL_SECRET);
    } catch (error) {
      void error;
      throw new AppError();
    }
  }

  async verifyVerifyEmailToken(token: string): Promise<VerifyEmailTokenPayloadDTO> {
    try {
      const { payload } = await jwtVerify(token, VERIFY_EMAIL_SECRET);
      const id = IdConverter.decode(payload["public_id"] as string);
      const result = VerifyEmailTokenPayloadSchema.parse({
        id,
        token_version: BigInt(payload["token_version"] as string),
      });
      return result;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError({
        message: TOKEN_MESSAGE.INVALID_EXPIRED_TOKEN,
        statusCode: STATUS_CODE.UNAUTHORIZED,
      });
    }
  }
}
const tokenService = new TokenService();
export default tokenService;
