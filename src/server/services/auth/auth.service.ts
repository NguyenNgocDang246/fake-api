import { AUTH_MESSAGES, STATUS_CODE } from "@/server/core/constants";
import { AppError } from "@/server/core/errors";
import {
  LoginDTO,
  LoginResponseDTO,
  LoginResponseSchema,
  RegisterDTO,
  RegisterWithGoogleDTO,
  LoginWithGoogleDTO,
} from "@/models/auth.model";
import { UpdatePasswordDTO } from "@/models/user.model";
import { UserDTO } from "@/models/user.model";
import userService from "@/server/services/user.service";
import MailService from "@/server/services/mail/mail.service";
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

  async registerWithGoogle(data: RegisterWithGoogleDTO): Promise<UserDTO> {
    try {
      const password = Date.now().toString() + process.env["DUMMY_PASSWORD_SALT"];
      const user = await this.register({ ...data, password });
      await userService.verifyUserEmail({ public_id: user.public_id });
      return user;
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

      if (!user.is_verified) {
        await MailService.sendVerificationEmail({
          to: user.email,
          token: await tokenService.createVerifyEmailToken({
            public_id: user.public_id,
            token_version: user.token_version,
          }),
        });
        throw new AppError({
          statusCode: STATUS_CODE.FORBIDDEN,
          message: AUTH_MESSAGES.EMAIL_NOT_VERIFIED,
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
        public_id: user.public_id,
        token_version: user.token_version,
      });
      const accessToken = await tokenService.createAccessToken({ public_id: user.public_id });

      return LoginResponseSchema.parse({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
    } catch (error) {
      throw error instanceof AppError ? error : new AppError();
    }
  }

  async loginWithGoogle(data: LoginWithGoogleDTO): Promise<LoginResponseDTO> {
    try {
      const user = await userService.getUserByEmail({ email: data.email });
      if (!user) {
        throw new AppError({
          statusCode: STATUS_CODE.UNAUTHORIZED,
          message: AUTH_MESSAGES.INVALID_CREDENTIALS,
        });
      }

      const refreshToken = await tokenService.createRefreshToken({
        public_id: user.public_id,
        token_version: user.token_version,
      });
      const accessToken = await tokenService.createAccessToken({ public_id: user.public_id });

      return LoginResponseSchema.parse({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
    } catch (error) {
      throw error instanceof AppError ? error : new AppError();
    }
  }

  async updatePassword({ public_id, password }: UpdatePasswordDTO) {
    try {
      const user = await userService.getUserById({ public_id });
      if (!user) {
        throw new AppError({
          statusCode: STATUS_CODE.NO_CONTENT,
          message: AUTH_MESSAGES.USER_NOT_FOUND,
        });
      }

      const hashedPassword = await hashPassword(password);
      return await userService.updatePassword({ public_id, password: hashedPassword });
    } catch (error) {
      throw error instanceof AppError ? error : new AppError();
    }
  }
}

const authService = new AuthService();
export default authService;
