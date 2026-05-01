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
  try {
    const rawSession = getSessionFromRequest(request);
    const session = rawSession ? await getFreshSession(rawSession) : null;
    const result = await listMail(session, {
      maxResults: Number(request.nextUrl.searchParams.get("limit") ?? undefined),
      pageToken: request.nextUrl.searchParams.get("pageToken") ?? undefined,
      query: request.nextUrl.searchParams.get("q") ?? undefined,
    });

    const response = NextResponse.json({
      authenticated: Boolean(session),
      authMode: googleCredentialMode(),
      ...result,
    });

    if (rawSession && session && session.accessToken !== rawSession.accessToken) {
      setSessionCookie(response, session);
    }

    return response;
  } catch (error) {
    console.error("Unable to load mail.", error);
    return NextResponse.json(
      {
        authenticated: false,
        authMode: googleCredentialMode(),
        error: "Unable to load mail.",
        messages: [],
      },
      { status: 500 },
    );
  }
}
