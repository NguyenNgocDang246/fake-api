"use client";
import { Breadcrumb } from "@/app/components/Link/Breadcrumb";
import { PAGE_ROUTES } from "@/app/libs/routes";
import { Spinner } from "../components/Loading/Spinner";
import { useProjectViewModel } from "@/app/project/viewmodel";
import { ProjectItem } from "@/app/project/components/ProjectItem";
import { NoContentText } from "@/app/components/Text/NoContentText";
import { ActionButton } from "@/app/components/Button/ActionButton";
export default function Project() {
  const { projects, handleOnclickProject, loading } = useProjectViewModel();
  return (
    <div className="h-screen">
      <div className="flex justify-start">
        <Breadcrumb
          items={[
            { label: "Home", href: PAGE_ROUTES.HOME },
            { label: "Project", href: PAGE_ROUTES.PROJECT },
          ]}
        />
      </div>
      <div className="mt-8 flex flex-col justify-center">
        <div className="mb-4 flex items-center justify-end">
          <ActionButton label="Create new" type="create" className="ml-4" onClick={() => {}} />
          <ActionButton
            label="Delete all"
            type="delete"
            disabled={!projects || projects.length === 0}
            className="ml-4"
            onClick={() => {}}
          />
        </div>
        {loading ? (
          <div className="flex justify-center mt-24">
            <Spinner />
          </div>
        ) : (
          <div>
            {projects.length > 0 ? (
              projects.map((project) => (
                <div className="mb-4" key={project.public_id}>
                  <ProjectItem
                    description={project.description}
                    name={project.name}
                    public_id={project.public_id}
                    onclick={() => handleOnclickProject(project.public_id.toString())}
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
