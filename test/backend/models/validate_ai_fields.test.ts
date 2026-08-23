import { validateAiFields } from "@/app/(pages)/project/[id]/components/validateAiFields";
import { MAX_AI_ARRAY_ITEMS, MAX_AI_FIELDS, MAX_AI_VALUES } from "@/models/endpoint.model";

const valid = {
  ai_enabled: true,
  ai_fields: ["name"],
  response_body: '{"name":"An"}',
};

const check = (overrides: Partial<typeof valid>) =>
  validateAiFields({ ...valid, ...overrides });

describe("validateAiFields", () => {
  it("passes a leaf path, which is what the selector offers", () => {
    expect(check({})).toBeUndefined();
  });

  it("says nothing at all when the AI block is switched off", () => {
    expect(check({ ai_enabled: false, ai_fields: [], response_body: "{" })).toBeUndefined();
  });

  it("asks for at least one field", () => {
    expect(check({ ai_fields: [] })?.message).toBe(
      "Select at least one field for the AI to vary"
    );
  });

  it("applies the field count ceiling", () => {
    const fields = Array.from({ length: MAX_AI_FIELDS + 1 }, (_, i) => `f${i}`);

    expect(check({ ai_fields: fields })?.message).toBe(
      `You can select at most ${MAX_AI_FIELDS} fields`
    );
  });

  it("stays quiet while the body is not valid JSON", () => {
    expect(check({ response_body: '{"name":' })).toBeUndefined();
  });

  it("names a path the body no longer has", () => {
    const error = check({ response_body: '{"other":"An"}' });

    expect(error?.message).toBe("These fields are no longer in the response body: name");
  });

  describe("a path that still resolves but cannot be varied", () => {
    it("rejects a field that has become an object", () => {
      const error = check({
        response_body: '{"user":{"name":"An"}}',
        ai_fields: ["user"],
      });

      expect(error?.message).toBe("These fields cannot be varied by the AI: user");
    });

    it("rejects an array path whose elements stopped agreeing on a type", () => {
      const error = check({
        response_body: '{"items":[{"price":1},{"price":"2"}]}',
        ai_fields: ["items[].price"],
      });

      expect(error?.message).toBe("These fields cannot be varied by the AI: items[].price");
    });

    it("accepts the same array path once every element agrees again", () => {
      expect(
        check({
          response_body: '{"items":[{"price":1},{"price":2}]}',
          ai_fields: ["items[].price"],
        })
      ).toBeUndefined();
    });

    it("ignores a type break past the element cap the generator applies", () => {
      const items = [
        ...Array.from({ length: MAX_AI_ARRAY_ITEMS }, () => ({ price: 1 })),
        { price: "broken" },
      ];

      expect(
        check({
          response_body: JSON.stringify({ items }),
          ai_fields: ["items[].price"],
        })
      ).toBeUndefined();
    });
  });

  it("still applies the value ceiling once every path is selectable", () => {
    const body = JSON.stringify({
      items: Array.from({ length: MAX_AI_ARRAY_ITEMS }, () => ({
        price: 1,
        name: "a",
        sku: "b",
        qty: 2,
      })),
    });
    const paths = ["items[].price", "items[].name", "items[].sku", "items[].qty"];

    expect(check({ response_body: body, ai_fields: paths.slice(0, 3) })).toBeUndefined();

    expect(check({ response_body: body, ai_fields: paths })?.message).toContain(
      `more than ${MAX_AI_VALUES} values`
    );
  });
});
