"use client";

import React, { useEffect, useState } from "react";
import {
  Control,
  FieldErrors,
  UseFormRegister,
  UseFormSetValue,
  useWatch,
} from "react-hook-form";
import { ChevronDown, Globe } from "lucide-react";
import { ClientCreateProjectDTO, MAX_CORS_ORIGINS } from "@/models/project.model";
import { FloatingInput } from "@/app/components/Input/FloatingInput";
import { DefaultInput } from "@/app/components/Input/DefaultInput";
import { RepeatableRowList } from "@/app/components/Input/RepeatableRowList";
import { Switch } from "@/app/components/Input/Switch";
import { FormTabs } from "@/app/components/Tabs/FormTabs";
import { ErrorText } from "@/app/components/Text/ErrorText";

interface ProjectFormProps {
  register: UseFormRegister<ClientCreateProjectDTO>;
  control: Control<ClientCreateProjectDTO>;
  errors: FieldErrors<ClientCreateProjectDTO>;
  setValue: UseFormSetValue<ClientCreateProjectDTO>;
  // Only a submit attempt moves the tab, so the effect below needs the attempts, not the errors
  // alone: an error already on screen must not yank the tab while the user types.
  submitCount: number;
  // Update only: a project that already names origins opens the disclosure, since a saved
  // setting must not hide. A create starts on the defaults, so there is nothing to reveal.
  openOriginsInitially?: boolean | undefined;
}

export const ProjectForm: React.FC<ProjectFormProps> = ({
  register,
  control,
  errors,
  setValue,
  submitCount,
  openOriginsInitially = false,
}) => {
  const [moreOpen, setMoreOpen] = useState(openOriginsInitially);

  const corsEnabled = useWatch({ control, name: "cors_enabled" });
  const origins = useWatch({ control, name: "cors_origins" }) ?? [];
  const allowCredentials = useWatch({ control, name: "cors_allow_credentials" });

  const detailsHasError = !!(errors.name || errors.description);
  const corsHasError = !!(
    errors.cors_enabled ||
    errors.cors_origins ||
    errors.cors_allow_credentials
  );

  // `FormTabs` opens the tab that carries the error; the disclosure inside it is this form's own,
  // so revealing it stays here.
  useEffect(() => {
    if (submitCount > 0 && corsHasError) setMoreOpen(true);
  }, [submitCount, corsHasError]);

  // `useFieldArray` wants objects, and this list is plain strings, so the two buttons write the
  // whole array back rather than going through it.
  const setOrigins = (next: string[]) =>
    setValue("cors_origins", next, { shouldDirty: true, shouldValidate: submitCount > 0 });

  // Blank rows are what the author just added and has not filled in, and the schema drops them on
  // the way out, so neither the summary nor the credentials gate may count them.
  const namedOrigins = origins.filter((origin) => origin.trim() !== "").length;

  // The line on the "More options" row and the tab dot read from the same state.
  const corsSummary = !corsEnabled
    ? "Blocked in browsers"
    : namedOrigins === 0
      ? "Any origin"
      : `${namedOrigins} origin${namedOrigins > 1 ? "s" : ""}${
          allowCredentials ? " · cookies on" : ""
        }`;
  const details = (
    <>
      <div>
        <FloatingInput label="Name" register={register("name")} type="text" id="name" />
        {errors.name && <ErrorText message={errors.name.message} />}
      </div>
      <div>
        <FloatingInput
          label="Description"
          register={register("description")}
          type="text"
          id="description"
        />
        {errors.description && <ErrorText message={errors.description.message} />}
      </div>
    </>
  );

  // One panel per advanced setting, each with its own design. The next one is a sibling.
  const advanced = (
    <div className="flex flex-col gap-3 rounded-xl border border-gray-200 p-3.5">
      <div className="flex flex-wrap items-center gap-2">
        <Globe size={16} className="shrink-0 text-gray-500" />
        <span className="text-sm font-semibold text-gray-800">Browser access</span>
        <span className="rounded-sm bg-gray-100 px-1.5 py-0.5 font-mono text-[10px] tracking-wide text-gray-500">
          CORS
        </span>
      </div>
      <p className="text-xs leading-relaxed text-gray-500">
        Which sites may call this project&apos;s endpoints from a browser. By default any page can,
        so you can leave this alone.
      </p>

      <Switch
        id="cors_enabled"
        label="Allow browsers to call this project"
        register={register("cors_enabled")}
      />
      {errors.cors_enabled && <ErrorText message={errors.cors_enabled.message} />}

      {!corsEnabled ? (
        <p className="text-xs leading-relaxed text-gray-500">
          Turned off, a browser blocks every call to this project. Handy for checking how your app
          behaves when that happens. Tools like curl still get an answer.
        </p>
      ) : (
        <div className="flex flex-col gap-3 border-t border-gray-100 pt-3">
          <button
            type="button"
            aria-expanded={moreOpen}
            aria-controls="cors-more"
            onClick={() => setMoreOpen((open) => !open)}
            className="flex w-full cursor-pointer items-center gap-2 py-0.5 text-left text-gray-600 transition hover:text-gray-900"
          >
            <ChevronDown
              size={14}
              className={`transition-transform duration-200 ${moreOpen ? "rotate-180" : ""}`}
            />
            <span className="text-sm">More options</span>
            <small className="ml-auto text-xs text-gray-500">{corsSummary}</small>
          </button>

          <div id="cors-more" className={moreOpen ? "flex flex-col gap-3" : "hidden"}>
            <div className="flex flex-col gap-2">
              <p className="text-sm text-gray-800">Allowed origins</p>
              <p className="text-xs leading-relaxed text-gray-500">
                Empty means any origin. Add one to let only those through.
              </p>

              <RepeatableRowList
                itemKeys={origins.map((_, index) => String(index))}
                max={MAX_CORS_ORIGINS}
                addLabel="Add origin"
                onAdd={() => setOrigins([...origins, ""])}
                onRemove={(index) => setOrigins(origins.filter((_, i) => i !== index))}
                removeLabel={(index) => `Remove origin ${index + 1}`}
                rowError={(index) => errors.cors_origins?.[index]?.message}
                listError={
                  typeof errors.cors_origins?.message === "string"
                    ? errors.cors_origins.message
                    : undefined
                }
                renderRow={(index) => (
                  <DefaultInput
                    className="w-full font-mono text-sm"
                    label="Origin"
                    hideLabel
                    register={register(`cors_origins.${index}`)}
                    type="text"
                    id={`cors_origins.${index}`}
                    placeholder="http://localhost:3000"
                  />
                )}
              />
            </div>

            {/* `Switch` already dims itself when disabled, so the reason below stays at full
                contrast rather than being dimmed a second time by a wrapper. */}
            <div className="flex flex-col gap-1">
              <Switch
                id="cors_allow_credentials"
                label="Send cookies and auth headers"
                register={register("cors_allow_credentials")}
                disabled={namedOrigins === 0}
              />
              {namedOrigins === 0 && (
                <p className="text-xs leading-relaxed text-gray-500">
                  Needs at least one origin, because browsers refuse credentials when any origin
                  is allowed.
                </p>
              )}
              {errors.cors_allow_credentials && (
                <ErrorText message={errors.cors_allow_credentials.message} />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <FormTabs
      ariaLabel="Project settings"
      submitCount={submitCount}
      tabs={[
        { id: "details", label: "Details", hasError: detailsHasError, content: details },
        {
          id: "advanced",
          label: "Advanced",
          hasError: corsHasError,
          marked: !corsEnabled || namedOrigins > 0,
          content: advanced,
        },
      ]}
    />
  );
};
