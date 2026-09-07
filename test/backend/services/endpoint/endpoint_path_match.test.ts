import {
  compareTemplateSpecificity,
  matchPathTemplate,
} from "@/server/services/endpoint/endpoint_path_match";

describe("matchPathTemplate", () => {
  it("returns false when segment counts differ", () => {
    expect(matchPathTemplate("/user/:id", "/user/1/orders")).toBe(false);
  });

  it("returns false when a static segment mismatches", () => {
    expect(matchPathTemplate("/user/:id/orders", "/account/1/orders")).toBe(false);
  });

  it("matches a single :param segment", () => {
    expect(matchPathTemplate("/user/:id", "/user/abc123")).toBe(true);
  });

  it("matches multiple :param segments", () => {
    expect(matchPathTemplate("/user/:projectId/orders/:orderId", "/user/abc/orders/99")).toBe(true);
  });
});

describe("compareTemplateSpecificity", () => {
  it("ranks the leftmost literal above a parameter", () => {
    expect(compareTemplateSpecificity("/shop/list/:name", "/shop/:id/item")).toBeLessThan(0);
    expect(compareTemplateSpecificity("/shop/:id/item", "/shop/list/:name")).toBeGreaterThan(0);
  });

  it("keeps reading left to right until the shapes differ", () => {
    // Same shape for two segments, so `orders` against `:id` at the third is what decides.
    expect(
      compareTemplateSpecificity("/user/:id/orders/:orderId", "/user/:id/:section/latest")
    ).toBeLessThan(0);
  });

  it("calls two templates of the same shape equal", () => {
    expect(compareTemplateSpecificity("/user/:id", "/team/:id")).toBe(0);
  });
});
