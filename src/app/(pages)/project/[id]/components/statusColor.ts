// What a status code looks like wherever the project page shows one: the endpoint rows and the
// scenario column read the same code off the same scenario, so they cannot answer it differently.
export function statusColor(status_code: number): string {
  if (status_code >= 200 && status_code < 300) return "bg-green-100 text-green-700";
  if (status_code >= 400) return "bg-red-100 text-red-700";
  return "bg-gray-100 text-gray-700";
}
