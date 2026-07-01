import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - manifest.json (PWA manifest must be public)
     * - sw.js (service worker must be public)
     * - favicon.ico (favicon file)
     * - Any image/extension files
     */
    "/((?!_next/static|_next/image|manifest.json|sw.js|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
