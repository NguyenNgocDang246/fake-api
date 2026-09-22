import { Prisma } from "@prisma/client";
import { generatePublicId } from "@/app/libs/helpers/publicId";

const MAX_RETRIES = 5;

function isPublicIdConflict(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002" &&
    (error.meta?.["target"] as string[] | undefined)?.includes("public_id") === true
  );
}

// Retries the whole operation, which is what a transaction creating several rows needs: each
// attempt has to redo every write, not just the one that collided.
export async function retryOnPublicIdConflict<T>(run: () => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      return await run();
    } catch (error) {
      lastError = error;
      if (!isPublicIdConflict(error)) throw error;
    }
  }
  throw lastError;
}

export function createWithUniquePublicId<T>(
  createFn: (public_id: string) => Promise<T>
): Promise<T> {
  return retryOnPublicIdConflict(() => createFn(generatePublicId()));
}
