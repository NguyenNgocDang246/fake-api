function buildUrl(path: string, params: Record<string, string | number>) {
  return path.replace(/:([a-zA-Z]+)/g, (_, key) => String(params[key]));
}

export default buildUrl;
