import type { MailMessageDetail, MailMessageSummary } from "./mail";

export type FakeMailConfig = {
  id: string;
  threadId?: string;
  sender: {
    name: string;
    email: string;
    avatar?: string;
  };
  to?: {
    name?: string;
    email: string;
    avatar?: string;
  }[];
  title: string;
  bodyHtml: string;
  date: string;
  labels?: string[];
  unread?: boolean;
  thread?: FakeMailConfig[];
};

export const FAKE_MAILS: FakeMailConfig[] = [
  {
    id: "adshield-caret-poc-meeting-4",
    threadId: "adshield-caret-poc-meeting",
    sender: { name: "Joon Yu", email: "joon@ad-shield.io" },
    to: [{ name: "Jun Kim", email: "jun@at.studio" }],
    title: "Re: Caret PoC contract sync",
    bodyHtml:
      "<p>Hi Jun,</p><p>Perfect, thanks. I just sent a calendar invite for <strong>May 14 at 2:00 PM</strong> at our SF office, <strong>1200 Folsom St</strong>.</p><p>Looking forward to meeting in person and walking through the Caret PoC agreement. We'll have the product and legal notes ready on our side as well.</p><p>See you at the office then.</p><p>Best,<br>Joon</p>",
    date: "2026-04-30T09:14:00.000+09:00",
    labels: ["CATEGORY_PERSONAL", "INBOX"],
    thread: [
      {
        id: "adshield-caret-poc-meeting-1",
        threadId: "adshield-caret-poc-meeting",
        sender: { name: "Joon Yu", email: "joon@ad-shield.io" },
        to: [{ name: "Jun Kim", email: "jun@at.studio" }],
        title: "Caret PoC contract sync",
        bodyHtml:
          "<p>Hi Jun,</p><p>Good talking earlier. I shared the Caret PoC contract draft with our legal and security teams, and everyone is aligned on moving forward with AdShield as the client for the first evaluation.</p><p>Would you be open to meeting in person while you're in SF? I think it would be easier to walk through the Caret pilot scope, especially the AdShield integration checkpoints, success criteria, and what we need from your team before we start the test run.</p><p>Could we meet at the AdShield SF Office at <strong>1200 Folsom St</strong> on <strong>May 14</strong>?</p><p>Best,<br>Joon</p>",
        date: "2026-04-28T10:16:00.000+09:00",
        labels: ["CATEGORY_PERSONAL", "INBOX"],
      },
      {
        id: "adshield-caret-poc-meeting-2",
        threadId: "adshield-caret-poc-meeting",
        sender: {
          name: "Jun Kim",
          email: "jun@at.studio",
          avatar: "https://lh3.googleusercontent.com/a/ACg8ocJo1p-glL6YYzFukgqR4pdW_jNW3syl4GcDH8LC_Vx-sbNh-USz=s100",
        },
        to: [{ name: "Joon Yu", email: "joon@ad-shield.io" }],
        title: "Re: Caret PoC contract sync",
        bodyHtml:
          "<p>Hi Joon,</p><p>Sounds good. May 14 works for me, and anything between <strong>2:00 PM and 4:00 PM</strong> should be fine.</p><p>I'll bring the latest Caret PoC agreement, the proposed evaluation checklist, and a short implementation outline so we can make the meeting concrete.</p><p>Best,<br>Jun</p>",
        date: "2026-04-29T11:37:00.000+09:00",
        labels: ["SENT"],
      },
      {
        id: "adshield-caret-poc-meeting-3",
        threadId: "adshield-caret-poc-meeting",
        sender: { name: "Joon Yu", email: "joon@ad-shield.io" },
        to: [{ name: "Jun Kim", email: "jun@at.studio" }],
        title: "Re: Caret PoC contract sync",
        bodyHtml:
          "<p>Hi Jun,</p><p>2:00 PM works well. Let's plan on meeting at our SF office at <strong>1200 Folsom St</strong>.</p><p>The Caret PoC agreement and evaluation checklist are exactly what we need. I'll make sure the right people on our side have reviewed the open notes before then.</p><p>Best,<br>Joon</p>",
        date: "2026-04-29T16:22:00.000+09:00",
        labels: ["CATEGORY_PERSONAL", "INBOX"],
      },
    ],
  },
  {
    id: "google-io-selected",
    sender: {
      name: "Google I/O",
      email: "io-online@google.com",
      avatar: "https://shortwaveimages.com/avatar/io-online@google.com",
    },
    title: "You've been selected for Google I/O 2026",
    bodyHtml:
      "<div style=\"margin:0;background:#000;color:#f1f3f4;font-family:'Google Sans Text',Roboto,'Helvetica Neue',Arial,sans-serif\"><table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" align=\"center\" width=\"100%\" style=\"background:#000\"><tbody><tr><td align=\"center\"><table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" width=\"720\" style=\"max-width:720px;width:100%\"><tbody><tr><td align=\"center\" style=\"padding:22px 24px 0\"><img src=\"https://www.gstatic.com/gumdrop/files/play-apps-partners-io-logo-grey-transparent-w257px-h56px-2x.png\" width=\"96\" alt=\"Google I/O\" style=\"display:block;border:0;height:auto\"></td></tr><tr><td align=\"center\" style=\"padding:0 24px 38px\"><img src=\"https://services.google.com/fh/files/emails/io26_confirmation_email_asset_v004_332x332.gif\" width=\"166\" alt=\"\" style=\"display:block;border:0;height:auto\"></td></tr><tr><td align=\"center\" style=\"padding:0 24px\"><table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" width=\"580\" style=\"max-width:580px;width:100%\"><tbody><tr><td style=\"font-size:18px;line-height:27px;font-weight:400;color:#bfc2c7;text-align:left\"><p style=\"margin:0 0 20px\">Hi Hyojun,</p><p style=\"margin:0 0 20px\">Congrats! You've been selected to attend Google I/O 2026 in person. We've charged your card for the full price of ticket for which you applied and your ticket details are below. You can also view and modify your ticket details on your I/O profile at any time.</p></td></tr><tr><td style=\"padding:10px 0 28px\"><table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" width=\"100%\" style=\"border:1px solid #3c4043;border-radius:18px;background:#111314;overflow:hidden\"><tbody><tr><td colspan=\"2\" style=\"padding:22px 24px;border-bottom:1px solid #3c4043;font-family:'Google Sans',Roboto,'Helvetica Neue',Arial,sans-serif;font-size:22px;line-height:28px;color:#fff;font-weight:500\">Ticket details</td></tr><tr><td style=\"padding:18px 24px 8px;color:#9aa0a6;font-size:13px;line-height:20px;text-transform:uppercase;letter-spacing:.5px\">Attendee</td><td style=\"padding:18px 24px 8px;color:#f1f3f4;font-size:16px;line-height:24px;text-align:right\">Hyojun Kim</td></tr><tr><td style=\"padding:8px 24px;color:#9aa0a6;font-size:13px;line-height:20px;text-transform:uppercase;letter-spacing:.5px\">Company</td><td style=\"padding:8px 24px;color:#f1f3f4;font-size:16px;line-height:24px;text-align:right\">Aside</td></tr><tr><td style=\"padding:8px 24px;color:#9aa0a6;font-size:13px;line-height:20px;text-transform:uppercase;letter-spacing:.5px\">Ticket type</td><td style=\"padding:8px 24px;color:#f1f3f4;font-size:16px;line-height:24px;text-align:right\">General admission</td></tr><tr><td style=\"padding:8px 24px;color:#9aa0a6;font-size:13px;line-height:20px;text-transform:uppercase;letter-spacing:.5px\">Order number</td><td style=\"padding:8px 24px;color:#f1f3f4;font-size:16px;line-height:24px;text-align:right\">K7M2Q9ZT4X</td></tr><tr><td style=\"padding:8px 24px;color:#9aa0a6;font-size:13px;line-height:20px;text-transform:uppercase;letter-spacing:.5px\">Amount charged</td><td style=\"padding:8px 24px;color:#f1f3f4;font-size:16px;line-height:24px;text-align:right\">$1,199.00</td></tr><tr><td style=\"padding:8px 24px 22px;color:#9aa0a6;font-size:13px;line-height:20px;text-transform:uppercase;letter-spacing:.5px\">Status</td><td style=\"padding:8px 24px 22px;color:#81c995;font-size:16px;line-height:24px;text-align:right\">Confirmed</td></tr></tbody></table></td></tr><tr><td style=\"padding:0 0 30px\"><table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" width=\"100%\"><tbody><tr><td style=\"padding:20px 0;border-top:1px solid #3c4043;border-bottom:1px solid #3c4043\"><div style=\"font-family:'Google Sans',Roboto,'Helvetica Neue',Arial,sans-serif;font-size:20px;line-height:28px;color:#fff;font-weight:500;margin-bottom:12px\">Event information</div><div style=\"font-size:16px;line-height:25px;color:#bfc2c7\"><strong style=\"color:#fff\">Google I/O 2026</strong><br>May 19-20, 2026<br>Shoreline Amphitheatre, Mountain View, CA<br>Google LLC, 1600 Amphitheatre Parkway, Mountain View, CA 94043</div></td></tr></tbody></table></td></tr><tr><td align=\"center\" style=\"padding:0 0 38px\"><a href=\"https://io.google/2026/\" target=\"_blank\" style=\"display:inline-block;background:#1a73e8;color:#f1f3f4;text-decoration:none;border-radius:100px;padding:12px 24px;font-size:16px;line-height:24px;font-weight:500\">View your I/O profile</a></td></tr><tr><td align=\"center\" style=\"font-size:14px;line-height:21px;color:#bfc2c7;padding-bottom:34px\">Follow Google for Developers to stay up to date with session announcements, travel updates, and livestream details.</td></tr></tbody></table></td></tr><tr><td align=\"center\" style=\"padding:24px;color:#9aa0a6;font-size:12px;line-height:18px;border-top:1px solid #202124\">© 2026 Google LLC<br>1600 Amphitheatre Parkway, Mountain View, CA 94043<br><a href=\"https://www.google.com\" style=\"color:#8ab4f8;text-decoration:none\">www.google.com</a><br>You are receiving this email because you have expressed interest in attending Google events.</td></tr></tbody></table></td></tr></tbody></table></div>",
    date: "2026-04-29T23:54:30.000+09:00",
    labels: ["CATEGORY_UPDATES", "INBOX"],
  },
  {
    id: "fake-figma-renewal",
    sender: {
      name: "Figma",
      email: "billing@figma.com",
    },
    title: "Subscription renewal reminder May 07, 2026",
    bodyHtml:
      "<div style=\"background:#202124;color:#f1f3f4;padding:28px 24px;font-family:Arial,sans-serif\"><h1 style=\"margin:0 0 60px;color:#050505;font-size:34px\">Figma</h1><h2 style=\"text-align:center;font-size:30px;line-height:1.25;margin:0 0 48px;color:#fff\">Your subscription renews soon</h2><p style=\"font-size:22px;line-height:1.35\">Your Professional monthly subscription is renewing soon.</p><p style=\"font-size:21px;line-height:1.45\"><strong>Team at</strong><br><strong>Renewal date</strong> May 07, 2026<br><strong>Estimated amount due:</strong> $120.00</p><p style=\"font-size:21px;line-height:1.5\">This amount does not include taxes and is based on the changes made to your plan since your last monthly renewal. You can view your upcoming invoice and manage billing from your <u>Admin dashboard</u>.</p></div>",
    date: "2026-05-01T18:48:00.000+09:00",
    labels: ["INBOX", "EXTERNAL"],
    unread: true,
  },
  {
    id: "fake-rylor-outbound",
    sender: {
      name: "Emily Carter",
      email: "emily@rylorgroup.example",
    },
    title: "Jun FYI",
    bodyHtml:
      "<p>Hi Jun,</p><p>Your competitors are using AI in their outbound campaigns and closing more deals. Are you still stuck running campaigns the traditional way?</p><p>We are an AI-first email outbound company and can book you meetings with your ICP.</p><p>We do pay per meeting booked. This way you have a clear ROI.</p><p>If this is relevant, just reply 'yes' and I'll share a couple of 15-min time slots.</p><p>Best,<br>Emily Carter<br>CTO, Rylor Group</p>",
    date: "2026-05-01T17:07:00.000+09:00",
    labels: ["INBOX", "EXTERNAL"],
  },
  {
    id: "fake-bunny-payment",
    sender: {
      name: "bunny.net",
      email: "billing@bunny.net",
    },
    title: "Your payment was successful!",
    bodyHtml:
      "<p>Thank you for your payment. Your receipt is attached and your services remain active.</p>",
    date: "2026-05-01T11:50:00.000+09:00",
    labels: ["INBOX", "PURCHASES"],
  },
  {
    id: "fake-stripe-payout",
    sender: {
      name: "Stripe",
      email: "payouts@stripe.com",
    },
    title: "Your $99.16 payout for Aside",
    bodyHtml:
      "<p>It's expected to arrive on Friday. You can view payout details in your Stripe dashboard.</p>",
    date: "2026-05-01T09:56:00.000+09:00",
    labels: ["INBOX", "UPDATES"],
  },
];

function textFromHtml(html: string) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function fakeThreadId(id: string) {
  return `fake-thread-${id}`;
}

function threadIdFor(mail: FakeMailConfig) {
  return mail.threadId ?? fakeThreadId(mail.id);
}

function allThreadMessages(mail: FakeMailConfig) {
  return [mail, ...(mail.thread ?? [])];
}

function summaryFor(mail: FakeMailConfig): MailMessageSummary {
  return {
    id: mail.id,
    threadId: threadIdFor(mail),
    source: "fake",
    from: mail.sender,
    title: mail.title,
    snippet: textFromHtml(mail.bodyHtml).slice(0, 180),
    date: mail.date,
    unread: mail.unread ?? false,
    labels: mail.labels ?? [],
  };
}

function findFakeMail(id: string) {
  for (const mail of FAKE_MAILS) {
    const found = allThreadMessages(mail).find((item) => item.id === id);
    if (found) {
      return { mail: found, thread: allThreadMessages(mail) };
    }
  }
  return null;
}

function searchTextFor(mail: FakeMailConfig) {
  return allThreadMessages(mail)
    .flatMap((item) => [
      item.sender.name,
      item.sender.email,
      ...(item.to ?? []).flatMap((address) => [address.name, address.email]),
      item.title,
      textFromHtml(item.bodyHtml),
    ])
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function getFakeMailSummaries(query?: string): MailMessageSummary[] {
  const normalizedQuery = query?.trim().toLowerCase();
  return FAKE_MAILS.filter((mail) => {
    if (!normalizedQuery) {
      return true;
    }
    const searchText = searchTextFor(mail);
    return normalizedQuery.split(/\s+/).every((term) => searchText.includes(term));
  }).map(summaryFor);
}

export function getFakeMailDetail(id: string): MailMessageDetail | null {
  const found = findFakeMail(id);
  if (!found) {
    return null;
  }

  const { mail, thread } = found;
  return {
    id: mail.id,
    threadId: threadIdFor(mail),
    source: "fake",
    from: mail.sender,
    to: mail.to ?? [],
    title: mail.title,
    snippet: textFromHtml(mail.bodyHtml).slice(0, 180),
    date: mail.date,
    unread: mail.unread ?? false,
    labels: mail.labels ?? [],
    bodyHtml: mail.bodyHtml,
    bodyText: textFromHtml(mail.bodyHtml),
    thread: thread.map(summaryFor),
  };
}
