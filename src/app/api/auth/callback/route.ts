import { NextResponse, type NextRequest } from "next/server";
import {
  clearOAuthStateCookie,
  exchangeCodeForSession,
  getOAuthStateFromRequest,
  oauthCallbackUrl,
  readOAuthState,
  setSessionCookie,
  timingSafeStringEqual,
} from "@/lib/google-auth";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const storedState = getOAuthStateFromRequest(request);

  if (!code || !state || !storedState || !timingSafeStringEqual(state, storedState)) {
    return NextResponse.json({ error: "Invalid OAuth callback state" }, { status: 400 });
  }

  const parsedState = readOAuthState(state);
  if (!parsedState) {
    return NextResponse.json({ error: "Invalid OAuth state payload" }, { status: 400 });
  }

  const session = await exchangeCodeForSession(code, oauthCallbackUrl(request));
  const response = NextResponse.redirect(new URL(parsedState.returnTo, request.url));
  setSessionCookie(response, session);
  clearOAuthStateCookie(response);
  return response;
}
