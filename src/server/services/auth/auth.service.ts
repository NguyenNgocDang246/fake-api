import { AUTH_MESSAGES, STATUS_CODE } from "@/server/core/constants";
import { AppError } from "@/server/core/errors";
import { LoginDTO, LoginResponseDTO, LoginResponseSchema, RegisterDTO } from "@/models/auth.model";
import { UserDTO } from "@/models/user.model";
import userService from "@/server/services/user.service";
import { hashPassword, verifyPassword } from "@/server/services/auth/hash.service";
import tokenService from "@/server/services/auth/token.service";

class AuthService {
  async register(data: RegisterDTO): Promise<UserDTO> {
    try {
      const user = await userService.getUserByEmail({ email: data.email });
      if (user)
        throw new AppError({
          statusCode: STATUS_CODE.BAD_REQUEST,
          message: AUTH_MESSAGES.EMAIL_DUPLICATED,
        });

      const password = await hashPassword(data.password);
      return await userService.createUser({ ...data, password });
    } catch (error) {
      throw error instanceof AppError ? error : new AppError();
    }
  }

  async login(data: LoginDTO): Promise<LoginResponseDTO> {
    try {
      const user = await userService.getUserByEmail({ email: data.email });
      if (!user) {
        throw new AppError({
          statusCode: STATUS_CODE.UNAUTHORIZED,
          message: AUTH_MESSAGES.INVALID_CREDENTIALS,
        });
      }

      const isValid = await verifyPassword(data.password, user.password);
      if (!isValid) {
        throw new AppError({
          statusCode: STATUS_CODE.UNAUTHORIZED,
          message: AUTH_MESSAGES.INVALID_CREDENTIALS,
        });
      }

      const refreshToken = await tokenService.createRefreshToken({
        id: user.id,
        token_version: user.token_version,
      });
      const accessToken = await tokenService.createAccessToken({ id: user.id });

      return LoginResponseSchema.parse({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
    } catch (error) {
      throw error instanceof AppError ? error : new AppError();
    }
  }
}

const authService = new AuthService();
export default authService;
