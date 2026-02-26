import { NavigationButton } from "@/app/components/Button/NavigationButton";
import { PAGE_ROUTES, API_ROUTES } from "@/app/libs/routes";
import api from "@/app/libs/helpers/api_call.server";
import { UserInfoDTO } from "@/models/user.model";
import { ApiSuccessResponse } from "@/models/api_response.model";
async function fetchUser(): Promise<UserInfoDTO | null> {
  try {
    const res = (await api.get(API_ROUTES.USER.GET)) as ApiSuccessResponse<UserInfoDTO>;
    return res.data;
  } catch (err) {
    return null;
  }
}

export default async function Home() {
  const user = await fetchUser();
  return (
    <div className="font-sans flex flex-col items-center justify-center sm:px-6 py-12 bg-gray-50">
      <h1 className="text-4xl font-medium text-black mb-4 text-center">Mock APIs in seconds</h1>
      <p className="text-lg text-gray-600 max-w-2xl text-center mb-8">
        Quickly create and manage mock APIs to develop and test your applications. No real backend
        needed—just a few clicks.
      </p>

      <NavigationButton
        className="text-lg bg-blue-400"
        href={user ? PAGE_ROUTES.PROJECT : PAGE_ROUTES.AUTH.LOGIN}
      >
        Get started
      </NavigationButton>

      <div className="mt-12 w-full max-w-xl bg-white shadow rounded-xl p-6">
        <h2 className="text-xl font-semibold mb-3">API Example</h2>
        <pre className="bg-gray-100 p-4 rounded-md text-sm overflow-x-auto">
          {`GET https://www.fake-api.dev/QGONEwKEqJg/api/user/1\n\nResponse:\n{\n    "id": "1",\n    "name": "John Doe",\n    "email": "john@example.com"\n}`}
        </pre>
      </div>
    </div>
  );
}
