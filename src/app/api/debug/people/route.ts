import { NextResponse, type NextRequest } from "next/server";
import { google, people_v1 } from "googleapis";
import {
  createAuthenticatedOAuthClient,
  getFreshSession,
  getSessionFromRequest,
  setSessionCookie,
} from "@/lib/google-auth";
import { contactProfilesByEmail } from "@/lib/people";

export const runtime = "nodejs";

const DEFAULT_EMAILS = ["yousafswim@gmail.com", "notifications@stripe.com"];

function personSummary(person?: people_v1.Schema$Person) {
  if (!person) {
    return null;
  }
  return {
    resourceName: person.resourceName,
    emailAddresses: person.emailAddresses?.map((email) => email.value),
    names: person.names?.map((name) => ({
      displayName: name.displayName,
      unstructuredName: name.unstructuredName,
    })),
    photos: person.photos?.map((photo) => ({
      default: photo.default,
      url: photo.url,
    })),
  };
}

export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const rawSession = getSessionFromRequest(request);
  if (!rawSession) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const session = await getFreshSession(rawSession);
  const auth = createAuthenticatedOAuthClient(session);
  const emails = request.nextUrl.searchParams.getAll("email");
  const targets = emails.length > 0 ? emails : DEFAULT_EMAILS;
  const profiles = await contactProfilesByEmail(
    auth,
    targets,
    { ownerEmail: session.user.email },
  );
  const people = google.people({ version: "v1", auth });

  const raw = await Promise.all(targets.map(async (email) => {
    const [contactsSearch, otherContactsSearch, otherContactsList] = await Promise.allSettled([
      people.people.searchContacts({
        query: email,
        pageSize: 10,
        readMask: "emailAddresses,names,photos",
        sources: ["READ_SOURCE_TYPE_CONTACT", "READ_SOURCE_TYPE_PROFILE"],
      }),
      people.otherContacts.search({
        query: email,
        pageSize: 10,
        readMask: "emailAddresses,names",
      }),
      people.otherContacts.list({
        pageSize: 1000,
        readMask: "emailAddresses,names,photos",
        sources: ["READ_SOURCE_TYPE_CONTACT", "READ_SOURCE_TYPE_PROFILE"],
      }),
    ]);

    const listMatches =
      otherContactsList.status === "fulfilled"
        ? (otherContactsList.value.data.otherContacts ?? []).filter((person) =>
            person.emailAddresses?.some(
              (address) => address.value?.toLowerCase() === email.toLowerCase(),
            ),
          )
        : [];

    return {
      email,
      contactsSearch:
        contactsSearch.status === "fulfilled"
          ? contactsSearch.value.data.results?.map((result) => personSummary(result.person)) ?? []
          : { error: String(contactsSearch.reason) },
      otherContactsSearch:
        otherContactsSearch.status === "fulfilled"
          ? otherContactsSearch.value.data.results?.map((result) => personSummary(result.person)) ?? []
          : { error: String(otherContactsSearch.reason) },
      otherContactsListExact: listMatches.map(personSummary),
    };
  }));

  const response = NextResponse.json({
    ownerEmail: session.user.email,
    targets: targets.map((email) => ({
      email,
      profile: profiles.get(email.toLowerCase()) ?? null,
    })),
    raw,
  });

  if (session.accessToken !== rawSession.accessToken || session.expiryDate !== rawSession.expiryDate) {
    setSessionCookie(response, session);
  }

  return response;
}
