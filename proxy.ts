import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/session";

/**
 * Simple auth gate for the whole app: unauthenticated visitors are sent to
 * /login. The login page itself is public; everything else requires a valid
 * session cookie (see lib/session.ts). Runs on the Node.js runtime, which is
 * the default for Proxy in Next 16.
 */
export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublic =
    pathname === "/login" || pathname.startsWith("/login/");

  const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const authenticated = verifySessionToken(sessionToken);

  // Not signed in → show the login page.
  if (!isPublic && !authenticated) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Already signed in and hitting the login page → go to the dashboard.
  if (pathname === "/login" && authenticated) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Protect all app pages but skip backend rewrites, Next.js internals and
  // static assets in /public (svg, png, ico, fonts, ...).
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|mjs|json|txt|map|woff2?|ttf|eot)$).*)",
  ],
};
