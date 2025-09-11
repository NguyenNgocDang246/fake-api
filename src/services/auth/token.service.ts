import { SignJWT, jwtVerify } from "jose";
import {
  UserToAccessTokenDTO,
  UserToRefreshTokenDTO,
  AccessTokenPayloadDTO,
  RefreshTokenPayloadDTO,
  AccessTokenPayloadSchema,
  RefreshTokenPayloadSchema,
} from "@/models/auth.model";
import { GetUserByIdDTO } from "@/models/user.model";
import { AppError } from "@/core/errors";
import { STATUS_CODE, TOKEN_MESSAGE } from "@/core/constants";
import userService from "../user.service";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const ACCESS_SECRET = new TextEncoder().encode(process.env.ACCESS_SECRET || "access_secret");
const REFRESH_SECRET = new TextEncoder().encode(process.env.REFRESH_SECRET || "refresh_secret");

class TokenService {
  async createAccessToken({ id }: UserToAccessTokenDTO): Promise<string> {
    return new SignJWT({ id })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("15m")
      .sign(ACCESS_SECRET);
  }

  async verifyAccessToken(token: string): Promise<AccessTokenPayloadDTO> {
    try {
      const { payload } = await jwtVerify(token, ACCESS_SECRET);
      return AccessTokenPayloadSchema.parse({ id: payload.id });
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError({
        message: TOKEN_MESSAGE.INVALID_EXPIRED_TOKEN,
        statusCode: STATUS_CODE.UNAUTHORIZED,
      });
    }
  }

  async createRefreshToken({ id, token_version }: UserToRefreshTokenDTO): Promise<string> {
    return new SignJWT({ id, token_version })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("7d")
      .sign(REFRESH_SECRET);
  }

  async verifyRefreshToken(token: string): Promise<RefreshTokenPayloadDTO> {
    try {
      const { payload } = await jwtVerify(token, REFRESH_SECRET);
      const result = RefreshTokenPayloadSchema.parse({
        id: payload.id,
        token_version: payload.token_version,
      });
      const user = await userService.getUserById({ id: result.id });
      if (!user) {
        throw new AppError({
          message: TOKEN_MESSAGE.INVALID_EXPIRED_REFRESH_TOKEN,
          statusCode: STATUS_CODE.UNAUTHORIZED,
        });
      }
      if (user.token_version !== result.token_version) {
        throw new AppError({
          message: TOKEN_MESSAGE.INVALID_EXPIRED_REFRESH_TOKEN,
          statusCode: STATUS_CODE.UNAUTHORIZED,
        });
      }
      return result;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError();
    }
  }

  async increaseTokenVersion({ id }: GetUserByIdDTO) {
    try {
      await prisma.users.update({ where: { id }, data: { token_version: { increment: 1 } } });
    } catch (error) {
      console.log(error);
      throw new AppError();
    }
  }
}
const tokenService = new TokenService();
export default tokenService;
