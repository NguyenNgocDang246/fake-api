import { NextRequest, NextResponse } from "next/server";
import { PUBLIC_ID_REGEX } from "@/app/libs/helpers/publicId";
import ApiResponse from "@/server/core/api_response";
import { ERROR_MESSAGES, STATUS_CODE } from "@/server/core/constants";
import guestService from "@/server/services/guest.service";
import { GUEST_PROXY_PREFIX, PROJECT_API_PREFIX } from "@/server/services/guest.constants";

// The two shapes a visitor's playground is allowed to reach. Anything else under the prefix is
// a 404, which is what keeps the rest of `/api/project/**` (renaming or deleting a project,
// group CRUD) out of reach of a caller who never authenticated.
function isAllowedPath(segments: string[]): boolean {
  const [projectId, groupLiteral, groupId, endpointLiteral, endpointId, ...extra] = segments;

  if (extra.length > 0) return false;
  if (!projectId || !PUBLIC_ID_REGEX.test(projectId)) return false;
  if (groupLiteral !== "endpoint-group") return false;
  if (!groupId || !PUBLIC_ID_REGEX.test(groupId)) return false;
  if (endpointLiteral !== "endpoint") return false;
  if (endpointId === undefined) return true;
  return PUBLIC_ID_REGEX.test(endpointId);
}

const guestMiddleware = async (req: NextRequest) => {
  const { pathname } = req.nextUrl;
  if (!pathname.startsWith(GUEST_PROXY_PREFIX)) return null;

  const rest = pathname.slice(GUEST_PROXY_PREFIX.length);
  if (!isAllowedPath(rest.split("/").filter(Boolean))) {
    return ApiResponse.error({
      message: ERROR_MESSAGES.NOT_FOUND,
      statusCode: STATUS_CODE.NOT_FOUND,
    });
  }

  // A caller can put `x-userId` on the wire themselves, and this branch never went through
  // `authMiddleware`, so drop whatever arrived before naming the guest account.
  const headers = new Headers(req.headers);
  headers.delete("x-userId");
  headers.delete("x-role");
  headers.set("x-userId", (await guestService.getGuestUser()).public_id);

  const newUrl = req.nextUrl.clone();
  newUrl.pathname = `${PROJECT_API_PREFIX}${rest}`;
  return NextResponse.rewrite(newUrl, { request: { headers } });
};

export default guestMiddleware;
