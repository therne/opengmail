"use client";

import type { ReactNode } from "react";

export type AvatarIdentity = {
  avatarUrl?: string;
  email?: string;
  name?: string;
};

function displayName(identity: AvatarIdentity) {
  return identity.name || identity.email || "";
}

function initials(identity: AvatarIdentity) {
  return displayName(identity)
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 1)
    .toUpperCase();
}

function avatarColor(identity: AvatarIdentity) {
  const palette = ["#8e43e7", "#5b7ff5", "#5f6368", "#f28b82", "#5fb96d"];
  const seed = displayName(identity)
    .split("")
    .reduce((total, letter) => total + letter.charCodeAt(0), 0);
  return palette[seed % palette.length];
}

function prefersGenericAvatar(identity: AvatarIdentity) {
  const value = `${identity.name ?? ""} ${identity.email ?? ""}`.toLowerCase();
  return (
    value.includes("bunny.net") ||
    value.includes("namecheap") ||
    value.includes("lumos") ||
    value.includes("루모스")
  );
}

function GenericPersonAvatar({ size }: { size: string }) {
  return (
    <div className={`${size} grid place-items-center rounded-full bg-[#6f747a]`}>
      <svg
        aria-hidden
        className="h-[72%] w-[72%] text-[#a5aaaf]"
        viewBox="0 0 48 48"
      >
        <circle cx="24" cy="17" r="7.5" fill="currentColor" opacity="0.9" />
        <path
          d="M9.5 40c2.4-7.4 8-11.2 14.5-11.2S36.1 32.6 38.5 40c-3.6 3-8.5 4.6-14.5 4.6S13.1 43 9.5 40Z"
          fill="currentColor"
        />
      </svg>
    </div>
  );
}

export function MailAvatar({
  fallback,
  identity,
  size = "h-10 w-10",
}: {
  fallback?: ReactNode;
  identity?: AvatarIdentity | null;
  size?: string;
}) {
  if (!identity) {
    return fallback ?? null;
  }

  if (identity.avatarUrl) {
    return (
      <div className={`${size} overflow-hidden rounded-full bg-neutral-900`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={identity.avatarUrl}
          alt=""
          className="h-full w-full object-cover"
        />
      </div>
    );
  }

  if (prefersGenericAvatar(identity)) {
    return <GenericPersonAvatar size={size} />;
  }

  return (
    <div
      className={`${size} grid place-items-center rounded-full font-google-sans text-lg font-medium text-white`}
      style={{ background: avatarColor(identity) }}
    >
      {initials(identity) || fallback}
    </div>
  );
}
