import { auth } from "@/auth";
import { NextResponse } from "next/server";

const protectedRoutes = [
  /^\/admin(\/.*)?$/, // Protect /admin and its subroutes
  /^\/home$/,
  /^\/profile(\/.*)?$/,
  /^\/my-orders$/,
  /^\/sell$/,
  /^\/buy-sell(\/.*)?$/, // Protect all buy-sell subroutes
];

const authPageRoutes = ["/"];
const apiAuthPrefix = "/api/auth";

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;

  const path = nextUrl.pathname;
  const isApiAuthRoute = path.startsWith(apiAuthPrefix);
  const isProtectedRoute = protectedRoutes.some((route) =>
    route instanceof RegExp ? route.test(path) : route === path
  );
  const isAuthPageRoute = authPageRoutes.includes(path);

  if (isApiAuthRoute) return NextResponse.next();

  if (isProtectedRoute && !isLoggedIn) {
    return NextResponse.redirect(new URL("/", nextUrl));
  }

  if (isLoggedIn && isAuthPageRoute) {
    return NextResponse.redirect(new URL("/home", nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
