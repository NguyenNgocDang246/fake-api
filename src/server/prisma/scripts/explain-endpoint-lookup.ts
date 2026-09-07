import "dotenv/config";
import { PrismaClient } from "@prisma/client";

// EXPLAIN ANALYZE the two queries on the mock-serving hot path, so the numbers in
// docs/00-assessment.md compare the same statements at every milestone.
//
// The where-clauses below mirror EndpointService.getEndpointByPath and
// getEndpointByDynamicPath (src/server/services/endpoint.service.ts). They are
// duplicated rather than imported because capturing the generated SQL needs a
// client constructed with query-event logging, and the shared prisma_provider
// client is not. Keep them in sync with the service.

type QueryEvent = { query: string; params: string };

const prisma = new PrismaClient({
  log: [{ emit: "event", level: "query" }],
});

const captured: QueryEvent[] = [];
prisma.$on("query", (event) => {
  captured.push({ query: event.query, params: event.params });
});

function parseParams(raw: string): unknown[] {
  try {
    return JSON.parse(raw) as unknown[];
  } catch {
    return [];
  }
}

async function explainCaptured(label: string, from: number) {
  const selects = captured.slice(from).filter((event) => /^\s*SELECT/i.test(event.query));
  if (selects.length === 0) {
    console.log(`\n### ${label}\n(no SELECT captured)`);
    return;
  }

  for (const [index, event] of selects.entries()) {
    const suffix = selects.length > 1 ? ` [statement ${index + 1}/${selects.length}]` : "";
    console.log(`\n### ${label}${suffix}`);
    console.log("-- SQL Prisma generated:");
    console.log(event.query);
    console.log("-- params:", event.params);
    console.log("-- plan:");
    const rows = await prisma.$queryRawUnsafe<Record<string, string>[]>(
      `EXPLAIN ANALYZE ${event.query}`,
      ...parseParams(event.params)
    );
    for (const row of rows) console.log(Object.values(row)[0]);
  }
}

async function pickSample() {
  const staticEndpoint = await prisma.endpoints.findFirst({
    where: { NOT: { path: { contains: ":" } } },
    include: { endpoint_groups: { include: { projects: true } } },
  });
  const dynamicEndpoint = await prisma.endpoints.findFirst({
    where: { path: { contains: ":" } },
    include: { endpoint_groups: { include: { projects: true } } },
  });
  return { staticEndpoint, dynamicEndpoint };
}

async function main() {
  const { staticEndpoint, dynamicEndpoint } = await pickSample();

  if (!staticEndpoint) {
    console.error("No static endpoint row found, cannot measure the static lookup.");
    process.exitCode = 1;
    return;
  }

  const projectPublicId = staticEndpoint.endpoint_groups.projects.public_id;
  console.log(`## Sample`);
  console.log(`project.public_id = ${projectPublicId}`);
  console.log(`static  : ${staticEndpoint.method} ${staticEndpoint.path}`);
  console.log(`dynamic : ${dynamicEndpoint ? `${dynamicEndpoint.method} ${dynamicEndpoint.path}` : "none in DB"}`);

  // 1. Static lookup, mirrors getEndpointByPath.
  let mark = captured.length;
  await prisma.endpoints.findFirst({
    where: {
      path: staticEndpoint.path,
      method: staticEndpoint.method,
      endpoint_groups: { projects: { public_id: projectPublicId } },
    },
  });
  await explainCaptured("getEndpointByPath (static lookup)", mark);

  // 2. Dynamic path candidates, mirrors getEndpointByDynamicPath.
  const dynamicProjectPublicId = dynamicEndpoint
    ? dynamicEndpoint.endpoint_groups.projects.public_id
    : projectPublicId;
  mark = captured.length;
  await prisma.endpoints.findMany({
    where: {
      method: dynamicEndpoint ? dynamicEndpoint.method : staticEndpoint.method,
      path: { contains: ":" },
      endpoint_groups: { projects: { public_id: dynamicProjectPublicId } },
    },
    orderBy: { updated_at: "desc" },
  });
  await explainCaptured("getEndpointByDynamicPath (candidate scan)", mark);

  // 3. The hand-written JOIN from docs/05-runbook.md, kept for continuity with the
  // runbook even though Prisma never emits this shape.
  console.log(`\n### Hand-written JOIN from 05-runbook.md`);
  const joinRows = await prisma.$queryRawUnsafe<Record<string, string>[]>(
    `EXPLAIN ANALYZE
     SELECT e.* FROM endpoints e
     JOIN endpoint_groups g ON g.id = e.endpoint_groups_id
     JOIN projects p ON p.id = g.project_id
     WHERE e.path = $1 AND e.method = $2::"HttpMethod" AND p.public_id = $3
     LIMIT 1`,
    staticEndpoint.path,
    staticEndpoint.method,
    projectPublicId
  );
  for (const row of joinRows) console.log(Object.values(row)[0]);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
