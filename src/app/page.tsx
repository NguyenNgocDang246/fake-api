"use client";
import { NavigationButton } from "@/app/components/Button/NavigationButton";
import { PAGE_ROUTES } from "@/app/libs/routes";
import { useAuth } from "@/app/components/Wrapper/Auth/AuthWrapper";
export default function Home() {
  const { user } = useAuth();
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
