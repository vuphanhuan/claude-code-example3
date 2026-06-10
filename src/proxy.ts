import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { auth } from "./auth"

export async function proxy(request: NextRequest) {
  // Get NextAuth session
  const session = await auth()

  const isApiRoute = request.nextUrl.pathname.startsWith("/api/")

  // Allow API routes to be accessed without authentication (you can customize this as needed)
  if (isApiRoute) {
    return NextResponse.next()
  }

  const isLoggedIn = !!session?.user
  const isAuthPage =
    request.nextUrl.pathname.startsWith("/sign-in") ||
    request.nextUrl.pathname.startsWith("/sign-up") ||
    request.nextUrl.pathname.startsWith("/forgot-password")

  if (isAuthPage) {
    if (isLoggedIn) {
      return NextResponse.redirect(new URL("/dashboard", request.url))
    }
    return NextResponse.next()
  }

  // For all other pages (including / and dashboard pages), require login
  if (!isLoggedIn) {
    return NextResponse.redirect(new URL("/sign-in", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)", "/"],
}
