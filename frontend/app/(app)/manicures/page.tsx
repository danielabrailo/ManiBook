"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

import {
  getManicures,
  getTags,
  getImageUrl,
  Manicure,
  ManicureFilters,
  Tag,
} from "@/lib/api";

export default function ManicuresPage() {
  const router = useRouter();

  const [manicures, setManicures] = useState<Manicure[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Browsing filters
  const [search, setSearch] = useState("");
  const [nailShape, setNailShape] = useState("");
  const [technique, setTechnique] = useState("");
  const [nailLength, setNailLength] = useState("");
  const [rating, setRating] = useState("");
  const [ordering, setOrdering] = useState("-completed_at");
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);

  // Load manicures whenever filters change.
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

      const filters: ManicureFilters = {
        search,
        nail_shape: nailShape,
        technique,
        nail_length: nailLength,
        rating: rating ? Number(rating) : undefined,
        ordering,
        tags: selectedTagIds,
      };

      try {
        const data = await getManicures(token, filters);

        if (!cancelled) {
          setManicures(data);
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
    nailShape,
    technique,
    nailLength,
    rating,
    ordering,
    selectedTagIds,
  ]);

  // Load tags once, separately from the manicure list.
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
    setNailShape("");
    setTechnique("");
    setNailLength("");
    setRating("");
    setOrdering("-completed_at");
    setSelectedTagIds([]);
  }

  function toggleTag(tagId: number) {
    setSelectedTagIds((previous) =>
      previous.includes(tagId)
        ? previous.filter((id) => id !== tagId)
        : [...previous, tagId]
    );
  }

  const hasActiveFilters =
    search.trim() !== "" ||
    nailShape !== "" ||
    technique !== "" ||
    nailLength !== "" ||
    rating !== "" ||
    selectedTagIds.length > 0;

  const activeFilterCount =
    [nailShape, technique, nailLength, rating].filter(Boolean).length +
    (selectedTagIds.length > 0 ? 1 : 0);

  function formatDate(date: string) {
    // Avoid timezone shifts when parsing a date-only value.
    return new Intl.DateTimeFormat("en-CA", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(new Date(`${date}T12:00:00`));
  }

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
          YOUR MANICURE JOURNAL
        </p>

        <h1 className="mt-2 font-serif text-3xl text-lavender">My Manicures</h1>

        <p className="mt-2 text-text-secondary">
          A little archive of your favourite nail moments.
        </p>
      </header>

      {/* Collection controls */}
      <section className="mb-8 rounded-2xl border border-border bg-surface p-5 shadow-card">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-serif text-xl text-lavender">
              Browse your manicures
            </h2>

            <p className="mt-1 text-xs text-muted">
              Find and revisit your previous sets.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setFiltersOpen((previous) => !previous)}
              aria-expanded={filtersOpen}
              aria-controls="manicure-filters"
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
              href="/manicures/new"
              className="inline-block rounded-lg bg-berry px-4 py-2 text-center text-sm font-medium text-white hover:bg-berry-dark"
            >
              + Add manicure
            </Link>
          </div>
        </div>

        {/* Filters */}
        {filtersOpen && (
          <div id="manicure-filters" className="mt-5">
            {/* Search */}
            <div className="mb-5">
              <label
                htmlFor="manicure-search"
                className="mb-1 block text-sm font-medium text-text-secondary"
              >
                Search
              </label>

              <input
                id="manicure-search"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by title or notes..."
                className="w-full rounded-lg border border-border-strong bg-surface-elevated px-4 py-2 text-sm text-text outline-none focus:border-neon focus:ring-2 focus:ring-neon/20"
              />
            </div>

            {/* Filter fields */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label
                  htmlFor="shape-filter"
                  className="mb-1 block text-sm font-medium text-text-secondary"
                >
                  Nail shape
                </label>

                <select
                  id="shape-filter"
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

              <div>
                <label
                  htmlFor="technique-filter"
                  className="mb-1 block text-sm font-medium text-text-secondary"
                >
                  Technique
                </label>

                <select
                  id="technique-filter"
                  value={technique}
                  onChange={(event) => setTechnique(event.target.value)}
                  className="w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text"
                >
                  <option value="">All techniques</option>
                  <option value="solid">Solid</option>
                  <option value="french">French</option>
                  <option value="ombre">Ombré</option>
                  <option value="nail_art">Nail art</option>
                  <option value="mixed">Mixed</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="length-filter"
                  className="mb-1 block text-sm font-medium text-text-secondary"
                >
                  Nail length
                </label>

                <select
                  id="length-filter"
                  value={nailLength}
                  onChange={(event) => setNailLength(event.target.value)}
                  className="w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text"
                >
                  <option value="">All lengths</option>
                  <option value="extra_short">Extra short</option>
                  <option value="short">Short</option>
                  <option value="medium">Medium</option>
                  <option value="long">Long</option>
                  <option value="extra_long">Extra long</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="rating-filter"
                  className="mb-1 block text-sm font-medium text-text-secondary"
                >
                  Rating
                </label>

                <select
                  id="rating-filter"
                  value={rating}
                  onChange={(event) => setRating(event.target.value)}
                  className="w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text"
                >
                  <option value="">Any rating</option>
                  {Array.from({ length: 10 }, (_, index) => 10 - index).map(
                    (value) => (
                      <option key={value} value={value}>
                        {value}/10
                      </option>
                    )
                  )}
                </select>
              </div>
            </div>

            {/* Tag filters */}
            {tags.length > 0 && (
              <div className="mt-5">
                <p className="mb-2 text-sm font-medium text-text-secondary">
                  Filter by tags
                </p>

                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => {
                    const isSelected = selectedTagIds.includes(tag.id);

                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => toggleTag(tag.id)}
                        aria-pressed={isSelected}
                        className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                          isSelected
                            ? "border-neon bg-neon/20 text-lavender"
                            : "border-border-strong bg-background text-text-secondary hover:border-neon hover:text-lavender"
                        }`}
                      >
                        {tag.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Sorting */}
            <div className="mt-5 flex flex-col gap-4 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted">
                Filter your journal by the details of each manicure.
              </p>

              <div className="flex items-center gap-2">
                <label
                  htmlFor="sort-manicures"
                  className="whitespace-nowrap text-sm text-muted"
                >
                  Sort by
                </label>

                <select
                  id="sort-manicures"
                  value={ordering}
                  onChange={(event) => setOrdering(event.target.value)}
                  className="rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text"
                >
                  <option value="-completed_at">Newest application</option>
                  <option value="completed_at">Oldest application</option>
                  <option value="-created_at">Recently added</option>
                  <option value="created_at">Oldest added</option>
                  <option value="-rating">Highest rated</option>
                  <option value="rating">Lowest rated</option>
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
          {manicures.length} {manicures.length === 1 ? "manicure" : "manicures"}
          {hasActiveFilters ? " found" : " in your journal"}
        </p>

        {loading && <p className="text-xs text-muted">Updating journal...</p>}
      </div>

      {/* Results */}
      {error ? (
        <p className="rounded-xl border border-danger/30 bg-surface p-4 text-sm text-danger">
          {error}
        </p>
      ) : manicures.length === 0 && !loading ? (
        <section className="rounded-2xl border border-dashed border-border-strong bg-surface p-10 text-center">
          <h2 className="font-serif text-xl text-lavender">
            {hasActiveFilters
              ? "No manicures found"
              : "Your journal starts here"}
          </h2>

          <p className="mt-2 text-sm text-muted">
            {hasActiveFilters
              ? "Try changing your search or filters."
              : "Save your first manicure and start building your nail journal."}
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
              href="/manicures/new"
              className="mt-5 inline-block rounded-lg bg-berry px-4 py-2 text-sm font-medium text-white hover:bg-berry-dark"
            >
              + Add manicure
            </Link>
          )}
        </section>
      ) : (
        <section className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {manicures.map((manicure) => {
            const manicureTags = tags.filter((tag) =>
              manicure.tags.includes(tag.id)
            );

            return (
              <Link
                key={manicure.id}
                href={`/manicures/${manicure.id}`}
                aria-label={`View ${manicure.title} details`}
                className="group overflow-hidden rounded-2xl border border-border bg-surface shadow-card transition-all duration-200 hover:-translate-y-1 hover:border-border-strong hover:shadow-hover"
              >
                <article>
                  {/* Manicure photo */}
                  <div className="relative aspect-[4/5] overflow-hidden bg-[#514B54]">
                    {manicure.primary_photo ? (
                      <Image
                        src={getImageUrl(manicure.primary_photo)}
                        alt={`${manicure.title} manicure`}
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

                  {/* Manicure information */}
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <h2 className="line-clamp-2 font-medium text-text">
                        {manicure.title}
                      </h2>

                      {manicure.rating !== null && (
                        <span className="shrink-0 text-xs font-medium text-lavender">
                          ★ {manicure.rating}/10
                        </span>
                      )}
                    </div>

                    <p className="mt-1 text-xs text-text-secondary">
                      {formatDate(manicure.completed_at)}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <span className="rounded-full border border-border-strong bg-background px-2.5 py-1 text-[10px] font-medium text-lavender">
                        {formatChoice(manicure.nail_shape)}
                      </span>

                      <span className="rounded-full border border-border-strong bg-background px-2.5 py-1 text-[10px] font-medium text-text-secondary">
                        {formatChoice(manicure.technique)}
                      </span>
                    </div>

                    {manicureTags.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {manicureTags.map((tag) => (
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
