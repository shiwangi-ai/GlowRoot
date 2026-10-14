import { Suspense } from "react";
import { AuthForm } from "@/components/AuthForm";

export const metadata = { title: "Log in — GlowRoot" };

export default function LoginPage() {
  return (
    <div className="max-w-wrap mx-auto px-8 py-16">
      {/* AuthForm reads `?next=` via useSearchParams, which needs a boundary
          for this page to stay statically rendered. */}
      <Suspense fallback={null}>
        <AuthForm />
      </Suspense>
    </div>
  );
}
