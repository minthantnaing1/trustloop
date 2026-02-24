// middleware.js
import { auth } from "@/auth";
import { NextResponse } from "next/server";

const protectedRoutes = [
  /^\/admin(\/.*)?$/,
  /^\/home$/,
  /^\/buy(\/.*)?$/,
  /^\/sell(\/.*)?$/,
  /^\/donation(\/.*)?$/,
  /^\/my-orders(\/.*)?$/,
  /^\/profile(\/.*)?$/,
  /^\/review(\/.*)?$/,
  /^\/favorites$/,
  /^\/notifications$/,
  /^\/support(\/.*)?$/,
  /^\/terms$/,
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

  if (isApiAuthRoute) return NextResponse.next();

  // ✅ keep check-access result
  let access = null;

  try {
    const checkUrl = new URL("/api/auth/check-access", nextUrl);
    const r = await fetch(checkUrl, {
      headers: { cookie: req.headers.get("cookie") || "" },
      cache: "no-store",
    });

    if (r.ok) {
      access = await r.json();

      // ✅ If logged in and banned -> force "/"
      // BUT allow "/" to render to avoid redirect loop
      if (isLoggedIn && access?.banned) {
        if (path === "/") return NextResponse.next();
        return NextResponse.redirect(new URL("/", nextUrl));
      }

      // ✅ Maintenance ON (non-admin) -> keep on "/"
      if (access?.maintenance && !access?.isAdmin) {
        if (path !== "/") return NextResponse.redirect(new URL("/", nextUrl));
      }

      // ✅ Terms gate
      if (isLoggedIn && !access?.termsAccepted) {
        if (path !== "/terms") {
          const dest = new URL("/terms", nextUrl);
          dest.searchParams.set(
            "callbackUrl",
            nextUrl.pathname + nextUrl.search,
          );
          return NextResponse.redirect(dest);
        }
      }
    }
  } catch {
    // don't block if check fails
  }

  if (isProtectedRoute && !isLoggedIn) {
    return NextResponse.redirect(new URL("/", nextUrl));
  }

  // ✅ logged-in users usually go to /home
  // BUT if banned/maintenance, allow "/" to render (no redirect)
  if (isLoggedIn && isAuthPageRoute) {
    if (access?.banned) return NextResponse.next();
    if (access?.maintenance && !access?.isAdmin) return NextResponse.next();
    return NextResponse.redirect(new URL("/home", nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|webp|svg|gif|ico)$).*)",
  ],
};
