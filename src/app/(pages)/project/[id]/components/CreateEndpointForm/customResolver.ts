import { ClientCreateEndpointDTO, ClientCreateEndpointSchema } from "@/models/endpoint.model";
import { zodResolver } from "@hookform/resolvers/zod";
import { Resolver, FieldErrors } from "react-hook-form";

function isValidJson(str: string): boolean {
  try {
    if (str == "null") return false;
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
}

function isNumber(str: string): boolean {
  if (!str) return false;
  return !isNaN(Number(str));
}

const customResolver: Resolver<ClientCreateEndpointDTO> = async (values, context, options) => {
  const errors: FieldErrors<ClientCreateEndpointDTO> = {};

  if (values.path === "") {
    values.path = "/";
  }

  if (values.response_body === "") {
    values.response_body = "{}";
  }

  if (!isValidJson(values.response_body)) {
    console.log(values);
    errors.response_body = {
      type: "manual",
      message: "Invalid JSON",
    };
  }

  if (!isNumber(values.delay_ms)) {
    errors.delay_ms = {
      type: "manual",
      message: "Delay must be a number",
    };
  }

  if (!isNumber(values.status_code)) {
    errors.status_code = {
      type: "manual",
      message: "Status code must be a number",
    };
  }

  if (Object.keys(errors).length > 0) {
    return {
      values: {},
      errors,
    };
  }

  return zodResolver(ClientCreateEndpointSchema)(values, context, options);
};

export default customResolver;
