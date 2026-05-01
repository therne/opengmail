import { google, people_v1 } from "googleapis";
import type { GmailAuthClient } from "./google-auth";
import type { MailAddress, MailMessageSummary } from "./mail";

const PEOPLE_FIELDS = "emailAddresses,names,photos";
const OTHER_CONTACT_FIELDS = "emailAddresses,names,photos";
const OTHER_CONTACT_SEARCH_FIELDS = "emailAddresses,names";
const PEOPLE_PAGE_SIZE = 1000;
const DIRECTORY_PAGE_SIZE = 10;
const PROFILE_CACHE_TTL_MS = 5 * 60 * 1000;
const SHORTWAVE_AVATAR_BASE_URL = "https://shortwaveimages.com/avatar/";

// Contact profile policy:
// Google People API is authoritative for names and user/contact photos.
// Shortwave is a public avatar fallback and only fills missing images.
export type ContactProfile = {
  email: string;
  name?: string;
  avatar?: string;
};

type ProfileCacheEntry = {
  expiresAt: number;
  profile: ContactProfile;
};

const profileCache = new Map<string, ProfileCacheEntry>();

function normalizeEmail(email?: string) {
  return email?.trim().toLowerCase();
}

function emailDomain(email?: string) {
  return normalizeEmail(email)?.split("@")[1];
}

function displayName(person: people_v1.Schema$Person) {
  return (
    person.names?.find((name) => name.displayName)?.displayName ??
    person.names?.find((name) => name.unstructuredName)?.unstructuredName ??
    undefined
  );
}

function photoUrl(person: people_v1.Schema$Person) {
  return (
    person.photos?.find((photo) => photo.url && !photo.default)?.url ??
    person.photos?.find((photo) => photo.url)?.url ??
    undefined
  );
}

function mergeProfile(
  current: ContactProfile | undefined,
  next: ContactProfile,
): ContactProfile {
  return {
    email: current?.email ?? next.email,
    name: current?.name ?? next.name,
    avatar: current?.avatar ?? next.avatar,
  };
}

async function shortwaveAvatarUrl(email: string) {
  const url = `${SHORTWAVE_AVATAR_BASE_URL}${email}`;
  try {
    const response = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
    });
    const contentType = response.headers.get("content-type") ?? "";
    if (!response.ok || !contentType.startsWith("image/")) {
      return undefined;
    }
    return url;
  } catch {
    return undefined;
  }
}

async function collectShortwaveAvatars(
  wantedEmails: Set<string>,
  profiles: Map<string, ContactProfile>,
) {
  await Promise.all(
    [...wantedEmails]
      .filter((email) => !profiles.get(email)?.avatar)
      .map(async (email) => {
        const avatar = await shortwaveAvatarUrl(email);
        if (!avatar) {
          return;
        }
        profiles.set(email, mergeProfile(profiles.get(email), { email, avatar }));
      }),
  );
}

function collectProfile(
  person: people_v1.Schema$Person,
  wantedEmails: Set<string>,
  profiles: Map<string, ContactProfile>,
) {
  const name = displayName(person);
  const avatar = photoUrl(person);

  for (const address of person.emailAddresses ?? []) {
    const email = normalizeEmail(address.value ?? undefined);
    if (!email || !wantedEmails.has(email)) {
      continue;
    }
    profiles.set(email, mergeProfile(profiles.get(email), { email, name, avatar }));
  }
}

async function collectConnections(
  people: people_v1.People,
  wantedEmails: Set<string>,
  profiles: Map<string, ContactProfile>,
) {
  let pageToken: string | undefined;
  do {
    const { data } = await people.people.connections.list({
      resourceName: "people/me",
      pageSize: PEOPLE_PAGE_SIZE,
      pageToken,
      personFields: PEOPLE_FIELDS,
      sources: ["READ_SOURCE_TYPE_CONTACT", "READ_SOURCE_TYPE_PROFILE"],
    });

    for (const person of data.connections ?? []) {
      collectProfile(person, wantedEmails, profiles);
    }

    pageToken = data.nextPageToken ?? undefined;
  } while (pageToken && profiles.size < wantedEmails.size);
}

async function collectOtherContacts(
  people: people_v1.People,
  wantedEmails: Set<string>,
  profiles: Map<string, ContactProfile>,
) {
  let pageToken: string | undefined;
  do {
    const { data } = await people.otherContacts.list({
      pageSize: PEOPLE_PAGE_SIZE,
      pageToken,
      readMask: OTHER_CONTACT_FIELDS,
      sources: ["READ_SOURCE_TYPE_CONTACT", "READ_SOURCE_TYPE_PROFILE"],
    });

    for (const person of data.otherContacts ?? []) {
      collectProfile(person, wantedEmails, profiles);
    }

    pageToken = data.nextPageToken ?? undefined;
  } while (pageToken && profiles.size < wantedEmails.size);
}

async function collectSearchedContacts(
  people: people_v1.People,
  wantedEmails: Set<string>,
  profiles: Map<string, ContactProfile>,
) {
  await Promise.all(
    [...wantedEmails]
      .filter((email) => !profiles.get(email)?.name)
      .map(async (email) => {
        const [contactsResult, otherContactsResult] = await Promise.allSettled([
          people.people.searchContacts({
            query: email,
            pageSize: 10,
            readMask: PEOPLE_FIELDS,
            sources: ["READ_SOURCE_TYPE_CONTACT", "READ_SOURCE_TYPE_PROFILE"],
          }),
          people.otherContacts.search({
            query: email,
            pageSize: 10,
            readMask: OTHER_CONTACT_SEARCH_FIELDS,
          }),
        ]);

        if (contactsResult.status === "fulfilled") {
          for (const result of contactsResult.value.data.results ?? []) {
            if (result.person) {
              collectProfile(result.person, wantedEmails, profiles);
            }
          }
        }

        if (otherContactsResult.status === "fulfilled") {
          for (const result of otherContactsResult.value.data.results ?? []) {
            if (result.person) {
              collectProfile(result.person, wantedEmails, profiles);
            }
          }
        }
      }),
  );
}

async function collectDirectoryProfiles(
  people: people_v1.People,
  wantedEmails: Set<string>,
  profiles: Map<string, ContactProfile>,
  directoryDomain?: string,
) {
  if (!directoryDomain) {
    return;
  }

  await Promise.all(
    [...wantedEmails]
      .filter(
        (email) =>
          emailDomain(email) === directoryDomain &&
          (!profiles.get(email)?.avatar || !profiles.get(email)?.name),
      )
      .map(async (email) => {
        const { data } = await people.people.searchDirectoryPeople({
          query: email,
          pageSize: DIRECTORY_PAGE_SIZE,
          readMask: PEOPLE_FIELDS,
          sources: ["DIRECTORY_SOURCE_TYPE_DOMAIN_PROFILE"],
        });

        for (const person of data.people ?? []) {
          collectProfile(person, wantedEmails, profiles);
        }
      }),
  );
}

function logPeopleApiError(label: string, reason: PromiseSettledResult<unknown>) {
  if (reason.status === "fulfilled" || process.env.NODE_ENV !== "development") {
    return;
  }
  console.warn(`[people-api] ${label} contact lookup failed`, reason.reason);
}

export async function contactProfilesByEmail(
  auth: GmailAuthClient,
  emails: string[],
  options: { ownerEmail?: string } = {},
) {
  const wantedEmails = new Set(
    emails.map(normalizeEmail).filter((email): email is string => Boolean(email)),
  );
  const profiles = new Map<string, ContactProfile>();
  if (wantedEmails.size === 0) {
    return profiles;
  }

  const now = Date.now();
  for (const email of [...wantedEmails]) {
    const cached = profileCache.get(email);
    if (cached && cached.expiresAt > now) {
      profiles.set(email, cached.profile);
      wantedEmails.delete(email);
    }
  }

  if (wantedEmails.size === 0) {
    return profiles;
  }

  const people = google.people({ version: "v1", auth });

  const [connectionsResult, otherContactsResult] = await Promise.allSettled([
    collectConnections(people, wantedEmails, profiles),
    collectOtherContacts(people, wantedEmails, profiles),
  ]);
  logPeopleApiError("connections", connectionsResult);
  logPeopleApiError("otherContacts", otherContactsResult);

  const [searchResult, directoryResult] = await Promise.allSettled([
    collectSearchedContacts(people, wantedEmails, profiles),
    collectDirectoryProfiles(people, wantedEmails, profiles, emailDomain(options.ownerEmail)),
  ]);
  logPeopleApiError("search", searchResult);
  logPeopleApiError("directory", directoryResult);

  const [shortwaveResult] = await Promise.allSettled([
    collectShortwaveAvatars(wantedEmails, profiles),
  ]);
  logPeopleApiError("shortwave", shortwaveResult);

  const expiresAt = Date.now() + PROFILE_CACHE_TTL_MS;
  for (const [email, profile] of profiles) {
    profileCache.set(email, {
      expiresAt,
      profile,
    });
  }
  for (const email of wantedEmails) {
    if (!profiles.has(email)) {
      profileCache.set(email, {
        expiresAt,
        profile: { email },
      });
    }
  }

  return profiles;
}

function shouldReplaceName(address: MailAddress) {
  const normalizedName = address.name?.trim().toLowerCase();
  const normalizedEmail = normalizeEmail(address.email);
  return !normalizedName || normalizedName === normalizedEmail;
}

export function applyContactProfiles<T extends { from: MailAddress }>(
  messages: T[],
  profiles: Map<string, ContactProfile>,
) {
  return messages.map((message) => {
    const email = normalizeEmail(message.from.email);
    const profile = email ? profiles.get(email) : undefined;
    if (!profile) {
      return message;
    }
    return {
      ...message,
      from: {
        ...message.from,
        name: shouldReplaceName(message.from) ? profile.name ?? message.from.name : message.from.name,
        avatar: profile.avatar ?? message.from.avatar,
      },
    };
  });
}

export async function enrichMessageContactProfiles<T extends MailMessageSummary>(
  auth: GmailAuthClient | null,
  messages: T[],
  options: { ownerEmail?: string } = {},
) {
  if (!auth || messages.length === 0) {
    return messages;
  }

  const profiles = await contactProfilesByEmail(
    auth,
    messages.map((message) => message.from.email),
    options,
  );
  return applyContactProfiles(messages, profiles);
}
