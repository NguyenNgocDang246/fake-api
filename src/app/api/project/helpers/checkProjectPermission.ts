import { GetUserByIdDTO } from "@/models/user.model";
import { GetProjectByIdDTO } from "@/models/project.model";
import projectService from "@/server/services/project.service";
interface checkProjectPermissionProps {
  projectId: GetProjectByIdDTO["id"];
  userId: GetUserByIdDTO["id"];
}
export default async function checkProjectPermission({
  projectId,
  userId,
}: checkProjectPermissionProps) {
  const project = await projectService.getProjectById({ id: projectId });
  if (project === null) return false;

  return project.user_id === userId;
}
