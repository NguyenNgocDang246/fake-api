import type { ComboOption } from "@/app/components/Input/ComboInput";

// The codes worth one keystroke. Any whole number in range is still typable, the model layer is
// the one that decides what a status code may be.
export const statusCodeOptions: ComboOption[] = [
  { value: "200", label: "200 OK", hint: "success" },
  { value: "201", label: "201 Created", hint: "success" },
  { value: "202", label: "202 Accepted", hint: "success" },
  { value: "204", label: "204 No Content", hint: "success" },
  { value: "301", label: "301 Moved Permanently", hint: "redirect" },
  { value: "302", label: "302 Found", hint: "redirect" },
  { value: "304", label: "304 Not Modified", hint: "redirect" },
  { value: "400", label: "400 Bad Request", hint: "client" },
  { value: "401", label: "401 Unauthorized", hint: "client" },
  { value: "403", label: "403 Forbidden", hint: "client" },
  { value: "404", label: "404 Not Found", hint: "client" },
  { value: "409", label: "409 Conflict", hint: "client" },
  { value: "422", label: "422 Unprocessable Entity", hint: "client" },
  { value: "429", label: "429 Too Many Requests", hint: "client" },
  { value: "500", label: "500 Internal Server Error", hint: "server" },
  { value: "502", label: "502 Bad Gateway", hint: "server" },
  { value: "503", label: "503 Service Unavailable", hint: "server" },
];
