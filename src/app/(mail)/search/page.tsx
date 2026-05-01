import { Suspense } from "react";
import { SearchRoute } from "@/components/gmail-clone";

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="grid h-full place-items-center bg-[var(--bg)] text-[var(--text-muted)]">
          <md-circular-progress indeterminate />
        </div>
      }
    >
      <SearchRoute />
    </Suspense>
  );
}
