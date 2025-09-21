"use client";
import { useEndpointGroupViewModel } from "@/app/project/[id]/viewmodel";
import { EndpointGroupItem } from "@/app/project/[id]/components/EndpointGroupItem";
import { Breadcrumb } from "@/app/components/Link/Breadcrumb";
import { LoadingDots } from "@/app/components/Loading/LoadingDots";
import { ActionButton } from "@/app/components/Button/ActionButton";
import { PAGE_ROUTES } from "@/app/libs/routes";
export default function Project() {
  const { projectInfo, endpointGroups, loading, message } = useEndpointGroupViewModel();
  return (
    <div className="h-screen">
      <div className="flex justify-start">
        {loading ? (
          <div className="flex items-center">
            <Breadcrumb
              items={[
                { label: "Home", href: PAGE_ROUTES.HOME },
                { label: "Project", href: PAGE_ROUTES.PROJECT },
              ]}
            />
            <div className="flex justify-center ml-4">
              <LoadingDots text="." />
            </div>
          </div>
        ) : (
          <Breadcrumb
            items={[
              { label: "Home", href: PAGE_ROUTES.HOME },
              { label: "Project", href: PAGE_ROUTES.PROJECT },
              { label: projectInfo?.name ?? "", href: PAGE_ROUTES.PROJECT + "/" + projectInfo?.id },
            ]}
          />
        )}
      </div>
      <div className="flex mt-8 gap-24">
        <div className="w-1/4">
          <p className="text-center text-xl">Endpoint Groups</p>
          <div className="mt-2 p-4 border rounded-2xl border-gray-400">
            <ActionButton label="Create new" className="mb-4 flex w-full" onClick={() => {}} />
            {endpointGroups.map((group) => (
              <div key={group.id} className="mb-2">
                <EndpointGroupItem id={group.id} name={group.name} onclick={() => {}} />
              </div>
            ))}
          </div>
        </div>
        <div className="grow flex flex-col justify-center">
          <h1>Endpoints</h1>
          <div>Endpoints</div>
        </div>
      </div>
    </div>
  );
}
