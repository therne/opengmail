import { NextResponse, type NextRequest } from "next/server";
import {
  getFreshSession,
  getSessionFromRequest,
  googleCredentialMode,
  setSessionCookie,
} from "@/lib/google-auth";
import { listMail } from "@/lib/mail";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q") ?? "";
  const rawSession = getSessionFromRequest(request);
  const session = rawSession ? await getFreshSession(rawSession) : null;
  const result = await listMail(session, {
    maxResults: Number(request.nextUrl.searchParams.get("limit") ?? undefined),
    pageToken: request.nextUrl.searchParams.get("pageToken") ?? undefined,
    query,
  });

  const response = NextResponse.json({
    authenticated: Boolean(session),
    authMode: googleCredentialMode(),
    query,
    ...result,
  });

  if (rawSession && session && session.accessToken !== rawSession.accessToken) {
    setSessionCookie(response, session);
  }

  return response;
}
