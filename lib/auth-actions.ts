"use server";

import { AuthError } from "next-auth";
import { signIn, signOut } from "./auth";

export async function loginAction(_prevState: string | undefined, formData: FormData): Promise<string | undefined> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  try {
    await signIn("credentials", { email, password, redirectTo: "/" });
  } catch (err) {
    if (err instanceof AuthError) {
      return "Incorrect email or password";
    }
    throw err;
  }
}

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}
