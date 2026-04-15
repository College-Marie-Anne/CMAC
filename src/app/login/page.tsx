import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";

function LoginFallback() {
  // Fond bordeaux uniquement (pas de particules — keep server-rendable).
  return (
    <div
      className="relative flex min-h-screen w-full items-center justify-center overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse at 50% 30%, #800020 0%, #5c0018 40%, #3a000f 80%, #1a0008 100%)",
      }}
      aria-busy="true"
    />
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginForm />
    </Suspense>
  );
}
