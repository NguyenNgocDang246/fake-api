"use client";
import { forwardRef, useImperativeHandle } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { ClientCreateProjectDTO, ClientCreateProjectSchema } from "@/models/project.model";

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
    <div>
      <div>
        <input type="text" {...register("name")} />
        {errors.name && <p>{errors.name.message}</p>}
      </div>
      <div>
        <input type="text" {...register("description")} />
        {errors.description && <p>{errors.description.message}</p>}
      </div>
    </div>
  );
});

CreateProjectForm.displayName = "CreateProjectForm";
