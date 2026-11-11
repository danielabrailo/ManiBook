"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();

  const isCollectionActive =
    pathname === "/collection" || pathname.startsWith("/collection/");

  const isManicuresActive =
    pathname === "/manicures" || pathname.startsWith("/manicures/");

  function handleLogout() {
    sessionStorage.removeItem("accessToken");
    sessionStorage.removeItem("refreshToken");
    router.replace("/login");
  }

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between md:px-8">
        {/* Brand */}
        <Link
          href="/collection"
          className="w-fit text-xl font-semibold tracking-tight text-lavender transition-colors hover:text-blush"
        >
          ManiBook
          <span className="ml-1 text-berry">.</span>
        </Link>

        {/* Navigation links */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <Link
            href="/collection"
            aria-current={isCollectionActive ? "page" : undefined}
            className={`text-sm font-medium transition-colors ${
              isCollectionActive
                ? "text-blush"
                : "text-text-secondary hover:text-text"
            }`}
          >
            Collection
          </Link>

          <Link
            href="/manicures"
            aria-current={isManicuresActive ? "page" : undefined}
            className={`text-sm font-medium transition-colors ${
              isManicuresActive
                ? "text-blush"
                : "text-text-secondary hover:text-text"
            }`}
          >
            Manicures
          </Link>

          <span
            aria-disabled="true"
            title="Coming soon"
            className="cursor-not-allowed text-sm text-muted"
          >
            Design ideas
            <span className="ml-1.5 text-xs text-muted/70">Soon</span>
          </span>

          <button
            type="button"
            onClick={handleLogout}
            className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-text-secondary transition-colors hover:border-border-strong hover:bg-surface-hover hover:text-text"
          >
            Log out
          </button>
        </div>
      </div>
    </nav>
  );
}
