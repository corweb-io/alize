import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { ACTIVE_BUSINESS_COOKIE, isUuid } from "@/lib/business-path";

// Pre-multi-tenant URLs, now scoped under /b/[businessId].
const LEGACY_BUSINESS_PATHS = [
  "/dashboard",
  "/invoices",
  "/quotes",
  "/clients",
  "/cotisations",
  "/settings",
  "/templates",
];

function matchesPath(pathname: string, path: string) {
  return pathname === path || pathname.startsWith(`${path}/`);
}

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: DO NOT REMOVE auth.getUser()
  // Do not run code between createServerClient and supabase.auth.getUser()
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Protected routes under (app) route group
  const protectedPaths = [
    ...LEGACY_BUSINESS_PATHS,
    "/b",
    "/account",
    "/onboarding",
  ];

  const isProtectedPath = protectedPaths.some((path) =>
    matchesPath(pathname, path)
  );

  // Stripe webhooks authenticate via signature, not user session.
  if (request.nextUrl.pathname.startsWith("/api/stripe/webhook")) {
    return supabaseResponse;
  }

  // Protect routes - require authentication
  if (isProtectedPath && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Redirect unauthenticated users away from protected routes
  if (
    !user &&
    !request.nextUrl.pathname.startsWith("/login") &&
    !request.nextUrl.pathname.startsWith("/auth") &&
    !request.nextUrl.pathname.startsWith("/callback") &&
    request.nextUrl.pathname !== "/"
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user) {
    if (matchesPath(pathname, "/settings/billing")) {
      const url = request.nextUrl.clone();
      url.pathname = pathname.replace("/settings/billing", "/account/billing");
      return redirectWithCookies(url, supabaseResponse);
    }

    if (LEGACY_BUSINESS_PATHS.some((path) => matchesPath(pathname, path))) {
      const url = request.nextUrl.clone();
      url.pathname = "/b";
      url.search = "";
      url.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
      return redirectWithCookies(url, supabaseResponse);
    }

    // Remember the business being viewed so business-less URLs resolve to it.
    const businessId = pathname.match(/^\/b\/([^/]+)/)?.[1];
    if (
      isUuid(businessId) &&
      request.cookies.get(ACTIVE_BUSINESS_COOKIE)?.value !== businessId
    ) {
      supabaseResponse.cookies.set(ACTIVE_BUSINESS_COOKIE, businessId, {
        path: "/",
        sameSite: "lax",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24 * 365,
      });
    }
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is.
  return supabaseResponse;
}

// Redirects must carry over any refreshed auth cookies.
function redirectWithCookies(url: URL, supabaseResponse: NextResponse) {
  const response = NextResponse.redirect(url);
  supabaseResponse.cookies
    .getAll()
    .forEach((cookie) => response.cookies.set(cookie));
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
