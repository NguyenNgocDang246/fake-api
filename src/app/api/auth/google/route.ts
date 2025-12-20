import { getOauth2Client } from "@/app/api/auth/google/google.OAuth2";
import ApiResponse from "@/server/core/api_response";
import { LoginWithGoogleResponseDTO } from "@/models/auth.model";

export async function GET() {
  try {
    const url = getOauth2Client().generateAuthUrl({
      access_type: "offline",
      scope: ["profile", "email"],
    });

    const data: LoginWithGoogleResponseDTO = { url };

    return ApiResponse.success({ data });
  } catch (error) {
    void error;
    return ApiResponse.error();
  }
}
