"use client";
import { forwardRef, useImperativeHandle } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { ClientCreateProjectDTO, ClientCreateProjectSchema } from "@/models/project.model";
import { FloatingInput } from "@/app/components/Input/FloatingInput";
import { ErrorText } from "@/app/components/Text/ErrorText";

export interface CreateProjectFormHandles {
  submit: () => Promise<boolean>;
}

export const CreateProjectForm = forwardRef<CreateProjectFormHandles>((props, ref) => {
  void props;
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ClientCreateProjectDTO>({
    resolver: zodResolver(ClientCreateProjectSchema),
  });
  const onSubmit = (data: ClientCreateProjectDTO): Promise<boolean> => {
    console.log("Form submitted:", data);
    return Promise.resolve(true);
  };

  useImperativeHandle(ref, () => ({
    submit: async () => {
      let isValid = false;

      await handleSubmit(
        async (data) => {
          isValid = await onSubmit(data); // onSubmit trả về true/false
        },
        (errors) => {
          console.log("Validation failed:", errors);
          isValid = false;
        }
      )();

      return isValid;
    },
  }));
  return (
    <div className="flex flex-col gap-4">
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
    </div>
  );
});

CreateProjectForm.displayName = "CreateProjectForm";
