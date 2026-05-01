import { google, gmail_v1 } from "googleapis";
import type { AuthSession, GmailAuthClient } from "./google-auth";
import { createAuthenticatedOAuthClient, createDelegatedServiceAccountClient } from "./google-auth";
import { getFakeMailDetail, getFakeMailSummaries } from "./fake-mails";
import { applyContactProfiles, contactProfilesByEmail, enrichMessageContactProfiles } from "./people";

export type MailSource = "gmail" | "fake";

export type MailAddress = {
  name?: string;
  email: string;
  avatar?: string;
};

export type MailMessageSummary = {
  id: string;
  threadId: string;
  source: MailSource;
  from: MailAddress;
  title: string;
  snippet: string;
  date: string;
  unread: boolean;
  labels: string[];
};

export type MailMessageDetail = MailMessageSummary & {
  to: MailAddress[];
  cc?: MailAddress[];
  bodyHtml: string;
  bodyText?: string;
  thread: MailMessageSummary[];
};

export type MailListResult = {
  messages: MailMessageSummary[];
  nextPageToken?: string;
  resultSizeEstimate: number;
  sourceCounts: {
    gmail: number;
    fake: number;
  };
};

export type MailListOptions = {
  maxResults?: number;
  pageToken?: string;
  query?: string;
};

const DEFAULT_MAX_RESULTS = 20;
const MAX_RESULTS_LIMIT = 50;

function maxResults(value?: number) {
  if (!value || Number.isNaN(value)) {
    return DEFAULT_MAX_RESULTS;
  }
  return Math.min(Math.max(Math.floor(value), 1), MAX_RESULTS_LIMIT);
}

function header(message: gmail_v1.Schema$Message, name: string) {
  return message.payload?.headers?.find((item) => item.name?.toLowerCase() === name.toLowerCase())?.value ?? "";
}

function decodeBase64Url(data?: string | null) {
  if (!data) {
    return "";
  }
  return Buffer.from(data.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function textFromHtml(html: string) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseAddress(value: string): MailAddress {
  const match = value.match(/^(?:"?([^"]*)"?\s)?<?([^<>\s]+@[^<>\s]+)>?$/);
  if (!match) {
    return { email: value.trim() };
  }
  return {
    name: match[1]?.trim() || undefined,
    email: match[2].trim(),
  };
}

function parseAddressList(value: string) {
  if (!value) {
    return [];
  }
  return value.split(",").map(parseAddress);
}

function findPart(
  part: gmail_v1.Schema$MessagePart | undefined,
  mimeType: "text/html" | "text/plain",
): gmail_v1.Schema$MessagePart | undefined {
  if (!part) {
    return undefined;
  }
  if (part.mimeType === mimeType && part.body?.data) {
    return part;
  }
  for (const child of part.parts ?? []) {
    const found = findPart(child, mimeType);
    if (found) {
      return found;
    }
  }
  return undefined;
}

function bodyContent(message: gmail_v1.Schema$Message) {
  const html = decodeBase64Url(findPart(message.payload, "text/html")?.body?.data);
  if (html) {
    return { bodyHtml: html, bodyText: textFromHtml(html) };
  }

  const plain = decodeBase64Url(findPart(message.payload, "text/plain")?.body?.data ?? message.payload?.body?.data);
  return {
    bodyHtml: plain ? `<pre>${escapeHtml(plain)}</pre>` : "",
    bodyText: plain,
  };
}

function gmailSummary(message: gmail_v1.Schema$Message): MailMessageSummary {
  const subject = header(message, "subject") || "(No subject)";
  const dateHeader = header(message, "date");
  const date = dateHeader ? new Date(dateHeader).toISOString() : new Date(Number(message.internalDate ?? Date.now())).toISOString();
  const labels = message.labelIds ?? [];

  return {
    id: message.id ?? "",
    threadId: message.threadId ?? message.id ?? "",
    source: "gmail",
    from: parseAddress(header(message, "from")),
    title: subject,
    snippet: message.snippet ?? "",
    date,
    unread: labels.includes("UNREAD"),
    labels,
  };
}

function gmailDetail(message: gmail_v1.Schema$Message, thread: MailMessageSummary[]): MailMessageDetail {
  return {
    ...gmailSummary(message),
    to: parseAddressList(header(message, "to")),
    cc: parseAddressList(header(message, "cc")),
    ...bodyContent(message),
    thread,
  };
}

function sortByDate<T extends { date: string }>(messages: T[]) {
  return messages.sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime());
}

function authClient(session: AuthSession | null): GmailAuthClient | null {
  return session ? createAuthenticatedOAuthClient(session) : createDelegatedServiceAccountClient();
}

function gmailClient(auth: GmailAuthClient) {
  return google.gmail({ version: "v1", auth });
}

async function getGmailMessage(gmail: gmail_v1.Gmail, id: string) {
  const { data } = await gmail.users.messages.get({
    userId: "me",
    id,
    format: "full",
  });
  return data;
}

async function getGmailMessageSummary(gmail: gmail_v1.Gmail, id: string) {
  const { data } = await gmail.users.messages.get({
    userId: "me",
    id,
    format: "metadata",
    metadataHeaders: ["From", "Subject", "Date"],
  });
  return data;
}

export async function listMail(session: AuthSession | null, options: MailListOptions = {}): Promise<MailListResult> {
  const limit = maxResults(options.maxResults);
  const fakeMessages = options.pageToken ? [] : getFakeMailSummaries(options.query);
  let gmailMessages: MailMessageSummary[] = [];
  let nextPageToken: string | undefined;
  let resultSizeEstimate = fakeMessages.length;

  const auth = authClient(session);

  if (auth) {
    try {
      const gmail = gmailClient(auth);
      const { data } = await gmail.users.messages.list({
        userId: "me",
        maxResults: limit,
        pageToken: options.pageToken,
        q: options.query,
        includeSpamTrash: false,
      });

      const ids = data.messages?.map((message) => message.id).filter((id): id is string => Boolean(id)) ?? [];
      gmailMessages = await Promise.all(ids.map(async (id) => gmailSummary(await getGmailMessageSummary(gmail, id))));
      nextPageToken = data.nextPageToken ?? undefined;
      resultSizeEstimate += data.resultSizeEstimate ?? gmailMessages.length;
    } catch (error) {
      console.error("Unable to read Gmail messages.", error);
    }
  }

  const messages = await enrichMessageContactProfiles(
    auth,
    sortByDate([...fakeMessages, ...gmailMessages]).slice(0, limit),
    { ownerEmail: session?.user.email },
  );

  return {
    messages,
    nextPageToken,
    resultSizeEstimate,
    sourceCounts: {
      gmail: gmailMessages.length,
      fake: fakeMessages.length,
    },
  };
}

export async function getMailDetail(session: AuthSession | null, id: string): Promise<MailMessageDetail | null> {
  const fake = getFakeMailDetail(id);
  if (fake) {
    return fake;
  }

  const auth = authClient(session);
  if (!auth) {
    return null;
  }

  const gmail = gmailClient(auth);
  const message = await getGmailMessage(gmail, id);
  const threadId = message.threadId;
  let thread: MailMessageSummary[] = [];

  if (threadId) {
    const { data } = await gmail.users.threads.get({
      userId: "me",
      id: threadId,
      format: "metadata",
      metadataHeaders: ["From", "Subject", "Date"],
    });
    thread = sortByDate((data.messages ?? []).map(gmailSummary));
  }

  const detail = gmailDetail(message, thread);
  const profiles = await contactProfilesByEmail(auth, [
    detail.from.email,
    ...detail.to.map((address) => address.email),
    ...(detail.cc ?? []).map((address) => address.email),
  ], { ownerEmail: session?.user.email });
  const [withFrom] = applyContactProfiles([detail], profiles);

  return {
    ...withFrom,
    to: detail.to.map((address) => {
      const profile = profiles.get(address.email.toLowerCase());
      return {
        ...address,
        name: !address.name ? profile?.name : address.name,
        avatar: profile?.avatar ?? address.avatar,
      };
    }),
    cc: detail.cc?.map((address) => {
      const profile = profiles.get(address.email.toLowerCase());
      return {
        ...address,
        name: !address.name ? profile?.name : address.name,
        avatar: profile?.avatar ?? address.avatar,
      };
    }),
  };
}
