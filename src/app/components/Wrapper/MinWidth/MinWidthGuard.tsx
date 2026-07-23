export const MinWidthGuard = ({ children }: { children: React.ReactNode }) => {
  return (
    <>
      <div className="flex min-h-screen items-center justify-center p-6 text-center min-[300px]:hidden">
        <p className="text-gray-600 font-medium">
          Your screen is too small. Please widen your browser window or use a device with a screen
          width of at least 300px to use this app.
        </p>
      </div>
      <div className="hidden min-[300px]:contents">{children}</div>
    </>
  );
};
