import { MAX_RESPONSE_BODY_DEPTH } from "@/models/endpoint/primitives.model";

// A parse that remembers the text every value was written as, so serving a rendered variant can
// hand back the author's own literal for each field the blueprint never touched. `JSON.parse`
// alone cannot do this: by the time a reviver sees a number its precision is already gone.

export interface SourceEntry {
  key: string;
  keyRaw: string;
  node: SourceNode;
}

export type SourceNode =
  | { kind: "scalar"; value: unknown; raw: string }
  | { kind: "array"; value: unknown[]; items: SourceNode[] }
  | { kind: "object"; value: Record<string, unknown>; entries: SourceEntry[] };

// Deeper than a body is allowed to be. The cap is what keeps a hostile nesting from reaching the
// recursion limit before the parse can refuse it.
const MAX_DEPTH = MAX_RESPONSE_BODY_DEPTH + 1;

const WHITESPACE = new Set([" ", "\t", "\n", "\r"]);
const NUMBER = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/;

class JsonSourceParser {
  private at = 0;

  constructor(private readonly text: string) {}

  parse(): SourceNode {
    this.skipWhitespace();
    const node = this.value(0);
    this.skipWhitespace();
    if (this.at !== this.text.length) this.fail("trailing content");
    return node;
  }

  private fail(what: string): never {
    throw new SyntaxError(`${what} at ${this.at}`);
  }

  private skipWhitespace(): void {
    while (this.at < this.text.length && WHITESPACE.has(this.text[this.at]!)) this.at += 1;
  }

  private expect(char: string): void {
    if (this.text[this.at] !== char) this.fail(`expected ${char}`);
    this.at += 1;
  }

  private value(depth: number): SourceNode {
    if (depth > MAX_DEPTH) this.fail("too deeply nested");

    const char = this.text[this.at];
    if (char === "{") return this.object(depth);
    if (char === "[") return this.array(depth);
    if (char === '"') {
      const start = this.at;
      const value = this.string();
      return { kind: "scalar", value, raw: this.text.slice(start, this.at) };
    }
    return this.literal();
  }

  private object(depth: number): SourceNode {
    this.expect("{");
    const entries: SourceEntry[] = [];
    const value: Record<string, unknown> = {};
    const positionOf = new Map<string, number>();

    this.skipWhitespace();
    if (this.text[this.at] === "}") {
      this.at += 1;
      return { kind: "object", value, entries };
    }

    for (;;) {
      this.skipWhitespace();
      const keyStart = this.at;
      if (this.text[this.at] !== '"') this.fail("expected a key");
      const key = this.string();
      const keyRaw = this.text.slice(keyStart, this.at);

      this.skipWhitespace();
      this.expect(":");
      this.skipWhitespace();
      const node = this.value(depth + 1);

      // A repeated key keeps the position it first appeared at and the value it last had, which
      // is what `JSON.parse` plus JS property order together produce.
      const seen = positionOf.get(key);
      if (seen === undefined) {
        positionOf.set(key, entries.length);
        entries.push({ key, keyRaw, node });
      } else {
        entries[seen] = { key, keyRaw, node };
      }
      value[key] = node.value;

      this.skipWhitespace();
      if (this.text[this.at] === ",") {
        this.at += 1;
        continue;
      }
      this.expect("}");
      return { kind: "object", value, entries };
    }
  }

  private array(depth: number): SourceNode {
    this.expect("[");
    const items: SourceNode[] = [];
    const value: unknown[] = [];

    this.skipWhitespace();
    if (this.text[this.at] === "]") {
      this.at += 1;
      return { kind: "array", value, items };
    }

    for (;;) {
      this.skipWhitespace();
      const node = this.value(depth + 1);
      items.push(node);
      value.push(node.value);

      this.skipWhitespace();
      if (this.text[this.at] === ",") {
        this.at += 1;
        continue;
      }
      this.expect("]");
      return { kind: "array", value, items };
    }
  }

  private literal(): SourceNode {
    for (const [word, value] of [
      ["true", true],
      ["false", false],
      ["null", null],
    ] as const) {
      if (this.text.startsWith(word, this.at)) {
        this.at += word.length;
        return { kind: "scalar", value, raw: word };
      }
    }

    const match = NUMBER.exec(this.text.slice(this.at));
    if (!match) this.fail("expected a value");

    const raw = match[0];
    this.at += raw.length;
    return { kind: "scalar", value: Number(raw), raw };
  }

  // JSON string grammar, so a lone control character or a bad escape is refused rather than
  // silently accepted the way a permissive scan would.
  private string(): string {
    this.expect('"');
    let out = "";

    for (;;) {
      const char = this.text[this.at];
      if (char === undefined) this.fail("unterminated string");
      this.at += 1;

      if (char === '"') return out;

      if (char !== "\\") {
        if (char < " ") this.fail("raw control character");
        out += char;
        continue;
      }

      const escape = this.text[this.at];
      this.at += 1;
      if (escape === "u") {
        const hex = this.text.slice(this.at, this.at + 4);
        if (!/^[0-9a-fA-F]{4}$/.test(hex)) this.fail("bad unicode escape");
        this.at += 4;
        out += String.fromCharCode(parseInt(hex, 16));
        continue;
      }

      const simple = SIMPLE_ESCAPES[escape ?? ""];
      if (simple === undefined) this.fail("bad escape");
      out += simple;
    }
  }
}

const SIMPLE_ESCAPES: Record<string, string> = {
  '"': '"',
  "\\": "\\",
  "/": "/",
  b: "\b",
  f: "\f",
  n: "\n",
  r: "\r",
  t: "\t",
};

// `null` rather than a throw, so a caller on the serving path falls back instead of failing.
export function parseJsonSource(text: string): SourceNode | null {
  try {
    return new JsonSourceParser(text).parse();
  } catch {
    return null;
  }
}

function stringify(value: unknown): string {
  return JSON.stringify(value) ?? "null";
}

// Writes `rendered` back out against the text it was rendered from: a scalar the blueprint left
// alone comes back as the author's own literal, and everything else is rebuilt. Containers are
// always rebuilt, so only literals are copied and the result carries no whitespace of its own.
export function emitFromSource(rendered: unknown, node: SourceNode | undefined): string {
  if (node === undefined) return stringify(rendered);

  if (Array.isArray(rendered) && node.kind === "array") {
    // An element past the source array was cloned from element zero by `resizeArrays`, so that is
    // the node its untouched fields still match.
    const template = node.items[0];
    const parts = rendered.map((item, index) =>
      emitFromSource(item, index < node.items.length ? node.items[index] : template)
    );
    return `[${parts.join(",")}]`;
  }

  if (isPlainObject(rendered) && node.kind === "object") {
    const parts: string[] = [];
    const emitted = new Set<string>();

    for (const entry of node.entries) {
      if (!Object.prototype.hasOwnProperty.call(rendered, entry.key)) continue;
      emitted.add(entry.key);
      parts.push(`${entry.keyRaw}:${emitFromSource(rendered[entry.key], entry.node)}`);
    }

    for (const [key, value] of Object.entries(rendered)) {
      if (emitted.has(key)) continue;
      parts.push(`${JSON.stringify(key)}:${emitFromSource(value, undefined)}`);
    }

    return `{${parts.join(",")}}`;
  }

  if (node.kind === "scalar" && Object.is(rendered, node.value)) return node.raw;
  return stringify(rendered);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
