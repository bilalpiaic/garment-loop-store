import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ADMIN_COOKIE, CUSTOMER_COOKIE } from "@/lib/identity";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    if (!request.cookies.get(ADMIN_COOKIE)) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  if (pathname.startsWith("/account") && pathname !== "/account/login") {
    if (!request.cookies.get(CUSTOMER_COOKIE)) {
      const url = request.nextUrl.clone();
      url.pathname = "/account/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin", "/admin/:path*", "/account", "/account/:path*"],
};
