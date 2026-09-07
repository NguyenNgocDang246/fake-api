// Structured data has to reach the browser as a raw script body, so there is no
// JSX-shaped alternative to dangerouslySetInnerHTML here.
export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
