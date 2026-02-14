// middleware.js
import { auth } from "@/auth";
import { NextResponse } from "next/server";

const protectedRoutes = [
  /^\/admin(\/.*)?$/, // Protect /admin and its subroutes
  /^\/home$/,
  /^\/buy(\/.*)?$/, // Protect all buy subroutes
  /^\/sell(\/.*)?$/, // Protect all sell subroutes
  /^\/donation(\/.*)?$/,
  /^\/my-orders(\/.*)?$/,
  /^\/profile(\/.*)?$/,
  /^\/review(\/.*)?$/,
  /^\/favorites$/,
  /^\/notifications$/,
  /^\/support(\/.*)?$/,
];

const authPageRoutes = ["/"];
const apiAuthPrefix = "/api/auth";

export default auth(async (req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;

  const path = nextUrl.pathname;
  const isApiAuthRoute = path.startsWith(apiAuthPrefix);
  const isProtectedRoute = protectedRoutes.some((route) =>
    route instanceof RegExp ? route.test(path) : route === path,
  );
  const isAuthPageRoute = authPageRoutes.includes(path);

  // ✅ allow auth endpoints
  if (isApiAuthRoute) return NextResponse.next();

  // ✅ Check banned + maintenance centrally
  try {
    const checkUrl = new URL("/api/auth/check-access", nextUrl);
    const r = await fetch(checkUrl, {
      headers: { cookie: req.headers.get("cookie") || "" },
      cache: "no-store",
    });

    if (r.ok) {
      const data = await r.json();

      // ✅ If logged in and banned -> kick to "/"
      if (isLoggedIn && data?.banned) {
        return NextResponse.redirect(new URL("/", nextUrl));
      }

      // ✅ Maintenance ON:
      // - allow admins to access everything
      // - everyone else (logged in or not) can only stay on "/"
      if (data?.maintenance && !data?.isAdmin) {
        if (path !== "/") {
          return NextResponse.redirect(new URL("/", nextUrl));
        }
      }
    }
  } catch {
    // don't block if check fails
  }

  // ✅ existing auth protection
  if (isProtectedRoute && !isLoggedIn) {
    return NextResponse.redirect(new URL("/", nextUrl));
  }

  if (isLoggedIn && isAuthPageRoute) {
    return NextResponse.redirect(new URL("/home", nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|webp|svg|gif|ico)$).*)",
  ],
};
