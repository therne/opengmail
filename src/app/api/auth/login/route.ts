import { NextResponse, type NextRequest } from "next/server";
import {
  buildGoogleAuthUrl,
  createOAuthState,
  oauthCallbackUrl,
  setOAuthStateCookie,
} from "@/lib/google-auth";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const state = createOAuthState(request.nextUrl.searchParams.get("returnTo"));
  const response = NextResponse.redirect(buildGoogleAuthUrl(state, oauthCallbackUrl(request)));
  setOAuthStateCookie(response, state);
  return response;
}
