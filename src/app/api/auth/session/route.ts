import { NextResponse, type NextRequest } from "next/server";
import {
  getFreshSession,
  getSessionFromRequest,
  googleCredentialMode,
  setSessionCookie,
} from "@/lib/google-auth";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({
      authenticated: false,
      authMode: googleCredentialMode(),
      user: null,
    });
  }

  const freshSession = await getFreshSession(session);
  const response = NextResponse.json({
    authenticated: true,
    authMode: googleCredentialMode(),
    user: freshSession.user,
  });

  if (freshSession.accessToken !== session.accessToken || freshSession.expiryDate !== session.expiryDate) {
    setSessionCookie(response, freshSession);
  }

  return response;
}
