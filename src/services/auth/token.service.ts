import jwt from "jsonwebtoken";
import {
  UserToAccessTokenDTO,
  UserToRefreshTokenDTO,
  AccessTokenPayloadDTO,
  RefreshTokenPayloadDTO,
  AccessTokenPayloadSchema,
  RefreshTokenPayloadSchema,
} from "@/models/auth.model";
import { AppError } from "@/core/errors";

const ACCESS_SECRET = process.env.ACCESS_SECRET || "access_secret";
const REFRESH_SECRET = process.env.REFRESH_SECRET || "refresh_secret";

class TokenService {
  createAccessToken({ id }: UserToAccessTokenDTO): string {
    return jwt.sign({ id }, ACCESS_SECRET, {
      expiresIn: "5m",
    });
  }

  verifyAccessToken(token: string): AccessTokenPayloadDTO {
    try {
      const payload = jwt.verify(token, ACCESS_SECRET);
      return AccessTokenPayloadSchema.parse(payload);
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError();
    }
  }

  createRefreshToken({ id, token_version }: UserToRefreshTokenDTO): string {
    return jwt.sign({ id, token_version }, REFRESH_SECRET, { expiresIn: "7d" });
  }

  verifyRefreshToken(token: string): RefreshTokenPayloadDTO {
    const payload = jwt.verify(token, REFRESH_SECRET);
    return RefreshTokenPayloadSchema.parse(payload);
  }
}
const tokenService = new TokenService();
export default tokenService;
