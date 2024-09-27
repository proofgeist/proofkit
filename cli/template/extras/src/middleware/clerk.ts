import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// these default settings will require authentication for all routes except the ones in the array
// to restrict public access to the home page, remove "/" from the array
const isPublicRoute = createRouteMatcher(["/auth/(.*)", "/"]);

export default clerkMiddleware((auth, request) => {
  if (!isPublicRoute(request)) {
    auth().protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
