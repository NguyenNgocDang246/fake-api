jest.mock("@/server/services/endpoint/endpoint.service", () => ({
  __esModule: true,
  default: {
    getEndpointByPath: jest.fn(),
    getEndpointByDynamicPath: jest.fn(),
    findMethodsForPath: jest.fn(),
  },
}));

jest.mock("@/server/services/endpoint/variant/plan.service", () => ({
  __esModule: true,
  default: {
    loadRenderable: jest.fn(),
    ensurePlan: jest.fn(),
  },
}));

import EndpointService from "@/server/services/endpoint/endpoint.service";
import endpointVariantPlanService from "@/server/services/endpoint/variant/plan.service";
import { GET } from "@/app/api/fake/[projectId]/route";
import { createJsonRequest, readJson } from "../../helpers/http";

describe("src/app/api/fake/[projectId]/route.ts AI variants", () => {
  const aiEndpoint = {
    id: 7n,
    method: "GET",
    path: "/users",
    status_code: 200,
    response_body: '{"name":"An","id":1}',
    delay_ms: 0,
    ai_enabled: true,
    ai_fields: ["name"],
    ai_prompt: null,
    ai_plan: null,
    ai_plan_hash: null,
  };

  const plan = {
    version: 1 as const,
    locale: "en" as const,
    entities: [],
    catalogs: [],
    unapplied_hints: [],
    fields: [{ path: "name", recipe: { kind: "semantic" as const, name: "full_name" as const } }],
  };

  const renderable = { plan, uniqueCatalogs: new Set<string>(), source: JSON.stringify(plan) };

  it("renders a fresh variant from the stored blueprint", async () => {
    (EndpointService.getEndpointByPath as jest.Mock).mockResolvedValue(aiEndpoint);
    (endpointVariantPlanService.loadRenderable as jest.Mock).mockReturnValue(renderable);

    const res = await GET(createJsonRequest({}, { pathname: "/PUBLIC/users" }));
    const body = (await readJson(res)) as { name: string; id: number };

    expect(res.status).toBe(200);
    expect(body.id).toBe(1);
    expect(typeof body.name).toBe("string");
    expect(body.name).not.toBe("An");
  });

  // Only the ticked field is drawn again. Everything else is written back from the author's own
  // text, which a re-stringified parse would have rounded, renormalized and reordered.
  it("leaves every field the blueprint does not name byte for byte", async () => {
    const body =
      '{\n\t"name": "Dang",\n\t"price": 10.00,\n\t"id": 12345678901234567890,\n\t"ratio": 1e2,\n\t"tag": "\\u0041",\n\t"1": "x"\n}';
    (EndpointService.getEndpointByPath as jest.Mock).mockResolvedValue({
      ...aiEndpoint,
      response_body: body,
    });
    (endpointVariantPlanService.loadRenderable as jest.Mock).mockReturnValue(renderable);

    const res = await GET(createJsonRequest({}, { pathname: "/PUBLIC/users" }));
    const text = await res.text();

    expect(text).toMatch(
      /^\{"name":"[^"]+","price":10\.00,"id":12345678901234567890,"ratio":1e2,"tag":"\\u0041","1":"x"\}$/
    );
    expect(text).not.toContain('"name":"Dang"');
  });

  // Only the whitespace goes. A re-stringified parse would reorder the integer-like key and
  // round the big integer, which is why the body is compacted as text instead.
  it("compacts the stored body when AI is off", async () => {
    const body = '{\n  "b": 1,\n  "1": 3,\n  "n": 12345678901234567890\n}';
    (EndpointService.getEndpointByPath as jest.Mock).mockResolvedValue({
      ...aiEndpoint,
      ai_enabled: false,
      ai_fields: [],
      response_body: body,
    });

    const res = await GET(createJsonRequest({}, { pathname: "/PUBLIC/users" }));

    expect(await res.text()).toBe('{"b":1,"1":3,"n":12345678901234567890}');
    expect(res.headers.get("content-type")).toBe("application/json");
  });

  it("keeps the indentation out of a body the editor formatted", async () => {
    (EndpointService.getEndpointByPath as jest.Mock).mockResolvedValue({
      ...aiEndpoint,
      ai_enabled: false,
      ai_fields: [],
      response_body: '{\n\t"name": "Dang",\n\t"old": 3,\n\t"birthday": "1/1/2023"\n}',
    });

    const res = await GET(createJsonRequest({}, { pathname: "/PUBLIC/users" }));

    expect(await res.text()).toBe('{"name":"Dang","old":3,"birthday":"1/1/2023"}');
  });

  it("leaves the whitespace inside a string alone", async () => {
    (EndpointService.getEndpointByPath as jest.Mock).mockResolvedValue({
      ...aiEndpoint,
      ai_enabled: false,
      ai_fields: [],
      response_body: '{\n  "msg": "hello   world",\n  "a": 1\n}',
    });

    const res = await GET(createJsonRequest({}, { pathname: "/PUBLIC/users" }));

    expect(await res.text()).toBe('{"msg":"hello   world","a":1}');
  });

  it("serves the stored text verbatim when a blueprint is missing", async () => {
    const body = '{"b":1,"1":3}';
    (EndpointService.getEndpointByPath as jest.Mock).mockResolvedValue({
      ...aiEndpoint,
      response_body: body,
    });
    (endpointVariantPlanService.loadRenderable as jest.Mock).mockReturnValue(null);

    const res = await GET(createJsonRequest({}, { pathname: "/PUBLIC/users" }));
    expect(await res.text()).toBe(body);
  });

  it("writes nothing on the serving path once a blueprint exists", async () => {
    const server = jest.requireMock("next/server") as { __afterCount: () => number };
    (EndpointService.getEndpointByPath as jest.Mock).mockResolvedValue(aiEndpoint);
    (endpointVariantPlanService.loadRenderable as jest.Mock).mockReturnValue(renderable);

    await GET(createJsonRequest({}, { pathname: "/PUBLIC/users" }));

    // No use to count and no pool to top up, so nothing is deferred either.
    expect(server.__afterCount()).toBe(0);
    expect(endpointVariantPlanService.ensurePlan).not.toHaveBeenCalled();
  });

  it("serves the base body and schedules a build when the blueprint is missing or stale", async () => {
    const server = jest.requireMock("next/server") as {
      __afterCount: () => number;
      __flushAfter: () => Promise<void>;
    };
    (EndpointService.getEndpointByPath as jest.Mock).mockResolvedValue(aiEndpoint);
    (endpointVariantPlanService.loadRenderable as jest.Mock).mockReturnValue(null);

    const res = await GET(createJsonRequest({}, { pathname: "/PUBLIC/users" }));

    expect(await readJson(res)).toEqual({ name: "An", id: 1 });
    expect(endpointVariantPlanService.ensurePlan).not.toHaveBeenCalled();
    expect(server.__afterCount()).toBe(1);

    await server.__flushAfter();
    expect(endpointVariantPlanService.ensurePlan).toHaveBeenCalledWith(aiEndpoint);
  });

  it("falls back to the base body when reading the blueprint throws", async () => {
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
    (EndpointService.getEndpointByPath as jest.Mock).mockResolvedValue(aiEndpoint);
    (endpointVariantPlanService.loadRenderable as jest.Mock).mockImplementation(() => {
      throw new Error("plan column unreadable");
    });

    const res = await GET(createJsonRequest({}, { pathname: "/PUBLIC/users" }));

    expect(res.status).toBe(200);
    expect(await readJson(res)).toEqual({ name: "An", id: 1 });

    consoleError.mockRestore();
  });

  it("does not look at the blueprint when AI is off", async () => {
    (EndpointService.getEndpointByPath as jest.Mock).mockResolvedValue({
      ...aiEndpoint,
      ai_enabled: false,
    });

    const res = await GET(createJsonRequest({}, { pathname: "/PUBLIC/users" }));

    expect(res.status).toBe(200);
    expect(endpointVariantPlanService.loadRenderable).not.toHaveBeenCalled();
  });

  it("does not look at the blueprint when AI is on but no field is selected", async () => {
    (EndpointService.getEndpointByPath as jest.Mock).mockResolvedValue({
      ...aiEndpoint,
      ai_fields: [],
    });

    await GET(createJsonRequest({}, { pathname: "/PUBLIC/users" }));

    expect(endpointVariantPlanService.loadRenderable).not.toHaveBeenCalled();
  });
});
