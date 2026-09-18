import { Prisma } from "@prisma/client";
import { prisma } from "@/server/prisma/prisma_provider";
import {
  PROJECT_PUBLIC_ID_REGEX,
  generateProjectPublicId,
} from "@/app/libs/helpers/publicId";

// A project id is the first label of its mock host and DNS folds case, so an id carrying
// uppercase can never be reached. Every row that predates the lowercase alphabet gets a new one.
// Nothing references projects.public_id as a foreign key, so only this column moves.
const DRY_RUN = process.argv.includes("--dry-run");

async function main() {
  const rows = await prisma.projects.findMany({ select: { id: true, public_id: true } });
  const stale = rows.filter((row) => !PROJECT_PUBLIC_ID_REGEX.test(row.public_id));

  console.log(`${rows.length} project(s), ${stale.length} to reissue`);
  if (stale.length === 0) return;

  if (DRY_RUN) {
    for (const row of stale) console.log(`${row.public_id} -> (unchanged, dry run)`);
    return;
  }

  for (const row of stale) {
    let reissued = false;
    for (let attempt = 0; attempt < 5 && !reissued; attempt++) {
      const next = generateProjectPublicId();
      try {
        await prisma.projects.update({ where: { id: row.id }, data: { public_id: next } });
        console.log(`${row.public_id} -> ${next}`);
        reissued = true;
      } catch (error) {
        const isPublicIdConflict =
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002" &&
          (error.meta?.["target"] as string[] | undefined)?.includes("public_id");
        if (!isPublicIdConflict) throw error;
      }
    }
    if (!reissued) throw new Error(`Could not reissue ${row.public_id} after 5 attempts`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
