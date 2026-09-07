// Short free text that someone other than this code wrote: the author's hint on the way in, and
// the model's own words on the way out. Both are displayed to a user and neither is ever executed,
// so the job here is to make what is displayed the same as what is there.

// Control codes, format characters and the two line separators. They render as nothing, or as
// text running the other way, which is what makes them useful for hiding one instruction inside
// another. Removed after the whitespace fold, or dropping a newline would join two words.
const INVISIBLE_CHARS = /[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/gu;

// One line, one space between words, nothing invisible. NFKC first so a fullwidth or styled
// character reaches the reader as the plain one it imitates.
export function collapseUntrusted(text: string): string {
  return text.normalize("NFKC").replace(/\s+/g, " ").replace(INVISIBLE_CHARS, "").trim();
}

// A link or a code fence in a line of explanatory text is never the explanation. It is the shape
// free text takes when it is carrying something else out, so the line is dropped rather than
// cleaned: there is no version of it worth showing.
const LINK_OR_FENCE = /(https?:\/\/|www\.|]\(|```|<\/?[a-z]+[\s>])/i;

export function carriesLinkOrFence(text: string): boolean {
  return LINK_OR_FENCE.test(text);
}
