"use client";

import { useActionState } from "react";
import { loginAction } from "@/lib/auth-actions";

export default function LoginForm() {
  const [error, action, pending] = useActionState(loginAction, undefined);

  return (
    <form
      action={action}
      className="grid gap-4 p-6 rounded-[22px]"
      style={{ background: "#eae9e9", border: "1px solid var(--hairline-soft)", boxShadow: "var(--shadow-md)" }}
    >
      <div>
        <div className="text-xl font-extrabold tracking-tight">Sign in</div>
        <div className="text-sm mt-0.5" style={{ color: "#605d5d" }}>
          Use your staff email and password.
        </div>
      </div>
      <div className="grid gap-[5px]">
        <span className="field-label">Email</span>
        <input
          className="input p-3"
          style={{ background: "#f8f4f4" }}
          type="email"
          name="email"
          autoComplete="username"
          required
          autoFocus
        />
      </div>
      <div className="grid gap-[5px]">
        <span className="field-label">Password</span>
        <input
          className="input p-3"
          style={{ background: "#f8f4f4" }}
          type="password"
          name="password"
          autoComplete="current-password"
          required
        />
      </div>
      {error && (
        <div className="text-sm" style={{ color: "#ae1800" }}>
          {error}
        </div>
      )}
      <button type="submit" disabled={pending} className="btn btn-primary text-[15px] p-3 mt-1">
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
