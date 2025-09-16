"use client";
import { Breadcrumb } from "@/app/components/Link/Breadcrumb";
import { PAGE_ROUTES } from "@/app/libs/routes";
import { Spinner } from "../components/Loading/Spinner";
import { useProjectViewModel } from "@/app/project/viewmodel";
import { ProjectItem } from "@/app/project/components/ProjectItem";
export default function Project() {
  const { projects, handleOnclickProject, loading, message } = useProjectViewModel();
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
      <div className="mt-4 flex flex-col justify-center">
        {loading ? (
          <div className="flex justify-center mt-24">
            <Spinner />
          </div>
        ) : (
          <div>
            {projects.length > 0 ? (
              projects.map((project) => (
                <div className="mb-8" key={project.id}>
                  <ProjectItem
                    description={project.description}
                    name={project.name}
                    id={project.id}
                    onclick={() => handleOnclickProject(project.id.toString())}
                  />
                </div>
              ))
            ) : (
              <div>{message}</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
