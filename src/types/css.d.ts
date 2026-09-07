// Next only ships declarations for `*.module.css`, so a side-effect import of a plain
// stylesheet has no type. The bundler handles those imports; this just tells TypeScript they
// exist. `next-env.d.ts` would be the natural home but it is generated and must not be edited.
declare module "*.css";
