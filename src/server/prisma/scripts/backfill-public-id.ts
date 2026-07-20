import { Prisma } from "@prisma/client";
import { prisma } from "@/server/prisma/prisma_provider";
import { generatePublicId } from "@/app/libs/helpers/publicId";

// Raw SQL is required here: schema.prisma already declares public_id as a required
// String (the final target state), so the generated Prisma Client refuses to even
// deserialize rows where the (currently still nullable) DB column is null.
const TABLES = ["users", "projects", "endpoint_groups", "endpoints"] as const;

async function backfillTable(table: string) {
  const rows = await prisma.$queryRaw<{ id: bigint }[]>(
    Prisma.sql`SELECT id FROM ${Prisma.raw(`"${table}"`)} WHERE public_id IS NULL`
  );

  for (const row of rows) {
    const id = BigInt(row.id);
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        await prisma.$executeRaw(
          Prisma.sql`UPDATE ${Prisma.raw(`"${table}"`)} SET public_id = ${generatePublicId()} WHERE id = ${id}`
        );
        break;
      } catch (error) {
        const isPublicIdConflict =
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2010" &&
          typeof error.meta?.["code"] === "string" &&
          error.meta["code"] === "23505";
        if (!isPublicIdConflict) throw error;
      }
    }
  }

  console.log(`Backfilled ${rows.length} row(s) in "${table}"`);
}

async function main() {
  for (const table of TABLES) {
    await backfillTable(table);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
