import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import LoginForm from "@/components/LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) {
    redirect(session.user.role === "CARETAKER" ? "/caretaker" : "/landlord");
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-[380px]">
        <div className="flex items-center gap-2.5 mb-8 justify-center">
          <div className="w-3.5 h-3.5 rounded-[4px]" style={{ background: "#ec3013" }} />
          <div className="font-extrabold text-[15px] tracking-tight">HAUSWERK</div>
          <div className="text-[11px] tracking-[0.08em] uppercase" style={{ color: "#605d5d" }}>
            Internal ops
          </div>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
