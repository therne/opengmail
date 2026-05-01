"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import "@material/web/button/filled-button.js";
import "@material/web/button/filled-tonal-button.js";
import "@material/web/button/outlined-button.js";
import "@material/web/iconbutton/icon-button.js";
import "@material/web/progress/circular-progress.js";
import { MailAvatar, type AvatarIdentity } from "./mail-avatar";
import { isVerifiedSender } from "@/lib/verified-senders";

type SessionPayload = {
  authenticated: boolean;
  user?: {
    name?: string;
    email?: string;
    image?: string;
    picture?: string;
  };
};

type MailMessage = {
  id: string;
  threadId: string;
  source: "gmail" | "fake";
  senderName: string;
  senderEmail: string;
  avatarUrl?: string;
  subject: string;
  snippet: string;
  bodyHtml?: string;
  date: string;
  unread?: boolean;
  labels?: string[];
  attachments?: Array<{ name: string; mimeType?: string }>;
};

type MailListPayload = {
  messages?: MailMessage[];
  items?: MailMessage[];
  nextPageToken?: string;
  authenticated?: boolean;
};

type ThreadPayload = {
  message?: MailMessage;
  thread?: MailMessage[];
  messages?: MailMessage[];
};

type RawMailMessage = Partial<MailMessage> & {
  from?: {
    name?: string;
    email: string;
    avatar?: string;
  };
  title?: string;
  bodyText?: string;
  thread?: RawMailMessage[];
};

type ApiErrorPayload = {
  error?: string;
  message?: string;
};

type CachedContactProfile = {
  avatarUrl?: string;
  name?: string;
};

const CONTACT_CACHE_KEY = "gmail_clone_contact_profiles_v1";
const CONTACT_CACHE_LIMIT = 500;
const SEARCH_HISTORY_KEY = "gmail_clone_search_history_v1";
const SEARCH_HISTORY_LIMIT = 10;

const drawerItems = [
  { icon: "inbox", label: "All inboxes", count: "99+", selected: true },
  { icon: "inbox", label: "Inbox", count: "99+" },
  { divider: true },
  { icon: "star_border", label: "Starred" },
  { icon: "schedule", label: "Snoozed" },
  { icon: "label_important", label: "Important", count: "99+" },
  { icon: "send", label: "Sent" },
  { icon: "schedule_send", label: "Scheduled" },
  { icon: "outbox", label: "Outbox" },
  { icon: "insert_drive_file", label: "Drafts", count: "99+" },
  { icon: "all_inbox", label: "All mail" },
  { icon: "report", label: "Spam" },
  { icon: "delete", label: "Trash" },
];

const materialIconPaths: Record<string, string[]> = {
  all_inbox: [
    "M19 3H5c-1.1 0-2 .9-2 2v7c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM5 10h3.13c.21.78.67 1.47 1.27 2H5v-2zm14 2h-4.4c.6-.53 1.06-1.22 1.27-2H19v2zm0-4h-5v1c0 1.07-.93 2-2 2s-2-.93-2-2V8H5V5h14v3zm-2 7h-3v1c0 .47-.19.9-.48 1.25-.37.45-.92.75-1.52.75s-1.15-.3-1.52-.75c-.29-.35-.48-.78-.48-1.25v-1H3v4c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-4h-4zM5 17h3.13c.02.09.06.17.09.25.24.68.65 1.28 1.18 1.75H5v-2zm14 2h-4.4c.54-.47.95-1.07 1.18-1.75.03-.08.07-.16.09-.25H19v2z",
  ],
  archive: [
    "m20.54 5.23-1.39-1.68C18.88 3.21 18.47 3 18 3H6c-.47 0-.88.21-1.16.55L3.46 5.23C3.17 5.57 3 6.02 3 6.5V19c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6.5c0-.48-.17-.93-.46-1.27zM6.24 5h11.52l.81.97H5.44l.8-.97zM5 19V8h14v11H5zm8.45-9h-2.9v3H8l4 4 4-4h-2.55z",
  ],
  arrow_back_ios_new: ["M17.77 3.77 16 2 6 12l10 10 1.77-1.77L9.54 12z"],
  close: [
    "M18.3 5.71 12 12l6.3 6.29-1.41 1.41L10.59 13.41 4.29 19.71 2.88 18.3 9.17 12 2.88 5.71 4.29 4.29l6.3 6.3 6.29-6.3z",
  ],
  delete: [
    "M16 9v10H8V9h8m-1.5-6h-5l-1 1H5v2h14V4h-3.5l-1-1zM18 7H6v12c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7z",
  ],
  draft: [
    "M21.99 8c0-.72-.37-1.35-.94-1.7L12 1 2.95 6.3C2.38 6.65 2 7.28 2 8v10c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2l-.01-10zm-2 0v.01L12 13 4 8l8-4.68L19.99 8zM4 18v-7.66l8 5.02 7.99-4.99L20 18H4z",
  ],
  edit: [
    "m14.06 9.02.92.92L5.92 19H5v-.92l9.06-9.06M17.66 3c-.25 0-.51.1-.7.29l-1.83 1.83 3.75 3.75 1.83-1.83a.996.996 0 0 0 0-1.41l-2.34-2.34c-.2-.2-.45-.29-.71-.29zm-3.6 3.19L3 17.25V21h3.75L17.81 9.94l-3.75-3.75z",
  ],
  forward: [
    "M12 8V6.41c0-.89 1.08-1.34 1.71-.71l5.59 5.59c.39.39.39 1.02 0 1.41l-5.59 5.59c-.63.63-1.71.19-1.71-.7V16H5c-.55 0-1-.45-1-1V9c0-.55.45-1 1-1h7z",
  ],
  inbox: [
    "M19 3H5c-1.1 0-2 .9-2 2v14a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5v-3h3.56c.69 1.19 1.97 2 3.45 2s2.75-.81 3.45-2H19v3zm0-5h-4.99c0 1.1-.9 2-2 2s-2-.9-2-2H5V5h14v9z",
  ],
  keyboard_arrow_down: ["M7.41 8.59 12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"],
  label_important: ["M4 18.99h11c.67 0 1.27-.32 1.63-.83L21 12l-4.37-6.16C16.27 5.33 15.67 5 15 5H4l5 7-5 6.99z"],
  history: [
    "M13 3c-4.97 0-9 4.03-9 9H1l4 4 4-4H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.78-4.95-2.05l-1.42 1.42C8.26 20 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z",
  ],
  mail: [
    "M22 6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6zm-2 0-8 4.99L4 6h16zm0 12H4V8l8 5 8-5v10z",
  ],
  chat_bubble_outline: [
    "M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z",
  ],
  mark_email_unread: [
    "M22 8.98V18c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2l.01-12c0-1.1.89-2 1.99-2h10.1c-.06.32-.1.66-.1 1s.04.68.1 1H4l8 5 3.67-2.29c.47.43 1.02.76 1.63.98L12 13 4 8v10h16V9.9c.74-.15 1.42-.48 2-.92zM16 5c0 1.66 1.34 3 3 3s3-1.34 3-3-1.34-3-3-3-3 1.34-3 3z",
  ],
  menu: ["M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"],
  mic: [
    "M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z",
    "M17.3 11c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.49 6-3.31 6-6.72h-1.7z",
  ],
  mood: [
    "M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z",
  ],
  more_horiz: ["M6 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm12 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"],
  outbox: [
    "M11 9.83V14h2V9.83l1.59 1.58L16 10l-4-4-4 4 1.41 1.41z",
    "M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5v-3h3.02c.91 1.21 2.35 2 3.98 2s3.06-.79 3.98-2H19v3zm0-5h-4.18c-.41 1.16-1.51 2-2.82 2s-2.4-.84-2.82-2H5V5h14v9z",
  ],
  person: [
    "M12 6c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2m0 10c2.7 0 5.8 1.29 6 2H6c.23-.72 3.31-2 6-2m0-12C9.79 4 8 5.79 8 8s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0 10c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z",
  ],
  report: [
    "M15.73 3H8.27L3 8.27v7.46L8.27 21h7.46L21 15.73V8.27L15.73 3zM19 14.9 14.9 19H9.1L5 14.9V9.1L9.1 5h5.8L19 9.1v5.8z",
    "M11 7h2v7h-2z",
  ],
  reply: [
    "M10 9V7.41c0-.89-1.08-1.34-1.71-.71L3.7 11.29a.996.996 0 0 0 0 1.41l4.59 4.59c.63.63 1.71.19 1.71-.7V14.9c5 0 8.5 1.6 11 5.1-1-5-4-10-11-11z",
  ],
  reply_all: [
    "M7 7.56c0-.94-1.14-1.42-1.81-.75L.71 11.29a.996.996 0 0 0 0 1.41l4.48 4.48c.67.68 1.81.2 1.81-.74 0-.28-.11-.55-.31-.75L3 12l3.69-3.69c.2-.2.31-.47.31-.75zM13 9V7.41c0-.89-1.08-1.34-1.71-.71L6.7 11.29a.996.996 0 0 0 0 1.41l4.59 4.59c.63.63 1.71.18 1.71-.71V14.9c5 0 8.5 1.6 11 5.1-1-5-4-10-11-11z",
  ],
  schedule: [
    "M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z",
  ],
  send: ["m4.01 6.03 7.51 3.22-7.52-1 .01-2.22m7.5 8.72L4 17.97v-2.22l7.51-1M2.01 3 2 10l15 2-15 2 .01 7L23 12 2.01 3z"],
  schedule_send: [
    "M17 12c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zm1.65 7.35L16.5 17.2V14h1v2.79l1.85 1.85-.7.71z",
    "m11 12-6-1.5V7.01l8.87 3.74c.94-.47 2-.75 3.13-.75.1 0 .19.01.28.01L3 4v16l7-2.95V17c0-.8.14-1.56.39-2.28L5 16.99V13.5l6-1.5z",
  ],
  star: [
    "m22 9.24-7.19-.62L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.63-7.03L22 9.24zM12 15.4l-3.76 2.27 1-4.28-3.32-2.88 4.38-.38L12 6.1l1.71 4.04 4.38.38-3.32 2.88 1 4.28L12 15.4z",
  ],
  star_border: [
    "m22 9.24-7.19-.62L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.63-7.03L22 9.24zM12 15.4l-3.76 2.27 1-4.28-3.32-2.88 4.38-.38L12 6.1l1.71 4.04 4.38.38-3.32 2.88 1 4.28L12 15.4z",
  ],
  insert_drive_file: [
    "M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zM6 20V4h7v5h5v11H6z",
  ],
  videocam: ["M15 8v8H5V8h10m1-2H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4V7c0-.55-.45-1-1-1z"],
  verified: [
    "m23 12-2.44-2.78.34-3.68-3.61-.82L15.4.56 12 2 8.6.56 6.71 3.72l-3.61.82.34 3.68L1 12l2.44 2.78-.34 3.68 3.61.82 1.89 3.16L12 22l3.4 1.44 1.89-3.16 3.61-.82-.34-3.68L23 12zm-12.91 4.72-3.8-3.8 1.41-1.41 2.39 2.39 5.29-5.29 1.41 1.41-6.7 6.7z",
  ],
};

function classNames(...values: Array<string | false | undefined>) {
  return values.filter(Boolean).join(" ");
}

function syncAppViewport() {
  const viewport = window.visualViewport;
  const height = viewport?.height ?? window.innerHeight;

  document.documentElement.style.setProperty("--app-height", `${height}px`);
}

async function readApiJson<T>(response: Response, fallbackMessage: string) {
  const text = await response.text();
  let payload: unknown = null;

  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      if (!response.ok) {
        throw new Error(fallbackMessage);
      }
      throw new Error("Mail API returned invalid JSON.");
    }
  }

  if (!response.ok) {
    const errorPayload = payload as ApiErrorPayload | null;
    throw new Error(errorPayload?.error ?? errorPayload?.message ?? fallbackMessage);
  }

  if (!payload || typeof payload !== "object") {
    throw new Error(fallbackMessage);
  }

  return payload as T;
}

function icon(name: string, className?: string) {
  const size = Number(className?.match(/text-\[(\d+)px\]/)?.[1] ?? 28);
  const cleanedClassName = className?.replace(/text-\[\d+px\]/g, "");

  return (
    <svg
      aria-hidden
      className={classNames("shrink-0 fill-current", cleanedClassName)}
      height={size}
      viewBox="0 0 24 24"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
    >
      {(materialIconPaths[name] ?? materialIconPaths.mail).map((path) => (
        <path d={path} key={path} />
      ))}
      {name === "report" ? <circle cx="12" cy="16" r="1" /> : null}
    </svg>
  );
}

function stripHtml(value = "") {
  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function decodeHtmlEntities(value = "") {
  const namedEntities: Record<string, string> = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    nbsp: " ",
    quot: "\"",
  };

  return value.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (match, entity: string) => {
    const lower = entity.toLowerCase();
    if (lower.startsWith("#x")) {
      return String.fromCodePoint(Number.parseInt(lower.slice(2), 16));
    }
    if (lower.startsWith("#")) {
      return String.fromCodePoint(Number.parseInt(lower.slice(1), 10));
    }
    return namedEntities[lower] ?? match;
  });
}

function readSearchHistory() {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(SEARCH_HISTORY_KEY);
    if (!raw) {
      return [];
    }
    const value = JSON.parse(raw);
    return Array.isArray(value)
      ? value.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

function writeSearchHistory(items: string[]) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(
    SEARCH_HISTORY_KEY,
    JSON.stringify(items.slice(0, SEARCH_HISTORY_LIMIT)),
  );
}

function addSearchHistoryItem(query: string) {
  const trimmed = query.trim();
  if (!trimmed) {
    return readSearchHistory();
  }
  const normalized = trimmed.toLowerCase();
  const next = [
    trimmed,
    ...readSearchHistory().filter((item) => item.trim().toLowerCase() !== normalized),
  ].slice(0, SEARCH_HISTORY_LIMIT);
  writeSearchHistory(next);
  return next;
}

function highlightedText(value: string, query: string) {
  const needle = query.trim();
  if (!needle) {
    return value;
  }

  const lowerValue = value.toLowerCase();
  const lowerNeedle = needle.toLowerCase();
  const parts: ReactNode[] = [];
  let cursor = 0;
  let index = lowerValue.indexOf(lowerNeedle);

  while (index !== -1) {
    if (index > cursor) {
      parts.push(value.slice(cursor, index));
    }
    const match = value.slice(index, index + needle.length);
    parts.push(
      <mark
        className="rounded-[1px] bg-[#f6e783] px-0.5 text-[#202124]"
        key={`${index}-${match}`}
      >
        {match}
      </mark>,
    );
    cursor = index + needle.length;
    index = lowerValue.indexOf(lowerNeedle, cursor);
  }

  if (cursor < value.length) {
    parts.push(value.slice(cursor));
  }

  return parts;
}

function mailBodyHtml(message: MailMessage) {
  const source =
    message.bodyHtml ??
    message.snippet
      .split("\n")
      .map((line) => `<p>${line}</p>`)
      .join("");

  return source;
}

function iframeBodyHtml(html: string) {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="color-scheme" content="dark" />
    <style>
      * { box-sizing: border-box; }
      html, body {
        margin: 0;
        width: 100%;
        max-width: 100%;
        overflow-x: hidden;
        background: transparent;
        color: #e8eaed;
        color-scheme: dark;
        font: 400 16px/24px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        -webkit-font-smoothing: antialiased;
      }
      body { padding: 0; overflow-y: hidden; }
      body, body * {
        max-width: 100% !important;
        min-width: 0 !important;
      }
      table {
        max-width: 100% !important;
        table-layout: auto !important;
      }
      td, th {
        width: auto !important;
        max-width: 100% !important;
        overflow-wrap: anywhere;
        word-break: normal;
      }
      img, video {
        height: auto !important;
        max-width: 100% !important;
      }
      pre, code {
        white-space: pre-wrap !important;
        overflow-wrap: anywhere;
        word-break: break-word;
      }
      p { margin: 0 0 1.15em; }
      p:last-child { margin-bottom: 0; }
      a { color: #8ab4f8 !important; text-decoration: underline; }
    </style>
  </head>
  <body>${html}</body>
</html>`;
}

function EmailBodyFrame({ html }: { html: string }) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [height, setHeight] = useState(160);
  const srcDoc = useMemo(() => iframeBodyHtml(html), [html]);

  const syncHeight = useCallback(() => {
    const frame = iframeRef.current;
    const doc = frame?.contentDocument;
    if (!doc) {
      return;
    }
    const body = doc.body;
    const documentElement = doc.documentElement;
    if (!body || !documentElement) {
      return;
    }
    const nextHeight = Math.max(
      24,
      body.scrollHeight,
      documentElement.scrollHeight,
    );
    setHeight(nextHeight);
  }, []);

  useEffect(() => {
    const frame = iframeRef.current;
    const win = frame?.contentWindow;
    syncHeight();
    const timeout = window.setTimeout(syncHeight, 250);
    win?.addEventListener("resize", syncHeight);
    return () => {
      window.clearTimeout(timeout);
      win?.removeEventListener("resize", syncHeight);
    };
  }, [srcDoc, syncHeight]);

  return (
    <iframe
      ref={iframeRef}
      className="block w-full border-0 bg-transparent"
      sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
      srcDoc={srcDoc}
      style={{ height }}
      title="Email body"
      onLoad={syncHeight}
    />
  );
}

function displayName(message: MailMessage) {
  return message.senderName || message.senderEmail || "Unknown";
}

function mailAvatarIdentity(message: MailMessage): AvatarIdentity {
  return {
    avatarUrl: message.avatarUrl,
    email: message.senderEmail,
    name: displayName(message),
  };
}

function VerifiedBadge() {
  return (
    <span
      aria-label="Verified sender"
      className="inline-flex shrink-0 text-[#a8c7fa]"
      title="Verified sender"
    >
      {icon("verified", "text-[18px]")}
    </span>
  );
}

function sessionAvatarIdentity(session: SessionPayload | null): AvatarIdentity | null {
  if (!session?.authenticated) {
    return null;
  }
  return {
    avatarUrl: session.user?.image ?? session.user?.picture,
    email: session.user?.email,
    name: session.user?.name,
  };
}

function readCachedContacts() {
  if (typeof window === "undefined") {
    return new Map<string, CachedContactProfile>();
  }
  try {
    const raw = window.localStorage.getItem(CONTACT_CACHE_KEY);
    if (!raw) {
      return new Map<string, CachedContactProfile>();
    }
    return new Map(Object.entries(JSON.parse(raw) as Record<string, CachedContactProfile>));
  } catch {
    return new Map<string, CachedContactProfile>();
  }
}

function writeCachedContacts(cache: Map<string, CachedContactProfile>) {
  if (typeof window === "undefined") {
    return;
  }
  const entries = [...cache.entries()].slice(-CONTACT_CACHE_LIMIT);
  window.localStorage.setItem(CONTACT_CACHE_KEY, JSON.stringify(Object.fromEntries(entries)));
}

function isEmailLikeName(name: string | undefined, email: string) {
  return name?.trim().toLowerCase() === email.trim().toLowerCase();
}

function fallbackSenderName(name: string, email: string) {
  if (!isEmailLikeName(name, email)) {
    return name;
  }
  return email.split("@")[0] || name;
}

function timeLabel(dateValue: string) {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay) {
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function normalizeMessage(message: RawMailMessage): MailMessage {
  const from = message.from;
  const senderEmail = message.senderEmail ?? from?.email ?? "";
  const rawSenderName =
    message.senderName ?? from?.name ?? from?.email ?? message.senderEmail ?? "Unknown";
  const cached = readCachedContacts().get(senderEmail.trim().toLowerCase());
  const senderName =
    isEmailLikeName(rawSenderName, senderEmail)
      ? cached?.name ?? rawSenderName
      : rawSenderName;
  return {
    id: String(message.id ?? crypto.randomUUID()),
    threadId: String(message.threadId ?? message.id ?? crypto.randomUUID()),
    source: message.source ?? "gmail",
    senderName: fallbackSenderName(senderName, senderEmail),
    senderEmail,
    avatarUrl: message.avatarUrl ?? from?.avatar ?? cached?.avatarUrl,
    subject: decodeHtmlEntities(message.subject ?? message.title ?? "(no subject)"),
    snippet: decodeHtmlEntities(
      message.snippet ?? message.bodyText ?? stripHtml(message.bodyHtml),
    ),
    bodyHtml: message.bodyHtml,
    date: message.date ?? new Date().toISOString(),
    unread: Boolean(message.unread),
    labels: message.labels ?? ["Inbox"],
    attachments: message.attachments ?? [],
  };
}

function sortThread(messages: MailMessage[]) {
  return [...messages].sort(
    (left, right) => new Date(left.date).getTime() - new Date(right.date).getTime(),
  );
}

function mergeThreadMessages(detail: RawMailMessage, thread: RawMailMessage[]) {
  const byId = new Map<string, RawMailMessage>();
  for (const item of thread) {
    byId.set(String(item.id ?? crypto.randomUUID()), item);
  }
  byId.set(String(detail.id ?? crypto.randomUUID()), {
    ...byId.get(String(detail.id)),
    ...detail,
  });
  return sortThread([...byId.values()].map(normalizeMessage));
}

type GmailContextValue = {
  activeQuery: string;
  avatar: (message?: MailMessage, size?: string) => React.ReactNode;
  clearThread: () => void;
  error: string | null;
  ensureThread: (messageId: string) => Promise<void>;
  loading: boolean;
  loadingMore: boolean;
  loadMore: () => void;
  logout: () => Promise<void>;
  messages: MailMessage[];
  nextPageToken?: string;
  openDrawer: () => void;
  openMessage: (message: MailMessage) => Promise<void>;
  query: string;
  resetInbox: () => void;
  selectedMessage?: MailMessage;
  selectedMessageId: string | null;
  selectedThread: MailMessage[] | null;
  session: SessionPayload | null;
  setQuery: (value: string) => void;
  threadLoading: boolean;
};

const GmailContext = createContext<GmailContextValue | null>(null);

function useGmail() {
  const context = useContext(GmailContext);
  if (!context) {
    throw new Error("Gmail route components must be rendered inside GmailShell.");
  }
  return context;
}

export function GmailShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<SessionPayload | null>(null);
  const [messages, setMessages] = useState<MailMessage[]>([]);
  const [nextPageToken, setNextPageToken] = useState<string | undefined>();
  const [selectedThread, setSelectedThread] = useState<MailMessage[] | null>(
    null,
  );
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeQuery, setActiveQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [threadLoading, setThreadLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const contactCacheRef = useRef<Map<string, CachedContactProfile>>(new Map());
  const didRunQueryEffectRef = useRef(false);

  const selectedMessage =
    selectedThread?.find((item) => item.id === selectedMessageId) ?? selectedThread?.[0];

  useEffect(() => {
    syncAppViewport();

    const viewport = window.visualViewport;
    window.addEventListener("resize", syncAppViewport);
    viewport?.addEventListener("resize", syncAppViewport);
    viewport?.addEventListener("scroll", syncAppViewport);

    return () => {
      window.removeEventListener("resize", syncAppViewport);
      viewport?.removeEventListener("resize", syncAppViewport);
      viewport?.removeEventListener("scroll", syncAppViewport);
    };
  }, []);

  const loadSession = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/session", { cache: "no-store" });
      if (response.ok) {
        setSession(await response.json());
      } else {
        setSession({ authenticated: false });
      }
    } catch {
      setSession({ authenticated: false });
    }
  }, []);

  const loadMessages = useCallback(
    async (options?: { pageToken?: string; append?: boolean; q?: string }) => {
      const append = Boolean(options?.append);
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const params = new URLSearchParams();
      if (options?.pageToken) {
        params.set("pageToken", options.pageToken);
      }
      if (options?.q) {
        params.set("q", options.q);
      }

      const path = options?.q ? "/api/search" : "/api/messages";
      try {
        const response = await fetch(`${path}?${params.toString()}`, {
          cache: "no-store",
        });
        const payload = await readApiJson<MailListPayload>(
          response,
          "Unable to load mail.",
        );
        const nextMessages = (payload.messages ?? payload.items ?? []).map(
          normalizeMessage,
        );
        setMessages((current) =>
          append ? [...current, ...nextMessages] : nextMessages,
        );
        setNextPageToken(payload.nextPageToken);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load mail.");
      } finally {
        if (append) {
          setLoadingMore(false);
        } else {
          setLoading(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    contactCacheRef.current = readCachedContacts();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadSession();
    void loadMessages();
  }, [loadMessages, loadSession]);

  useEffect(() => {
    if (messages.length === 0 && !selectedThread?.length) {
      return;
    }
    const next = new Map(contactCacheRef.current);
    let changed = false;
    for (const message of [...messages, ...(selectedThread ?? [])]) {
      const email = message.senderEmail.trim().toLowerCase();
      if (!email || (!message.senderName && !message.avatarUrl)) {
        continue;
      }
      const cached = next.get(email);
      const profile = {
        name: message.senderName || cached?.name,
        avatarUrl: message.avatarUrl || cached?.avatarUrl,
      };
      if (profile.name !== cached?.name || profile.avatarUrl !== cached?.avatarUrl) {
        next.set(email, profile);
        changed = true;
      }
    }
    if (changed) {
      contactCacheRef.current = next;
      writeCachedContacts(next);
    }
  }, [messages, selectedThread]);

  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
  }, []);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    if (drawerOpen) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [drawerOpen]);

  useEffect(() => {
    if (!didRunQueryEffectRef.current) {
      didRunQueryEffectRef.current = true;
      if (!query.trim()) {
        return;
      }
    }

    const timeout = window.setTimeout(() => {
      const trimmed = query.trim();
      setActiveQuery(trimmed);
      loadMessages({ q: trimmed || undefined });
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [loadMessages, query]);

  const fetchThread = useCallback(async (messageId: string, fallback?: MailMessage) => {
    setThreadLoading(true);
    try {
      const response = await fetch(`/api/messages/${encodeURIComponent(messageId)}`, {
        cache: "no-store",
      });
      const payload = await readApiJson<ThreadPayload & {
        message?: RawMailMessage;
      }>(response, "Unable to load message detail.");
      const detail = payload.message;
      const rawThread = (payload.thread ??
        payload.messages ??
        detail?.thread ??
        []) as RawMailMessage[];
      const selected = (detail ?? rawThread[0] ?? fallback) as RawMailMessage | undefined;
      if (!selected) {
        return;
      }
      setSelectedMessageId(String(selected.id ?? messageId));
      setSelectedThread(mergeThreadMessages(selected, rawThread));
    } catch {
      if (fallback) {
        setSelectedThread([fallback]);
      }
    } finally {
      setThreadLoading(false);
    }
  }, []);

  const openMessage = useCallback(
    async (message: MailMessage) => {
      setSelectedMessageId(message.id);
      setSelectedThread((current) => {
        const existing = current?.some((item) => item.id === message.id)
          ? current
          : [...(current ?? []), message];
        return sortThread(existing);
      });
      router.push(`/thread/${encodeURIComponent(message.id)}`);
    },
    [router],
  );

  const ensureThread = useCallback(
    async (messageId: string) => {
      const selected = selectedThread?.find((item) => item.id === messageId);
      setSelectedMessageId(messageId);
      if (selected?.bodyHtml !== undefined) {
        return;
      }
      await fetchThread(messageId, selected);
    },
    [fetchThread, selectedThread],
  );

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setSession({ authenticated: false });
    await loadMessages({ q: activeQuery || undefined });
  }, [activeQuery, loadMessages]);

  const avatar = useCallback((message?: MailMessage, size = "h-12 w-12") => {
    if (!message) {
      return null;
    }
    const cached = contactCacheRef.current.get(message.senderEmail.trim().toLowerCase());
    return (
      <MailAvatar
        identity={{
          ...mailAvatarIdentity(message),
          avatarUrl: message.avatarUrl ?? cached?.avatarUrl,
          name: message.senderName || cached?.name,
        }}
        size={size}
        fallback={icon("person")}
      />
    );
  }, []);

  const clearThread = useCallback(() => {
    setThreadLoading(false);
    setSelectedMessageId(null);
    setSelectedThread(null);
  }, []);

  const resetInbox = useCallback(() => {
    setQuery("");
    setActiveQuery("");
    void loadMessages();
  }, [loadMessages]);

  const loadMore = useCallback(() => {
    if (!nextPageToken) {
      return;
    }
    void loadMessages({
      append: true,
      pageToken: nextPageToken,
      q: activeQuery || undefined,
    });
  }, [activeQuery, loadMessages, nextPageToken]);

  const openDrawer = useCallback(() => {
    setDrawerOpen(true);
  }, []);

  const value = useMemo<GmailContextValue>(
    () => ({
      activeQuery,
      avatar,
      clearThread,
      error,
      ensureThread,
      loading,
      loadingMore,
      loadMore,
      logout,
      messages,
      nextPageToken,
      openDrawer,
      openMessage,
      query,
      resetInbox,
      selectedMessage,
      selectedMessageId,
      selectedThread,
      session,
      setQuery,
      threadLoading,
    }),
    [
      activeQuery,
      avatar,
      clearThread,
      ensureThread,
      error,
      loading,
      loadingMore,
      loadMore,
      logout,
      messages,
      nextPageToken,
      openDrawer,
      openMessage,
      query,
      resetInbox,
      selectedMessage,
      selectedMessageId,
      selectedThread,
      session,
      threadLoading,
    ],
  );

  return (
    <GmailContext.Provider value={value}>
      <div className="app-shell relative w-full overflow-hidden bg-[var(--bg)] text-[var(--text)]">
        <div className="relative h-full w-full overflow-hidden bg-[var(--bg)]">
          {children}
        </div>
        {pathname === "/search" ? null : <BottomNav />}
        <NavigationDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      </div>
    </GmailContext.Provider>
  );
}

export function InboxRoute() {
  const {
    activeQuery,
    avatar,
    error,
    loading,
    loadingMore,
    loadMore,
    logout,
    messages,
    nextPageToken,
    openDrawer,
    openMessage,
    query,
    resetInbox,
    session,
  } = useGmail();

  useEffect(() => {
    if (query || activeQuery) {
      resetInbox();
    }
  }, [activeQuery, query, resetInbox]);

  return (
    <InboxView
      activeQuery=""
      error={error}
      loading={loading}
      loadingMore={loadingMore}
      messages={messages}
      nextPageToken={nextPageToken}
      session={session}
      avatar={avatar}
      onCompose={() => undefined}
      onDrawer={openDrawer}
      onLogin={() => {
        window.location.href = "/api/auth/login";
      }}
      onLogout={logout}
      onLoadMore={loadMore}
      onOpen={openMessage}
    />
  );
}

export function SearchRoute() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") ?? "";
  const {
    activeQuery,
    avatar,
    error,
    loading,
    loadingMore,
    loadMore,
    messages,
    nextPageToken,
    openMessage,
    query,
    setQuery,
  } = useGmail();
  const [history, setHistory] = useState<string[]>([]);

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery, setQuery]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setHistory(readSearchHistory());
    }, 0);
    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (activeQuery) {
      const timeout = window.setTimeout(() => {
        setHistory(addSearchHistoryItem(activeQuery));
      }, 0);
      return () => window.clearTimeout(timeout);
    }
    return undefined;
  }, [activeQuery]);

  const updateQuery = useCallback(
    (value: string) => {
      setQuery(value);
      const trimmed = value.trim();
      router.replace(trimmed ? `/search?q=${encodeURIComponent(trimmed)}` : "/search", {
        scroll: false,
      });
    },
    [router, setQuery],
  );

  return (
    <SearchView
      activeQuery={activeQuery || initialQuery}
      error={error}
      history={history}
      loading={loading}
      loadingMore={loadingMore}
      messages={messages}
      nextPageToken={nextPageToken}
      query={query}
      avatar={avatar}
      onLogin={() => {
        window.location.href = "/api/auth/login";
      }}
      onLoadMore={loadMore}
      onOpen={openMessage}
      onBack={() => router.push("/")}
      onHistorySelect={(value) => {
        setHistory(addSearchHistoryItem(value));
        updateQuery(value);
      }}
      onQueryChange={updateQuery}
      onSearchSubmit={(value) => {
        setHistory(addSearchHistoryItem(value));
        updateQuery(value);
      }}
    />
  );
}

export function ThreadRoute({ messageId }: { messageId: string }) {
  const router = useRouter();
  const {
    avatar,
    clearThread,
    ensureThread,
    openMessage,
    selectedMessage,
    selectedMessageId,
    selectedThread,
    threadLoading,
  } = useGmail();

  useEffect(() => {
    void ensureThread(messageId);
  }, [ensureThread, messageId]);

  if (!selectedMessage) {
    return (
      <div className="grid h-full place-items-center bg-[var(--bg)] text-[var(--text-muted)]">
        <md-circular-progress indeterminate />
      </div>
    );
  }

  return (
    <ThreadView
      message={selectedMessage}
      thread={selectedThread ?? [selectedMessage]}
      loading={threadLoading}
      selectedMessageId={selectedMessageId ?? selectedMessage.id}
      avatar={avatar}
      onBack={() => {
        clearThread();
        router.push("/");
      }}
      onSelectMessage={openMessage}
    />
  );
}

function SearchView({
  activeQuery,
  avatar,
  error,
  history,
  loading,
  loadingMore,
  messages,
  nextPageToken,
  onBack,
  onHistorySelect,
  onLoadMore,
  onLogin,
  onOpen,
  onQueryChange,
  onSearchSubmit,
  query,
}: {
  activeQuery: string;
  error: string | null;
  history: string[];
  loading: boolean;
  loadingMore: boolean;
  messages: MailMessage[];
  nextPageToken?: string;
  query: string;
  avatar: (message?: MailMessage, size?: string) => React.ReactNode;
  onBack: () => void;
  onHistorySelect: (value: string) => void;
  onLoadMore: () => void;
  onLogin: () => void;
  onOpen: (message: MailMessage) => void;
  onQueryChange: (value: string) => void;
  onSearchSubmit: (value: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const trimmedQuery = query.trim();
  const resultQuery = activeQuery || trimmedQuery;
  const showHistory = !trimmedQuery;

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target || !nextPageToken || loading || loadingMore || showHistory) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          onLoadMore();
        }
      },
      { root: null, rootMargin: "320px 0px", threshold: 0 },
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [loading, loadingMore, nextPageToken, onLoadMore, showHistory]);

  return (
    <div className="relative h-full overflow-x-hidden overflow-y-auto overscroll-contain pb-[env(safe-area-inset-bottom)]">
      <form
        className="sticky top-0 z-30 flex h-[calc(70px+env(safe-area-inset-top))] items-center border-b border-[var(--divider)] bg-neutral-800 px-3 pt-[env(safe-area-inset-top)]"
        onSubmit={(event) => {
          event.preventDefault();
          onSearchSubmit(query);
          inputRef.current?.blur();
        }}
      >
        <button
          aria-label="Back"
          className="grid h-11 w-11 shrink-0 place-items-center text-[var(--text-soft)]"
          onClick={onBack}
          type="button"
        >
          {icon("arrow_back_ios_new", "text-[24px]")}
        </button>
        <input
          ref={inputRef}
          aria-label="Search in mail"
          autoCapitalize="none"
          autoComplete="off"
          autoCorrect="off"
          className="font-google-sans search-route-input h-10 min-w-0 flex-1 bg-transparent px-3 text-xl font-normal leading-10 text-[var(--text)] outline-none placeholder:text-[var(--text-soft)]"
          enterKeyHint="search"
          placeholder="Search in mail"
          spellCheck={false}
          type="text"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
        />
        {trimmedQuery ? (
          <button
            aria-label="Clear search"
            className="grid h-11 w-11 shrink-0 place-items-center text-[var(--text-soft)]"
            onClick={() => {
              onQueryChange("");
              inputRef.current?.focus();
            }}
            type="button"
          >
            {icon("close", "text-[24px]")}
          </button>
        ) : (
          <button
            aria-label="Voice search"
            className="grid h-11 w-11 shrink-0 place-items-center text-[var(--text-soft)]"
            type="button"
          >
            {icon("mic", "text-[24px]")}
          </button>
        )}
      </form>

      {showHistory ? (
        <section className="px-5 pt-7">
          <div className="text-xs font-semibold tracking-widest text-[var(--text-soft)]">
            Recent mail searches
          </div>
          <div className="pt-5">
            {history.length === 0 ? (
              <div className="py-10 text-center text-sm text-[var(--text-muted)]">
                No recent searches.
              </div>
            ) : (
              history.slice(0, 6).map((item) => (
                <button
                  className="grid h-[66px] w-full grid-cols-[56px_1fr] items-center text-left text-[21px] leading-7 text-[var(--text)] active:bg-white/5"
                  key={item}
                  onClick={() => onHistorySelect(item)}
                  type="button"
                >
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-[#3f4244] text-[var(--text-soft)]">
                    {icon("history", "text-[24px]")}
                  </span>
                  <span className="truncate pl-3">{item}</span>
                </button>
              ))
            )}
          </div>
        </section>
      ) : (
        <>
          <div className="px-5 pt-6 text-xs font-semibold tracking-widest text-[var(--text-soft)]">
            All results in mail
          </div>
          <div className="pt-4">
            {loading ? (
              <div className="grid h-[42vh] place-items-center text-[var(--text-muted)]">
                <md-circular-progress indeterminate />
              </div>
            ) : error ? (
              <div className="px-8 py-12 text-center text-[var(--text-muted)]">
                <p>{error}</p>
                <md-filled-button onClick={onLogin}>Sign in with Google</md-filled-button>
              </div>
            ) : messages.length === 0 ? (
              <div className="px-8 py-16 text-center text-[var(--text-muted)]">
                No mail found.
              </div>
            ) : (
              messages.map((message) => (
                <MessageRow
                  avatar={avatar}
                  highlightQuery={resultQuery}
                  key={`${message.source}:${message.id}`}
                  message={message}
                  searchResult
                  onOpen={onOpen}
                />
              ))
            )}
          </div>

          {nextPageToken ? (
            <div
              aria-hidden
              className="grid min-h-16 place-items-center py-4 text-[var(--text-muted)]"
              ref={loadMoreRef}
            >
              {loadingMore ? <md-circular-progress indeterminate /> : null}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

function InboxView({
  activeQuery,
  avatar,
  error,
  loading,
  loadingMore,
  messages,
  nextPageToken,
  onCompose,
  onDrawer,
  onLoadMore,
  onLogin,
  onLogout,
  onOpen,
  session,
}: {
  activeQuery: string;
  error: string | null;
  loading: boolean;
  loadingMore: boolean;
  messages: MailMessage[];
  nextPageToken?: string;
  session: SessionPayload | null;
  avatar: (message?: MailMessage, size?: string) => React.ReactNode;
  onCompose: () => void;
  onDrawer: () => void;
  onLoadMore: () => void;
  onLogin: () => void;
  onLogout: () => void;
  onOpen: (message: MailMessage) => void;
}) {
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target || !nextPageToken || loading || loadingMore) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          onLoadMore();
        }
      },
      { root: null, rootMargin: "320px 0px", threshold: 0 },
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [loading, loadingMore, nextPageToken, onLoadMore]);

  return (
    <div className="relative h-full overflow-x-hidden overflow-y-auto overscroll-contain pb-[calc(132px+env(safe-area-inset-bottom))]">
      <div className="sticky top-0 z-30 bg-[var(--bg)] px-4 pb-3 pt-[calc(13px+env(safe-area-inset-top))]">
        <div className="flex h-[56px] items-center rounded-[28px] bg-[var(--surface)] px-4">
          <button
            aria-label="Open menu"
            className="mr-3 grid h-10 w-10 place-items-center text-[var(--text-soft)]"
            onClick={onDrawer}
            type="button"
          >
            {icon("menu", "text-[28px]")}
          </button>
          <Link
            aria-label="Search in mail"
            className="font-google-sans flex h-full min-w-0 flex-1 items-center text-xl font-normal text-[var(--text-soft)] outline-none"
            href="/search"
          >
            <span className="truncate">Search in mail</span>
          </Link>
          <button
            aria-label={session?.authenticated ? "Sign out" : "Sign in"}
            className="grid h-[30px] w-[30px] place-items-center overflow-hidden rounded-full"
            onClick={session?.authenticated ? onLogout : onLogin}
            type="button"
          >
            <MailAvatar
              fallback="G"
              identity={sessionAvatarIdentity(session) ?? { name: "G" }}
              size="h-[30px] w-[30px]"
            />
          </button>
        </div>
      </div>

      <div className="px-4 pt-4 text-xs font-semibold tracking-widest text-[var(--text-soft)]">
        {activeQuery ? "Search results" : "All inboxes"}
      </div>

      <div className="pt-5">
        {loading ? (
          <div className="grid h-[42vh] place-items-center text-[var(--text-muted)]">
            <md-circular-progress indeterminate />
          </div>
        ) : error ? (
          <div className="px-8 py-12 text-center text-[var(--text-muted)]">
            <p>{error}</p>
            <md-filled-button onClick={onLogin}>Sign in with Google</md-filled-button>
          </div>
        ) : messages.length === 0 ? (
          <div className="px-8 py-16 text-center text-[var(--text-muted)]">
            No mail found.
          </div>
        ) : (
          messages.map((message) => (
            <MessageRow
              key={`${message.source}:${message.id}`}
              message={message}
              avatar={avatar}
              onOpen={onOpen}
            />
          ))
        )}
      </div>

      {nextPageToken ? (
        <div
          aria-hidden
          className="grid min-h-16 place-items-center py-4 text-[var(--text-muted)]"
          ref={loadMoreRef}
        >
          {loadingMore ? <md-circular-progress indeterminate /> : null}
        </div>
      ) : null}

      <button
        aria-label="Compose"
        className="font-google-sans fixed bottom-[calc(68px+env(safe-area-inset-bottom))] right-5 z-20 flex h-14 items-center justify-center gap-x-2 rounded-2xl bg-[var(--compose-blue)] px-4 text-base font-semibold text-white shadow-xl active:scale-[0.98]"
        onClick={onCompose}
        type="button"
      >
        {icon("edit", "text-[24px]")}
        <span className="font-google-sans text-[15px] font-medium leading-5">
          Compose
        </span>
      </button>
    </div>
  );
}

function MessageRow({
  avatar,
  highlightQuery = "",
  message,
  onOpen,
  searchResult = false,
}: {
  message: MailMessage;
  highlightQuery?: string;
  searchResult?: boolean;
  avatar: (message?: MailMessage, size?: string) => React.ReactNode;
  onOpen: (message: MailMessage) => void;
}) {
  const preview = message.snippet || stripHtml(message.bodyHtml);
  const sender = displayName(message);
  return (
    <button
      className={classNames(
        "relative grid w-full grid-cols-[56px_1fr_36px] items-start px-4 text-left active:bg-white/5",
        searchResult ? "min-h-[106px] py-2" : "min-h-[88px] py-1.5",
      )}
      onClick={() => onOpen(message)}
      type="button"
    >
      <div className="pt-2">{avatar(message, "h-10 w-10")}</div>
      <div className="min-w-0 pr-2">
        <div
          className={classNames(
            "font-google-sans line-clamp-1 text-[17px] leading-[21px]",
            message.unread
              ? "font-bold text-[var(--text)]"
              : "font-medium text-[var(--text-soft)]",
          )}
        >
          {highlightedText(sender, highlightQuery)}
        </div>
        <div
          className={classNames(
            "mt-0.5 line-clamp-1 text-sm leading-5",
            message.unread ? "font-bold text-[var(--text)]" : "font-medium text-[var(--text-soft)]",
          )}
        >
          {highlightedText(message.subject, highlightQuery)}
        </div>
        <div className="line-clamp-1 text-sm font-medium leading-5 text-[var(--text-soft)]">
          {highlightedText(preview, highlightQuery)}
          {searchResult ? (
            <span className="ml-1 inline-flex translate-y-[-1px] rounded-md border border-[var(--outline)] px-1.5 text-sm font-medium leading-[18px] text-[var(--text-muted)]">
              Inbox
            </span>
          ) : null}
        </div>
        {message.attachments?.[0] ? (
          <div className="mt-2 inline-flex max-w-[190px] items-center gap-2 rounded-[10px] border border-[var(--outline)] px-3 py-1 text-base text-[var(--text-soft)]">
            <span className="rounded bg-[#ea4335] px-1 text-xs font-bold text-white">
              PDF
            </span>
            <span className="truncate">{message.attachments[0].name}</span>
          </div>
        ) : null}
      </div>
      <span
        className={classNames(
          "absolute right-4 top-2 whitespace-nowrap text-xs leading-none",
          message.unread
            ? "font-bold text-[var(--text)]"
            : "font-medium text-[var(--text-soft)]",
        )}
      >
        {timeLabel(message.date)}
      </span>
      <div className="flex h-full flex-col items-end justify-end pb-2 pt-2">
        {icon("star", "text-[24px] text-[var(--text-muted)]")}
      </div>
    </button>
  );
}

function ThreadView({
  avatar,
  loading,
  message,
  onBack,
  onSelectMessage,
  selectedMessageId,
  thread,
}: {
  message: MailMessage;
  thread: MailMessage[];
  loading: boolean;
  selectedMessageId: string;
  avatar: (message?: MailMessage, size?: string) => React.ReactNode;
  onBack: () => void;
  onSelectMessage: (message: MailMessage) => void;
}) {
  const orderedThread = sortThread(thread);
  const hasThreadBorder = orderedThread.length > 1;

  return (
    <div className="relative h-full overflow-x-hidden overflow-y-auto overscroll-contain pb-[calc(154px+env(safe-area-inset-bottom))] pt-[calc(56px+env(safe-area-inset-top))]">
      <div className="fixed left-0 right-0 top-0 z-30 flex h-[calc(56px+env(safe-area-inset-top))] items-end bg-[var(--bg)] px-3 pb-2">
        <button
          aria-label="Back"
          className="mr-auto grid h-10 w-10 place-items-center text-[var(--text-soft)]"
          onClick={onBack}
          type="button"
        >
          {icon("arrow_back_ios_new", "text-[24px]")}
        </button>
        {["archive", "delete", "mark_email_unread", "more_horiz"].map((name) => (
          <button
            aria-label={name}
            className="ml-3 grid h-10 w-10 place-items-center text-[var(--text-soft)]"
            key={name}
            type="button"
          >
            {icon(name, "text-[24px]")}
          </button>
        ))}
      </div>

      <section className="px-6 pt-4">
        <div className="grid grid-cols-[1fr_42px] gap-2">
          <h1 className="font-google-sans text-2xl font-normal leading-tight text-[var(--text)]">
            {message.subject}
            <span className="ml-2 inline-flex translate-y-[-2px] rounded-md bg-[var(--external)] px-2 py-0.5 text-xs font-medium text-black">
              External
            </span>
            <span className="ml-1 inline-flex translate-y-[-2px] rounded-md border border-[var(--outline)] px-2 py-0.5 text-xs font-medium text-[var(--text-muted)]">
              Inbox
            </span>
          </h1>
          <button
            aria-label="Star"
            className="grid h-11 w-11 place-items-center text-[var(--text-muted)]"
            type="button"
          >
            {icon("star", "text-[24px]")}
          </button>
        </div>
      </section>

      <div className="pt-6">
        {orderedThread.map((item, index) => (
          <ThreadMessage
            avatar={avatar}
            bordered={hasThreadBorder && index > 0}
            expanded={item.id === selectedMessageId}
            item={item}
            key={`${item.source}:${item.id}`}
            loading={loading && item.id === selectedMessageId}
            onSelectMessage={onSelectMessage}
          />
        ))}
      </div>

      <div className="fixed bottom-[calc(52px+env(safe-area-inset-bottom))] left-0 right-0 z-20 mx-auto flex items-center gap-2 bg-[var(--bg)] px-4 py-2">
        <button
          aria-label="Reply"
          className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-[#3c4043] bg-[var(--bg)] text-[var(--text-soft)] active:bg-white/5"
          type="button"
        >
          {icon("reply", "text-[24px]")}
        </button>
        <button
          className="flex h-12 flex-[1.15] items-center justify-center gap-3 rounded-[24px] border border-[#3c4043] bg-[var(--bg)] text-base font-medium text-[var(--text-soft)] active:bg-white/5"
          type="button"
        >
          {icon("reply_all", "text-[24px]")} Reply all
        </button>
        <button
          className="flex h-12 flex-1 items-center justify-center gap-3 rounded-[24px] border border-[#3c4043] bg-[var(--bg)] text-base font-medium text-[var(--text-soft)] active:bg-white/5"
          type="button"
        >
          {icon("forward", "text-[24px]")} Forward
        </button>
        <button
          aria-label="Reaction"
          className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-[#3c4043] bg-[var(--bg)] text-[var(--text-soft)] active:bg-white/5"
          type="button"
        >
          {icon("mood", "text-[24px]")}
        </button>
      </div>
    </div>
  );
}

function ThreadMessage({
  avatar,
  bordered,
  expanded,
  item,
  loading,
  onSelectMessage,
}: {
  item: MailMessage;
  bordered: boolean;
  expanded: boolean;
  loading: boolean;
  avatar: (message?: MailMessage, size?: string) => React.ReactNode;
  onSelectMessage: (message: MailMessage) => void;
}) {
  const preview = item.snippet || stripHtml(item.bodyHtml);
  const borderClass = bordered ? "border-t border-[var(--divider)]" : "";

  if (!expanded) {
    return (
      <button
        className={classNames(
          "grid min-h-[92px] w-full grid-cols-[40px_1fr] gap-4 px-4 py-4 text-left active:bg-white/5",
          borderClass,
        )}
        onClick={() => onSelectMessage(item)}
        type="button"
      >
        {avatar(item, "h-10 w-10")}
        <div className="min-w-0 pt-0.5">
          <div className="flex min-w-0 items-center gap-2 text-sm leading-5 text-[var(--text-soft)]">
            <span className="truncate font-medium text-[var(--text)]">
              {displayName(item)}
            </span>
            {isVerifiedSender(item.senderEmail) ? <VerifiedBadge /> : null}
            <span className="shrink-0 text-xs text-[var(--text-muted)]">
              {timeLabel(item.date)}
            </span>
          </div>
          <div className="mt-1 line-clamp-1 text-xs leading-5 text-[var(--text-soft)]">
            {preview}
          </div>
        </div>
      </button>
    );
  }

  return (
    <article className={classNames("px-4 pb-8 pt-4", borderClass)}>
      <div className="mb-5 grid grid-cols-[40px_1fr_auto] items-center gap-4">
        {avatar(item, "h-10 w-10")}
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2 text-sm leading-5">
            <span className="truncate font-semibold text-[var(--text)]">
              {displayName(item)}
            </span>
            {isVerifiedSender(item.senderEmail) ? <VerifiedBadge /> : null}
            <span className="shrink-0 text-xs font-normal text-[var(--text-muted)]">
              {timeLabel(item.date)}
            </span>
          </div>
          <div className="flex items-center gap-1 text-xs leading-4 text-[var(--text-soft)]">
            to me {icon("keyboard_arrow_down", "text-[16px]")}
          </div>
        </div>
        <div className="flex items-center gap-4 text-[var(--text-soft)]">
          {icon("mood", "text-[24px]")}
          {icon("reply", "text-[24px]")}
          {icon("more_horiz", "text-[24px]")}
        </div>
      </div>
      <div
        className="gmail-html-body text-base leading-6"
        style={{ colorScheme: "dark" }}
      >
        {loading && !item.bodyHtml ? (
          <div className="grid min-h-[160px] place-items-center text-[var(--text-muted)]">
            <md-circular-progress indeterminate />
          </div>
        ) : (
          <EmailBodyFrame html={mailBodyHtml(item)} />
        )}
      </div>
    </article>
  );
}

function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 z-10 flex h-[calc(52px+env(safe-area-inset-bottom))] w-full items-start justify-around bg-[var(--surface-2)] px-4 pb-[env(safe-area-inset-bottom)] pt-[10px]">
      <button
        aria-label="Mail"
        className="relative grid h-8 w-[72px] place-items-center rounded-[18px] bg-[var(--selected-nav)] text-[#cfe8ff]"
        type="button"
      >
        {icon("mail", "text-[24px]")}
        <span className="font-google-sans absolute -right-1 -top-1 rounded-full bg-[var(--badge-red)] px-1.5 py-0.5 text-[11px] font-semibold leading-none tracking-wide text-[#3d0b08]">
          99+
        </span>
      </button>
      <button
        aria-label="Chat"
        className="relative grid h-8 w-[72px] place-items-center text-[var(--text-soft)]"
        type="button"
      >
        {icon("chat_bubble_outline", "text-[24px]")}
        <span className="font-google-sans absolute right-3 top-[-5px] grid h-[20px] min-w-[20px] place-items-center rounded-full bg-[var(--badge-red)] px-1 text-[11px] font-semibold leading-none tracking-wide text-[#3d0b08]">
          1
        </span>
      </button>
      <button
        aria-label="Meet"
        className="grid h-8 w-[72px] place-items-center text-[var(--text-soft)]"
        type="button"
      >
        {icon("videocam", "text-[24px]")}
      </button>
    </nav>
  );
}

function NavigationDrawer({
  onClose,
  open,
}: {
  open: boolean;
  onClose: () => void;
}) {
  return (
    <div
      className={classNames(
        "fixed inset-0 z-40 mx-auto h-dvh w-full transition",
        open ? "pointer-events-auto" : "pointer-events-none",
      )}
    >
      <button
        aria-label="Close menu"
        className={classNames(
          "absolute inset-0 bg-black/65 transition-opacity",
          open ? "opacity-100" : "opacity-0",
        )}
        onClick={onClose}
        type="button"
      />
      <aside
        className={classNames(
          "font-google-sans absolute left-0 top-0 h-full w-[78vw] overflow-y-auto bg-[var(--drawer)] pb-8 pt-[calc(68px+env(safe-area-inset-top))] shadow-[18px_0_28px_rgba(0,0,0,0.42)] transition-transform duration-200",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-[49px] items-center gap-2.5 border-b border-[var(--divider)] px-6">
          <GmailLogo />
          <span className="text-[23px] font-normal leading-none">Gmail</span>
        </div>
        <div className="py-3">
          <button
            className="grid h-12 w-full grid-cols-[68px_1fr_56px] items-center pr-5 text-left text-[17px] font-medium leading-6 text-[var(--text)]"
            onClick={onClose}
            type="button"
          >
            <span className="grid place-items-center">
              <span className="h-[16px] w-[16px] rounded-full bg-[#a8dab5]" />
            </span>
            <span>Active</span>
            <span className="grid place-items-center text-[var(--text-muted)]">
              {icon("keyboard_arrow_down", "text-[26px]")}
            </span>
          </button>
          <button
            className="grid h-12 w-full grid-cols-[68px_1fr_56px] items-center pr-5 text-left text-[17px] font-medium leading-6 text-[var(--text)]"
            onClick={onClose}
            type="button"
          >
            <span className="grid place-items-center text-[var(--text-muted)]">
              {icon("edit", "text-[25px]")}
            </span>
            <span>Add a status</span>
          </button>
          <div className="ml-[68px] mt-3 h-px bg-[var(--divider)]" />
        </div>
        <div>
          {drawerItems.map((item, index) =>
            "divider" in item ? (
              <div
                className="my-3 ml-[68px] h-px bg-[var(--divider)]"
                key={`divider-${index}`}
              />
            ) : (
              <button
                className={classNames(
                  "grid h-12 w-[calc(100%-8px)] grid-cols-[68px_1fr_56px] items-center rounded-r-full pr-5 text-left text-[17px] font-medium leading-6 text-[var(--text)]",
                  item.selected &&
                    "bg-[var(--drawer-selected)] text-[var(--drawer-selected-text)]",
                )}
                key={item.label}
                onClick={onClose}
                type="button"
              >
                <span
                  className={classNames(
                    "grid place-items-center",
                    item.selected
                      ? "text-[var(--drawer-selected-text)]"
                      : "text-[var(--text-muted)]",
                  )}
                >
                  {icon(item.icon, "text-[24px]")}
                </span>
                <span>{item.label}</span>
                {"count" in item && item.count ? (
                  <span
                    className={classNames(
                      "text-right text-[15px] font-normal leading-5",
                      item.selected
                        ? "text-[var(--drawer-count-selected)]"
                        : "text-[var(--text-muted)]",
                    )}
                  >
                    {item.count}
                  </span>
                ) : null}
              </button>
            ),
          )}
        </div>
      </aside>
    </div>
  );
}

function GmailLogo() {
  return (
    <svg
      aria-hidden
      className="h-[22px] w-[29px] shrink-0"
      viewBox="0 0 256 193"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path fill="#4285F4" d="M58.182 192.05V93.14L27.507 65.077 0 49.504v125.091c0 9.642 7.813 17.455 17.455 17.455h40.727Z" />
      <path fill="#34A853" d="M197.818 192.05h40.727c9.642 0 17.455-7.813 17.455-17.455V49.505l-31.054 17.782-27.128 25.855v98.909Z" />
      <path fill="#EA4335" d="m58.182 93.14-4.174-38.647 4.174-36.997L128 69.86l69.818-52.364 4.669 34.998-4.669 40.647L128 145.504 58.182 93.141Z" />
      <path fill="#FBBC04" d="M197.818 17.496V93.14L256 49.504V26.223c0-21.56-24.62-33.85-41.891-20.945l-16.291 12.218Z" />
      <path fill="#C5221F" d="M0 49.504 26.759 69.57l31.423 23.57V17.497L41.89 5.278C24.62-7.627 0 4.663 0 26.223v23.281Z" />
    </svg>
  );
}
