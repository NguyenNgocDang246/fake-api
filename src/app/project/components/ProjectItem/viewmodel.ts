import { useRouter } from "next/navigation";
export const useProjectItemViewModel = () => {
  const router = useRouter();
  const handleOnclickProject = (public_id: string) => {
    void router.push(`/project/${public_id}`);
  };

  return { handleOnclickProject };
};
