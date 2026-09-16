import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

// Optimistic, cookie-only redirects (no DB access here — see
// node_modules/next/dist/docs/01-app/02-guides/authentication.md's
// "Optimistic checks with Proxy" section). The real authorization boundary
// is in lib/dal.ts (used by every route layout/page and Server Action),
// this just avoids a round trip to an obviously-wrong screen.
export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth?.user;
  const role = req.auth?.user?.role;

  if (pathname === "/login") {
    if (isLoggedIn) {
      return NextResponse.redirect(new URL(role === "CARETAKER" ? "/caretaker" : "/landlord", req.nextUrl));
    }
    return NextResponse.next();
  }

  if (!isLoggedIn) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }

  if (pathname.startsWith("/landlord") && role !== "LANDLORD") {
    return NextResponse.redirect(new URL("/caretaker", req.nextUrl));
  }
  if (pathname.startsWith("/caretaker") && role !== "CARETAKER") {
    return NextResponse.redirect(new URL("/landlord", req.nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  // sw.js and manifest.webmanifest must be fetchable while signed out — the
  // browser requests the manifest from <head> and registers the service
  // worker on every page load, /login included, and a stale offline page
  // is exactly the case where that request must not get redirected away.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|sw\\.js|manifest\\.webmanifest|icons/).*)"],
};
