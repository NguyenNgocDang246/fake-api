import {
  ClientCreateEndpointDTO,
  ClientCreateEndpointSchema,
  checkResponseBody,
} from "@/models/endpoint/endpoint.model";
import { zodResolver } from "@hookform/resolvers/zod";
import { validateAiFields } from "./validateAiFields";
import { Resolver, FieldErrors } from "react-hook-form";

// One resolver for both forms: `ClientUpdateEndpointByIdSchema` is `ClientCreateEndpointSchema`,
// so an update validates by exactly the same rules a create does.

function isNumber(str: string): boolean {
  if (!str) return false;
  return !isNaN(Number(str));
}

type ScenarioErrors = NonNullable<FieldErrors<ClientCreateEndpointDTO>["scenarios"]>;

const customResolver: Resolver<ClientCreateEndpointDTO> = async (values, context, options) => {
  const errors: FieldErrors<ClientCreateEndpointDTO> = {};

  if (values.path === "") {
    values.path = "/";
  }

  // Reported at the index the pager rendered the page at, so a message lands on the page that
  // earned it. Every page is checked, not only the one on screen: a submit has to say what is
  // wrong everywhere before it moves to the first broken page.
  const scenarios: NonNullable<ScenarioErrors>[number][] = [];
  for (const [index, scenario] of (values.scenarios ?? []).entries()) {
    const row: NonNullable<ScenarioErrors>[number] = {};

    if (scenario.response_body === "") {
      scenario.response_body = "{}";
    }

    // `?? ""` because react-hook-form can hand the resolver a field it has not registered yet.
    const bodyCheck = checkResponseBody(scenario.response_body ?? "");
    if (!bodyCheck.ok) {
      row.response_body = { type: "manual", message: bodyCheck.message };
    }

    if (!isNumber(scenario.delay_ms)) {
      row.delay_ms = { type: "manual", message: "Delay must be a number" };
    }

    if (!isNumber(scenario.status_code)) {
      row.status_code = { type: "manual", message: "Status code must be a number" };
    }

    const aiFieldsError = validateAiFields(scenario);
    if (aiFieldsError) row.ai_fields = aiFieldsError;

    if (Object.keys(row).length > 0) scenarios[index] = row;
  }

  if (scenarios.some(Boolean)) errors.scenarios = scenarios as ScenarioErrors;

  if (Object.keys(errors).length > 0) {
    return {
      values: {},
      errors,
    };
  }

  return zodResolver(ClientCreateEndpointSchema)(values, context, options);
};

export default customResolver;
