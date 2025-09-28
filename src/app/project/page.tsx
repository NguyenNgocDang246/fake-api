"use client";
import { Breadcrumb } from "@/app/components/Link/Breadcrumb";
import { PAGE_ROUTES } from "@/app/libs/routes";
import { Spinner } from "../components/Loading/Spinner";
import { useProjectViewModel } from "@/app/project/viewmodel";
import { ProjectItem } from "@/app/project/components/ProjectItem/ProjectItem";
import { NoContentText } from "@/app/components/Text/NoContentText";
import { ActionButton } from "@/app/components/Button/ActionButton";

export default function Project() {
  const { projectsState, openCreateProjectModal, openDeleteAllProjectModal } =
    useProjectViewModel();

  const hasProjects = projectsState.data && projectsState.data.length > 0;

  return (
    <div className="min-h-screen">
      <div className="flex justify-start">
        <Breadcrumb
          items={[
            { label: "Home", href: PAGE_ROUTES.HOME },
            { label: "Project", href: PAGE_ROUTES.PROJECT },
          ]}
        />
      </div>
      <div className="mt-4 flex flex-col justify-center">
        <div className="mb-4 flex items-center justify-end">
          <ActionButton
            label="Create new"
            type="create"
            className="ml-4"
            onClick={() => openCreateProjectModal()}
          />
          <ActionButton
            label="Delete all"
            type="delete"
            disabled={!hasProjects}
            className="ml-4"
            onClick={() => openDeleteAllProjectModal()}
          />
        </div>
        {!projectsState.isFetched ? (
          <div className="flex justify-center mt-24">
            <Spinner />
          </div>
        ) : projectsState.isError ? (
          <div className="text-center mt-24 text-red-500">{String(projectsState.error)}</div>
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
              <NoContentText message="No project found" className="mt-24 text-center" />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
