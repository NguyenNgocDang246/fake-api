import { Prisma } from "@prisma/client";
import { generatePublicId } from "@/app/libs/helpers/publicId";

const MAX_RETRIES = 5;

export async function createWithUniquePublicId<T>(
  createFn: (public_id: string) => Promise<T>
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      return await createFn(generatePublicId());
    } catch (error) {
      lastError = error;
      const isPublicIdConflict =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002" &&
        (error.meta?.["target"] as string[] | undefined)?.includes("public_id");
      if (!isPublicIdConflict) throw error;
    }
  }
  throw lastError;
}
