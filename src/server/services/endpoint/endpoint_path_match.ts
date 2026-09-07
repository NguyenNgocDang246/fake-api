export function matchPathTemplate(template: string, pathname: string): boolean {
  const templateSegments = template.split("/").filter(Boolean);
  const pathSegments = pathname.split("/").filter(Boolean);
  if (templateSegments.length !== pathSegments.length) return false;
  return templateSegments.every(
    (segment, i) => segment.startsWith(":") || segment === pathSegments[i]
  );
}

// Which of two templates that both match the same path is the more specific one. Compared left
// to right: at the first segment where one spells the value out and the other takes a parameter,
// the literal wins, so `/shop/list/:name` beats `/shop/:id/item` for `/shop/list/item`.
export function compareTemplateSpecificity(a: string, b: string): number {
  const aSegments = a.split("/").filter(Boolean);
  const bSegments = b.split("/").filter(Boolean);

  for (let i = 0; i < aSegments.length; i += 1) {
    const aParam = aSegments[i]?.startsWith(":") ?? false;
    const bParam = bSegments[i]?.startsWith(":") ?? false;
    if (aParam !== bParam) return aParam ? 1 : -1;
  }

  return 0;
}
