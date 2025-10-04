import IdConverter from "@/app/libs/helpers/idConverter";
import { NextRequest, NextResponse } from "next/server";

export const FakeAPIPrefix = "/api/fake/";
const fakeMiddleware = (req: NextRequest, public_id: string) => {
  const newUrl = req.nextUrl.clone();
  const projectId = IdConverter.decode(public_id);
  if (projectId === BigInt(-1)) return null;

  newUrl.pathname = `${FakeAPIPrefix}${public_id}`;
  return NextResponse.rewrite(newUrl);
};

export default fakeMiddleware;
