import { NextRequest, NextResponse } from "next/server";
import { PUBLIC_ID_REGEX } from "@/app/libs/helpers/publicId";

export const FakeAPIPrefix = "/api/fake/";
const fakeMiddleware = (req: NextRequest, public_id: string) => {
  if (!PUBLIC_ID_REGEX.test(public_id)) return null;

  const newUrl = req.nextUrl.clone();
  newUrl.pathname = `${FakeAPIPrefix}${public_id}`;
  return NextResponse.rewrite(newUrl);
};

export default fakeMiddleware;
