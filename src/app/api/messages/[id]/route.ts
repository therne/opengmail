import { NextResponse, type NextRequest } from "next/server";
import {
  getFreshSession,
  getSessionFromRequest,
  googleCredentialMode,
  setSessionCookie,
} from "@/lib/google-auth";
import { getMailDetail } from "@/lib/mail";

export const runtime = "nodejs";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const rawSession = getSessionFromRequest(request);
    const session = rawSession ? await getFreshSession(rawSession) : null;
    const message = await getMailDetail(session, decodeURIComponent(id));

    if (!message) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    const response = NextResponse.json({
      authenticated: Boolean(session),
      authMode: googleCredentialMode(),
      message,
    });

    if (rawSession && session && session.accessToken !== rawSession.accessToken) {
      setSessionCookie(response, session);
    }

    return response;
  } catch (error) {
    console.error("Unable to load message detail.", error);
    return NextResponse.json({ error: "Unable to load message detail." }, { status: 500 });
  }
}
