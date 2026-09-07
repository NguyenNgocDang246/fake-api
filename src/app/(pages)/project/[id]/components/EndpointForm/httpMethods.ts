import { EndpointSchema } from "@/models/endpoint/endpoint.model";

// Derived from the schema rather than retyped, so a method added there reaches both forms.
export const httpMethods: { label: string; value: string }[] =
  EndpointSchema.shape.method.options.map((method) => ({ value: method, label: method }));
