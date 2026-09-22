import { Prisma } from "@prisma/client";
import { prisma } from "@/server/prisma/prisma_provider";
import { PUBLIC_ID_REGEX, generatePublicId } from "@/app/libs/helpers/publicId";

// Every public_id has to survive being a hostname label, because a project's is the first label of
// its mock host and the rest share its alphabet. An id carrying uppercase can never be reached, so
// every row that predates the lowercase alphabet gets a new one. Nothing references public_id as a
// foreign key, every relation in the schema goes through the BigInt id, so only these columns move.
//
// Two things to know before running it. A user's id travels inside the JWT, so this logs everybody
// out, and an access token still in date points at a row that is gone until the refresh fails.
// `GuestService` caches the guest account's id for the life of the process, so restart the server
// afterwards or the trial box asks for a user nobody can find.
const DRY_RUN = process.argv.includes("--dry-run");

const TABLES = [
  "users",
  "projects",
  "endpoint_groups",
  "endpoints",
  "endpoint_scenarios",
] as const;

type Table = (typeof TABLES)[number];

// Prisma gives every model its own delegate type and they do not union, so a loop over five of
// them cannot call `findMany` off the union. This names the two calls the loop actually makes,
// whose argument and result shapes are the same on all five.
type PublicIdModel = {
  findMany(args: {
    select: { id: true; public_id: true };
  }): Promise<{ id: bigint; public_id: string }[]>;
  update(args: { where: { id: bigint }; data: { public_id: string } }): Promise<unknown>;
};

async function reissueTable(table: Table) {
  const model = prisma[table] as unknown as PublicIdModel;
  const rows = await model.findMany({ select: { id: true, public_id: true } });
  const stale = rows.filter((row) => !PUBLIC_ID_REGEX.test(row.public_id));

  console.log(`"${table}": ${rows.length} row(s), ${stale.length} to reissue`);
  if (stale.length === 0) return;

  if (DRY_RUN) {
    for (const row of stale) console.log(`  ${row.public_id} -> (unchanged, dry run)`);
    return;
  }

  for (const row of stale) {
    let reissued = false;
    for (let attempt = 0; attempt < 5 && !reissued; attempt++) {
      const next = generatePublicId();
      try {
        await model.update({ where: { id: row.id }, data: { public_id: next } });
        console.log(`  ${row.public_id} -> ${next}`);
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

async function main() {
  for (const table of TABLES) await reissueTable(table);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
