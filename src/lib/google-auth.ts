import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from "crypto";
import { existsSync, readFileSync } from "fs";
import { google } from "googleapis";
import type { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE = "gmail_session";
const OAUTH_STATE_COOKIE = "gmail_oauth_state";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 14;
const STATE_MAX_AGE_SECONDS = 60 * 10;

export const GMAIL_READONLY_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/contacts.readonly",
  "https://www.googleapis.com/auth/contacts.other.readonly",
  "https://www.googleapis.com/auth/directory.readonly",
] as const;

export type AuthUser = {
  id?: string;
  email: string;
  name?: string;
  picture?: string;
};

export type AuthSession = {
  accessToken: string;
  refreshToken?: string;
  expiryDate?: number;
  user: AuthUser;
};

export type OAuthState = {
  nonce: string;
  returnTo: string;
};

type OAuthClientConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
};

type ServiceAccountConfig = {
  clientEmail: string;
  privateKey: string;
};

type GoogleCredentialFile = {
  installed?: {
    client_id?: string;
    client_secret?: string;
    redirect_uris?: string[];
  };
  web?: {
    client_id?: string;
    client_secret?: string;
    redirect_uris?: string[];
  };
  type?: string;
  client_email?: string;
  private_key?: string;
};

function env(name: string) {
  return process.env[name];
}

function required(value: string | undefined, label: string) {
  if (!value) {
    throw new Error(`Missing required Google auth setting: ${label}`);
  }
  return value;
}

function credentialFilePath() {
  return (
    env("GOOGLE_APPLICATION_CREDENTIALS") ??
    env("SERVICE_ACCOUNTS_FILE") ??
    "service_accounts.json"
  );
}

function readCredentialEnv(): GoogleCredentialFile | null {
  const raw = env("GOOGLE_CREDENTIALS_JSON") ?? env("SERVICE_ACCOUNTS_JSON");
  if (!raw) {
    return null;
  }
  return JSON.parse(raw) as GoogleCredentialFile;
}

function readCredential(): GoogleCredentialFile | null {
  const fromEnv = readCredentialEnv();
  if (fromEnv) {
    return fromEnv;
  }

  const path = credentialFilePath();
  if (!existsSync(/* turbopackIgnore: true */ path)) {
    return null;
  }
  return JSON.parse(readFileSync(/* turbopackIgnore: true */ path, "utf8")) as GoogleCredentialFile;
}

function appRedirectUri(redirectUris?: string[], redirectUri?: string) {
  return (
    redirectUri ??
    env("GOOGLE_REDIRECT_URI") ??
    redirectUris?.find((uri) => uri.includes("/api/auth/callback")) ??
    "http://localhost:3000/api/auth/callback"
  );
}

function oauthClientConfig(redirectUri?: string): OAuthClientConfig {
  const file = readCredential();
  const oauth = file?.web ?? file?.installed;

  return {
    clientId: required(
      env("GOOGLE_CLIENT_ID") ?? oauth?.client_id,
      "GOOGLE_CLIENT_ID or GOOGLE_CREDENTIALS_JSON/service_accounts.json client_id",
    ),
    clientSecret: required(
      env("GOOGLE_CLIENT_SECRET") ?? oauth?.client_secret,
      "GOOGLE_CLIENT_SECRET or GOOGLE_CREDENTIALS_JSON/service_accounts.json client_secret",
    ),
    redirectUri: appRedirectUri(oauth?.redirect_uris, redirectUri),
  };
}

function serviceAccountConfig(): ServiceAccountConfig | null {
  const file = readCredential();
  if (file?.type !== "service_account" || !file.client_email || !file.private_key) {
    return null;
  }
  return {
    clientEmail: file.client_email,
    privateKey: file.private_key,
  };
}

export function googleCredentialMode() {
  const file = readCredential();
  if (file?.type === "service_account") {
    return env("GMAIL_DELEGATED_USER") ? "service-account" : "service-account-needs-delegated-user";
  }
  if (file?.installed) {
    return "installed-oauth";
  }
  if (file?.web) {
    return "web-oauth";
  }
  return env("GOOGLE_CLIENT_ID") ? "env-oauth" : "missing";
}

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}

function encryptionKey() {
  return createHash("sha256")
    .update(env("AUTH_COOKIE_SECRET") ?? "dev-only-gmail-clone-cookie-secret")
    .digest();
}

function encryptJson(value: unknown) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ["v1", iv.toString("base64url"), tag.toString("base64url"), encrypted.toString("base64url")].join(".");
}

function decryptJson<T>(packed: string): T | null {
  const [version, iv, tag, encrypted] = packed.split(".");
  if (version !== "v1" || !iv || !tag || !encrypted) {
    return null;
  }

  try {
    const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(iv, "base64url"));
    decipher.setAuthTag(Buffer.from(tag, "base64url"));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encrypted, "base64url")),
      decipher.final(),
    ]);
    return JSON.parse(decrypted.toString("utf8")) as T;
  } catch {
    return null;
  }
}

function safePath(path: string | null) {
  if (!path || !path.startsWith("/") || path.startsWith("//")) {
    return "/";
  }
  return path;
}

export function oauthCallbackUrl(request: NextRequest) {
  return new URL("/api/auth/callback", request.nextUrl.origin).toString();
}

export function createOAuthClient(redirectUri?: string) {
  const config = oauthClientConfig(redirectUri);
  return new google.auth.OAuth2(config.clientId, config.clientSecret, config.redirectUri);
}

export function createOAuthState(returnTo: string | null): string {
  return encryptJson({
    nonce: randomBytes(16).toString("base64url"),
    returnTo: safePath(returnTo),
  } satisfies OAuthState);
}

export function readOAuthState(state: string | null): OAuthState | null {
  if (!state) {
    return null;
  }
  return decryptJson<OAuthState>(state);
}

export function buildGoogleAuthUrl(state: string, redirectUri?: string) {
  return createOAuthClient(redirectUri).generateAuthUrl({
    access_type: "offline",
    include_granted_scopes: true,
    prompt: "consent",
    scope: [...GMAIL_READONLY_SCOPES],
    state,
  });
}

export async function exchangeCodeForSession(code: string, redirectUri?: string): Promise<AuthSession> {
  const client = createOAuthClient(redirectUri);
  const { tokens } = await client.getToken(code);
  if (!tokens.access_token) {
    throw new Error("Google did not return an access token");
  }

  client.setCredentials(tokens);
  const oauth2 = google.oauth2({ version: "v2", auth: client });
  const { data } = await oauth2.userinfo.get();
  if (!data.email) {
    throw new Error("Google profile did not include an email address");
  }

  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token ?? undefined,
    expiryDate: tokens.expiry_date ?? undefined,
    user: {
      id: data.id ?? undefined,
      email: data.email,
      name: data.name ?? undefined,
      picture: data.picture ?? undefined,
    },
  };
}

export function getSessionFromRequest(request: NextRequest): AuthSession | null {
  const cookie = request.cookies.get(SESSION_COOKIE)?.value;
  if (!cookie) {
    return null;
  }
  return decryptJson<AuthSession>(cookie);
}

export function setSessionCookie(response: NextResponse, session: AuthSession) {
  response.cookies.set(SESSION_COOKIE, encryptJson(session), cookieOptions(SESSION_MAX_AGE_SECONDS));
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE, "", { ...cookieOptions(0), expires: new Date(0) });
}

export function setOAuthStateCookie(response: NextResponse, state: string) {
  response.cookies.set(OAUTH_STATE_COOKIE, state, cookieOptions(STATE_MAX_AGE_SECONDS));
}

export function getOAuthStateFromRequest(request: NextRequest) {
  return request.cookies.get(OAUTH_STATE_COOKIE)?.value ?? null;
}

export function clearOAuthStateCookie(response: NextResponse) {
  response.cookies.set(OAUTH_STATE_COOKIE, "", { ...cookieOptions(0), expires: new Date(0) });
}

export function timingSafeStringEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

async function refreshSession(session: AuthSession): Promise<AuthSession> {
  if (!session.refreshToken) {
    return session;
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: oauthClientConfig().clientId,
      client_secret: oauthClientConfig().clientSecret,
      grant_type: "refresh_token",
      refresh_token: session.refreshToken,
    }),
  });

  if (!response.ok) {
    return session;
  }

  const data = (await response.json()) as {
    access_token?: string;
    expires_in?: number;
  };

  if (!data.access_token) {
    return session;
  }

  return {
    ...session,
    accessToken: data.access_token,
    expiryDate: data.expires_in ? Date.now() + data.expires_in * 1000 : session.expiryDate,
  };
}

export async function getFreshSession(session: AuthSession): Promise<AuthSession> {
  if (!session.expiryDate || session.expiryDate - Date.now() > 60_000) {
    return session;
  }
  return refreshSession(session);
}

export function createAuthenticatedOAuthClient(session: AuthSession) {
  const client = createOAuthClient();
  client.setCredentials({
    access_token: session.accessToken,
    refresh_token: session.refreshToken,
    expiry_date: session.expiryDate,
  });
  return client;
}

export function createDelegatedServiceAccountClient() {
  const config = serviceAccountConfig();
  const subject = env("GMAIL_DELEGATED_USER");
  if (!config || !subject) {
    return null;
  }

  return new google.auth.JWT({
    email: config.clientEmail,
    key: config.privateKey,
    scopes: [...GMAIL_READONLY_SCOPES],
    subject,
  });
}

export type GmailAuthClient =
  | ReturnType<typeof createOAuthClient>
  | NonNullable<ReturnType<typeof createDelegatedServiceAccountClient>>;
