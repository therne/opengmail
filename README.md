# Gmail Mobile Reader PWA

A read-only mobile Gmail clone built with Next.js, TypeScript, Tailwind CSS, and `@material/web`.

## Run

```bash
pnpm install
pnpm dev
```

Open `http://localhost:3000`.

## OAuth Setup

Create `.env.local` from `.env.example`:

```bash
cp .env.example .env.local
```

The app reads `service_accounts.json` from the project root by default. The current file format is an installed-app OAuth client, so Gmail access still requires a Google consent/login in the browser.

Useful values:

```bash
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/callback
AUTH_COOKIE_SECRET=use-a-long-random-string
```

`GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are optional overrides. If omitted, they are read from `service_accounts.json`.

The app requests only:

```text
openid email profile https://www.googleapis.com/auth/gmail.readonly
```

## gcloud Notes

Enable the Gmail API:

```bash
gcloud services enable gmail.googleapis.com
```

On this machine, that command currently fails because `gcloud` needs interactive reauthentication:

```text
Reauthentication failed. cannot prompt during non-interactive execution.
```

Also, `gcloud iam oauth-clients create` in SDK `561.0.0` currently documents only Cloud IAM scopes (`cloud-platform`, `openid`, `email`, `groups`) for that command, so it cannot create a Gmail-readonly web OAuth client for this app.

## Service Account Mode

If `service_accounts.json` is replaced with a real `type: "service_account"` key, Gmail user data is readable only with Google Workspace domain-wide delegation. Set:

```bash
GMAIL_DELEGATED_USER=user@your-workspace-domain.com
```

Without domain-wide delegation, Gmail requires the normal OAuth login/consent flow.

## Fake Mail

Fake mail lives in `src/lib/fake-mails.ts` as static `FAKE_MAILS` definitions. Each fake mail has a sender, title, body HTML, date, labels, and unread state.

Fake mail is blended with Gmail API results:

- Inbox list: fake and real messages are sorted together by date.
- Search: fake definitions and Gmail search run through the same API surface.
- Read view: fake mail opens through the same message detail endpoint.

## PWA

The app includes:

- `src/app/manifest.ts`
- `public/sw.js`
- `public/apple-touch-icon.png`
- `public/icons/icon-192.png`
- `public/icons/icon-512.png`

It is configured for iPhone Add to Home Screen with standalone display and dark status-bar styling.

## Reference Screenshots

The provided Gmail iOS screenshots are saved under `reference/screenshots/`.
