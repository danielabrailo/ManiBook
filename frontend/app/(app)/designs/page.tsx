"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

import {
  getDesigns,
  getTags,
  getImageUrl,
  Design,
  DesignFilters,
  Tag,
} from "@/lib/api";

export default function DesignsPage() {
  const router = useRouter();

  const [designs, setDesigns] = useState<Design[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Browsing filters
  const [search, setSearch] = useState("");
  const [source, setSource] = useState("");
  const [status, setStatus] = useState("");
  const [style, setStyle] = useState("");
  const [nailShape, setNailShape] = useState("");
  const [ordering, setOrdering] = useState("-updated_at");
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);

  // Load designs whenever filters change.
  useEffect(() => {
    let cancelled = false;

    const timeout = setTimeout(async () => {
      const token = sessionStorage.getItem("accessToken");

      if (!token) {
        router.replace("/login");
        return;
      }

      setLoading(true);
      setError("");

      const filters: DesignFilters = {
        search,
        source,
        status,
        style,
        nail_shape: nailShape,
        ordering,
        tags: selectedTagIds,
      };

      try {
        const data = await getDesigns(token, filters);

        if (!cancelled) {
          setDesigns(data);
        }
      } catch (err) {
        if (!cancelled) {
          const message =
            err instanceof Error ? err.message : "Something went wrong.";

          setError(message);

          if (message.includes("session has expired")) {
            sessionStorage.removeItem("accessToken");
            sessionStorage.removeItem("refreshToken");
            router.replace("/login");
          }
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [
    router,
    search,
    source,
    status,
    style,
    nailShape,
    ordering,
    selectedTagIds,
  ]);

  // Load tags separately from the design list.
  useEffect(() => {
    let cancelled = false;

    async function loadTags() {
      const token = sessionStorage.getItem("accessToken");

      if (!token) {
        router.replace("/login");
        return;
      }

      try {
        const data = await getTags(token);

        if (!cancelled) {
          setTags(data);
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Could not load tags:", err);
          setTags([]);
        }
      }
    }

    loadTags();

    return () => {
      cancelled = true;
    };
  }, [router]);

  function clearFilters() {
    setSearch("");
    setSource("");
    setStatus("");
    setStyle("");
    setNailShape("");
    setSelectedTagIds([]);
    setOrdering("-updated_at");
  }

  const hasActiveFilters =
    search.trim() !== "" ||
    source !== "" ||
    status !== "" ||
    style !== "" ||
    nailShape !== "" ||
    selectedTagIds.length > 0;

  const activeFilterCount =
    [source, status, style, nailShape].filter(Boolean).length +
    (selectedTagIds.length > 0 ? 1 : 0);

  function formatChoice(value: string) {
    return value
      .replaceAll("_", " ")
      .replace(/\b\w/g, (character) => character.toUpperCase());
  }

  return (
    <main className="min-h-screen bg-background px-5 py-8 md:px-8 md:py-10">
      {/* Page heading */}
      <header className="mb-8">
        <p className="text-sm tracking-widest text-blush">
          YOUR NAIL DESIGN LIBRARY
        </p>

        <h1 className="mt-2 font-serif text-3xl text-lavender">My Designs</h1>

        <p className="mt-2 text-text-secondary">
          Collect inspiration, plan your next set, and keep your favourite
          designs in one place.
        </p>
      </header>

      {/* Collection controls */}
      <section className="mb-8 rounded-2xl border border-border bg-surface p-5 shadow-card">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-serif text-xl text-lavender">
              Browse your designs
            </h2>

            <p className="mt-1 text-xs text-muted">
              Find and organise your nail inspiration.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setFiltersOpen((previous) => !previous)}
              aria-expanded={filtersOpen}
              aria-controls="design-filters"
              className="inline-flex items-center gap-2 rounded-lg border border-border-strong px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:border-neon hover:text-lavender"
            >
              <span>Filters</span>

              {activeFilterCount > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-neon/20 px-1.5 text-[10px] font-semibold text-lavender">
                  {activeFilterCount}
                </span>
              )}

              <svg
                className={`h-4 w-4 transition-transform duration-200 ${
                  filtersOpen ? "rotate-180" : ""
                }`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m6 9 6 6 6-6"
                />
              </svg>
            </button>

            <Link
              href="/designs/generate"
              className="inline-flex items-center gap-2 rounded-lg border border-neon bg-neon/10 px-4 py-2 text-center text-sm font-medium text-lavender transition hover:bg-neon/20"
            >
              <span aria-hidden="true">✧</span>
              Generate with AI
            </Link>
            <Link
              href="/designs/new"
              className="inline-block rounded-lg bg-berry px-4 py-2 text-center text-sm font-medium text-white hover:bg-berry-dark"
            >
              + Add design
            </Link>
          </div>
        </div>

        {/* Filters */}
        {filtersOpen && (
          <div id="design-filters" className="mt-5">
            {/* Search */}
            <div className="mb-5">
              <label
                htmlFor="design-search"
                className="mb-1 block text-sm font-medium text-text-secondary"
              >
                Search
              </label>

              <input
                id="design-search"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by title, style or instructions..."
                className="w-full rounded-lg border border-border-strong bg-surface-elevated px-4 py-2 text-sm text-text outline-none focus:border-neon focus:ring-2 focus:ring-neon/20"
              />
            </div>

            {/* Filter fields */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label
                  htmlFor="design-status-filter"
                  className="mb-1 block text-sm font-medium text-text-secondary"
                >
                  Status
                </label>

                <select
                  id="design-status-filter"
                  value={status}
                  onChange={(event) => setStatus(event.target.value)}
                  className="w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text"
                >
                  <option value="">All statuses</option>
                  <option value="idea">Idea</option>
                  <option value="planned">Planned</option>
                  <option value="tried">Tried</option>
                  <option value="archived">Archived</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="design-source-filter"
                  className="mb-1 block text-sm font-medium text-text-secondary"
                >
                  Source
                </label>

                <select
                  id="design-source-filter"
                  value={source}
                  onChange={(event) => setSource(event.target.value)}
                  className="w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text"
                >
                  <option value="">All sources</option>
                  <option value="manual">Manual</option>
                  <option value="ai">AI generated</option>
                  <option value="inspiration">Inspiration</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="design-style-filter"
                  className="mb-1 block text-sm font-medium text-text-secondary"
                >
                  Style
                </label>

                <input
                  id="design-style-filter"
                  type="text"
                  value={style}
                  onChange={(event) => setStyle(event.target.value)}
                  placeholder="e.g. Minimalist"
                  className="w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text outline-none focus:border-neon focus:ring-2 focus:ring-neon/20"
                />
              </div>

              <div>
                <label
                  htmlFor="design-shape-filter"
                  className="mb-1 block text-sm font-medium text-text-secondary"
                >
                  Nail shape
                </label>

                <select
                  id="design-shape-filter"
                  value={nailShape}
                  onChange={(event) => setNailShape(event.target.value)}
                  className="w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text"
                >
                  <option value="">All shapes</option>
                  <option value="almond">Almond</option>
                  <option value="oval">Oval</option>
                  <option value="square">Square</option>
                  <option value="coffin">Coffin</option>
                  <option value="stiletto">Stiletto</option>
                  <option value="round">Round</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            {/* Tag filters */}
            <div className="mt-5">
              <p className="mb-2 text-sm font-medium text-text-secondary">
                Tags
              </p>

              {tags.length > 0 ? (
                <>
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag) => {
                      const isSelected = selectedTagIds.includes(tag.id);

                      return (
                        <button
                          key={tag.id}
                          type="button"
                          aria-pressed={isSelected}
                          onClick={() => {
                            setSelectedTagIds((previous) =>
                              isSelected
                                ? previous.filter((id) => id !== tag.id)
                                : [...previous, tag.id]
                            );
                          }}
                          className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                            isSelected
                              ? "border-neon bg-neon/20 text-lavender"
                              : "border-border-strong bg-surface-elevated text-text-secondary hover:border-neon hover:text-lavender"
                          }`}
                        >
                          {tag.name}
                        </button>
                      );
                    })}
                  </div>

                  <p className="mt-2 text-xs text-muted">
                    Show designs matching any selected tag.
                  </p>
                </>
              ) : (
                <p className="text-xs text-muted">
                  Create tags in your collection to organise designs.
                </p>
              )}
            </div>

            {/* Sorting */}
            <div className="mt-5 flex flex-col gap-4 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted">
                Organise your designs by status, source, and style.
              </p>

              <div className="flex items-center gap-2">
                <label
                  htmlFor="sort-designs"
                  className="whitespace-nowrap text-sm text-muted"
                >
                  Sort by
                </label>

                <select
                  id="sort-designs"
                  value={ordering}
                  onChange={(event) => setOrdering(event.target.value)}
                  className="rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text"
                >
                  <option value="-updated_at">Recently updated</option>
                  <option value="updated_at">Least recently updated</option>
                  <option value="-created_at">Recently added</option>
                  <option value="created_at">Oldest added</option>
                  <option value="title">Title (A–Z)</option>
                  <option value="-title">Title (Z–A)</option>
                </select>
              </div>
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="mt-4 text-sm font-medium text-blush hover:text-lavender"
              >
                Clear filters
              </button>
            )}
          </div>
        )}
      </section>

      {/* Results count */}
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted">
          {designs.length} {designs.length === 1 ? "design" : "designs"}
          {hasActiveFilters ? " found" : " in your library"}
        </p>

        {loading && <p className="text-xs text-muted">Updating designs...</p>}
      </div>

      {/* Results */}
      {error ? (
        <p className="rounded-xl border border-danger/30 bg-surface p-4 text-sm text-danger">
          {error}
        </p>
      ) : designs.length === 0 && !loading ? (
        <section className="rounded-2xl border border-dashed border-border-strong bg-surface p-10 text-center">
          <h2 className="font-serif text-xl text-lavender">
            {hasActiveFilters
              ? "No designs found"
              : "Your design library starts here"}
          </h2>

          <p className="mt-2 text-sm text-muted">
            {hasActiveFilters
              ? "Try changing your search or filters."
              : "Save your first nail design and start collecting ideas for your next manicure."}
          </p>

          {hasActiveFilters ? (
            <button
              type="button"
              onClick={clearFilters}
              className="mt-5 rounded-lg border border-border-strong px-4 py-2 text-sm font-medium text-lavender hover:border-neon"
            >
              Clear filters
            </button>
          ) : (
            <Link
              href="/designs/new"
              className="mt-5 inline-block rounded-lg bg-berry px-4 py-2 text-sm font-medium text-white hover:bg-berry-dark"
            >
              + Add your first design
            </Link>
          )}
        </section>
      ) : (
        <section className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {designs.map((design) => {
            const designTags = tags.filter((tag) =>
              design.tags.includes(tag.id)
            );

            return (
              <Link
                key={design.id}
                href={`/designs/${design.id}`}
                aria-label={`View ${design.title} details`}
                className="group overflow-hidden rounded-2xl border border-border bg-surface shadow-card transition-all duration-200 hover:-translate-y-1 hover:border-border-strong hover:shadow-hover"
              >
                <article>
                  {/* Design photo */}
                  <div className="relative aspect-[4/5] overflow-hidden bg-[#514B54]">
                    {design.primary_photo ? (
                      <Image
                        src={getImageUrl(design.primary_photo)}
                        alt={`${design.title} design`}
                        fill
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                        unoptimized
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <span className="text-sm text-[#BDB5C1]">
                          No picture
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Design information */}
                  <div className="p-4">
                    <h2 className="line-clamp-2 font-medium text-text">
                      {design.title}
                    </h2>

                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <span className="rounded-full border border-border-strong bg-background px-2.5 py-1 text-[10px] font-medium text-lavender">
                        {formatChoice(design.status)}
                      </span>

                      <span className="rounded-full border border-border-strong bg-background px-2.5 py-1 text-[10px] font-medium text-text-secondary">
                        {formatChoice(design.source)}
                      </span>
                    </div>

                    {(design.style || design.nail_shape) && (
                      <p className="mt-3 text-xs text-text-secondary">
                        {[
                          design.style,
                          design.nail_shape && formatChoice(design.nail_shape),
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    )}

                    <p className="mt-2 text-xs text-muted">
                      {design.powders.length}{" "}
                      {design.powders.length === 1 ? "powder" : "powders"}
                    </p>

                    {designTags.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {designTags.map((tag) => (
                          <span
                            key={tag.id}
                            className="rounded-full border border-border-strong bg-background px-2.5 py-1 text-[10px] font-medium text-lavender"
                          >
                            {tag.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </article>
              </Link>
            );
          })}
        </section>
      )}
    </main>
  );
}
