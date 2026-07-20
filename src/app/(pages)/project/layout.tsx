import { ProjectBreadcrumbBar } from "@/app/(pages)/project/components/ProjectBreadcrumbBar";

export default function ProjectLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <div className="flex justify-start">
        <ProjectBreadcrumbBar />
      </div>
      {children}
    </div>
  );
}
