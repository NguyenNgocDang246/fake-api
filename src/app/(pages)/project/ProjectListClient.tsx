"use client";
import { Spinner } from "../../components/Loading/Spinner";
import { useProjectViewModel } from "@/app/(pages)/project/viewmodel";
import { ProjectItem } from "@/app/(pages)/project/components/ProjectItem/ProjectItem";
import { EmptyState } from "@/app/components/Text/EmptyState";
import { ActionButton } from "@/app/components/Button/ActionButton";

export function ProjectListClient() {
  const { projectsState, openCreateProjectModal, openDeleteAllProjectModal } =
    useProjectViewModel();

  const hasProjects = projectsState.data && projectsState.data.length > 0;

  return (
    <div className="mt-4 flex flex-col justify-center">
      <div className="mb-4 flex gap-4 items-center justify-end">
        <ActionButton
          label="Create new"
          variant="create"
          onClick={() => openCreateProjectModal()}
        />
        <ActionButton
          label="Delete all"
          variant="delete"
          disabled={!hasProjects}
          onClick={() => openDeleteAllProjectModal()}
        />
      </div>
      {!projectsState.isFetched ? (
        <div className="flex justify-center mt-24">
          <Spinner />
        </div>
      ) : projectsState.isError ? (
        <div className="text-center mt-24 text-red-500">{String(projectsState.error.message)}</div>
      ) : (
        <div>
          {hasProjects ? (
            projectsState.data.map((project) => (
              <div className="mb-4" key={project.public_id}>
                <ProjectItem
                  description={project.description}
                  name={project.name}
                  public_id={project.public_id}
                />
              </div>
            ))
          ) : (
            <EmptyState
              className="mt-12"
              title="You don't have any projects yet"
              description="A project holds your mock endpoints and gives them their own URL. Create one and you can start answering requests in about a minute."
              action={
                <ActionButton
                  label="Create your first project"
                  variant="create"
                  onClick={() => openCreateProjectModal()}
                />
              }
            />
          )}
        </div>
      )}
    </div>
  );
}
