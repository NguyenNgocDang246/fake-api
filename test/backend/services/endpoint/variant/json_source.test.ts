import { emitFromSource, parseJsonSource } from "@/server/services/endpoint/variant/json_source";

const VALID = [
  '{"a":1}',
  '{"a":10.00}',
  '{"a":1e2,"b":1E+2,"c":1e-2}',
  '{"a":-0}',
  '{"a":1e999}',
  '{"a":12345678901234567890}',
  '{"a":9007199254740993}',
  '{"a":"\\u0041","b":"a\\/b","c":"tab\\there"}',
  '{"a":"\\"quoted\\"","b":"back\\\\slash"}',
  '{"\\u0041":1,"b\\\\c":2}',
  '{"a":"à 🚀 x"}',
  "{}",
  '{"a":{},"b":[]}',
  '{"a":[1,[2,[3]]],"b":{"c":{"d":null}}}',
  '{"a":true,"b":false,"c":null}',
  '{"1":1,"0":2,"b":3}',
  '{\n\t"name": "Dang",\n\t"old": 3\n}',
  '{"msg":"hello   world","a":1}',
  '  {  "a"  :  [ 1 , 2 ]  }  ',
  '{"a":1,"a":2}',
  "[1,2,3]",
  '"bare string"',
  "42",
  "null",
];

const INVALID = [
  "",
  "   ",
  "{",
  "{}}",
  '{"a":1,}',
  "[1,2,]",
  '{"a" 1}',
  "{'a':1}",
  '{"a":01}',
  '{"a":.5}',
  '{"a":+1}',
  '{"a":1e}',
  '{"a":"unterminated}',
  '{"a":"bad\\xescape"}',
  '{"a":"bad\\u00zz"}',
  '{"a":NaN}',
  '{"a":undefined}',
  "{a:1}",
  '{"a":1} trailing',
];

describe("src/server/services/endpoint/variant/json_source.ts", () => {
  describe("parseJsonSource", () => {
    it.each(VALID)("parses %j to the same value JSON.parse does", (text) => {
      const node = parseJsonSource(text);
      expect(node).not.toBeNull();
      expect(node!.value).toEqual(JSON.parse(text));
    });

    it.each(VALID)("round-trips %j back to its own compact form", (text) => {
      const node = parseJsonSource(text)!;
      expect(JSON.parse(emitFromSource(node.value, node))).toEqual(JSON.parse(text));
    });

    it.each(INVALID)("answers null for %j rather than throwing", (text) => {
      expect(parseJsonSource(text)).toBeNull();
    });

    it("keeps -0 apart from 0, which toEqual does not", () => {
      expect(Object.is((parseJsonSource('{"a":-0}')!.value as { a: number }).a, -0)).toBe(true);
    });

    it("refuses a body nested past the body depth limit", () => {
      const deep = "[".repeat(40) + "1" + "]".repeat(40);
      expect(parseJsonSource(deep)).toBeNull();
    });
  });

  describe("emitFromSource", () => {
    it("hands back every literal as written and drops only the whitespace", () => {
      const text =
        '{\n\t"name": "Dang",\n\t"price": 10.00,\n\t"id": 12345678901234567890,\n\t"ratio": 1e2,\n\t"tag": "\\u0041",\n\t"1": "x"\n}';
      const node = parseJsonSource(text)!;

      expect(emitFromSource(node.value, node)).toBe(
        '{"name":"Dang","price":10.00,"id":12345678901234567890,"ratio":1e2,"tag":"\\u0041","1":"x"}'
      );
    });

    it("rebuilds only the leaf that changed", () => {
      const node = parseJsonSource('{"name":"Dang","price":10.00}')!;
      const rendered = { ...(node.value as Record<string, unknown>), name: "Kai" };

      expect(emitFromSource(rendered, node)).toBe('{"name":"Kai","price":10.00}');
    });

    it("takes key order from the source, not from the rendered object", () => {
      const node = parseJsonSource('{"b":1,"1":2,"a":3}')!;
      // A parsed object already lists "1" first, which is the order a re-stringify would emit.
      expect(Object.keys(node.value as object)).toEqual(["1", "b", "a"]);
      expect(emitFromSource(node.value, node)).toBe('{"b":1,"1":2,"a":3}');
    });

    it("matches an element past the source array against element zero", () => {
      const node = parseJsonSource('{"rows":[{"id":1,"price":10.00}]}')!;
      const rendered = { rows: [{ id: 1, price: 10 }, { id: 1, price: 10 }] };

      expect(emitFromSource(rendered, node)).toBe(
        '{"rows":[{"id":1,"price":10.00},{"id":1,"price":10.00}]}'
      );
    });

    it("stringifies an element past a source array that has no element zero", () => {
      const node = parseJsonSource('{"rows":[]}')!;
      expect(emitFromSource({ rows: [1] }, node)).toBe('{"rows":[1]}');
    });

    it("emits a shorter array without the leftover source elements", () => {
      const node = parseJsonSource('{"rows":[1,2,3]}')!;
      expect(emitFromSource({ rows: [1] }, node)).toBe('{"rows":[1]}');
    });

    it("appends a key the source never had", () => {
      const node = parseJsonSource('{"a":10.00}')!;
      expect(emitFromSource({ a: 10, b: 2 }, node)).toBe('{"a":10.00,"b":2}');
    });

    it("keeps a repeated key once, at its first position with its last value", () => {
      const node = parseJsonSource('{"a":1,"b":2,"a":3.0}')!;
      expect(node.value).toEqual({ a: 3, b: 2 });
      expect(emitFromSource(node.value, node)).toBe('{"a":3.0,"b":2}');
    });

    it("stringifies a leaf whose type changed", () => {
      const node = parseJsonSource('{"a":10.00}')!;
      expect(emitFromSource({ a: "ten" }, node)).toBe('{"a":"ten"}');
    });

    it("stringifies where the rendered shape no longer matches the source", () => {
      const node = parseJsonSource('{"a":{"b":1}}')!;
      expect(emitFromSource({ a: [1, 2] }, node)).toBe('{"a":[1,2]}');
    });
  });
});
