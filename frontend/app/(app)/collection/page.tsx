"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getPowders, getTags, Powder, PowderFilters, Tag } from "@/lib/api";
import Image from "next/image";
import { getImageUrl } from "@/lib/api";

export default function CollectionPage() {
  const router = useRouter();

  const [powders, setPowders] = useState<Powder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tags, setTags] = useState<Tag[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Collection browsing filters
  const [search, setSearch] = useState("");
  const [colourFamily, setColourFamily] = useState("");
  const [finish, setFinish] = useState("");
  const [intensity, setIntensity] = useState("");
  const [undertone, setUndertone] = useState("");
  const [favouritesOnly, setFavouritesOnly] = useState(false);
  const [ordering, setOrdering] = useState("-created_at");
  const [selectedTags, setSelectedTags] = useState<number[]>([]);

  useEffect(() => {
    let cancelled = false;

    // Debounce search so we don't send a request for every keystroke.
    const timeout = setTimeout(async () => {
      const token = sessionStorage.getItem("accessToken");

      if (!token) {
        router.replace("/login");
        return;
      }

      setLoading(true);
      setError("");

      const filters: PowderFilters = {
        search,
        colour_family: colourFamily,
        finish,
        intensity,
        undertone,
        is_favourite: favouritesOnly || undefined,
        ordering,
        tags: selectedTags.length > 0 ? selectedTags : undefined,
      };

      try {
        const data = await getPowders(token, filters);

        if (!cancelled) {
          setPowders(data);
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
    colourFamily,
    finish,
    intensity,
    undertone,
    favouritesOnly,
    ordering,
    selectedTags,
  ]);

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
    setColourFamily("");
    setFinish("");
    setIntensity("");
    setUndertone("");
    setFavouritesOnly(false);
    setOrdering("-created_at");
    setSelectedTags([]);
  }

  const hasActiveFilters =
    search.trim() !== "" ||
    colourFamily !== "" ||
    finish !== "" ||
    intensity !== "" ||
    undertone !== "" ||
    favouritesOnly ||
    selectedTags.length > 0;

  const activeFilterCount = [
    colourFamily,
    finish,
    intensity,
    undertone,
    favouritesOnly,
    ...selectedTags,
  ].filter(Boolean).length;

  return (
    <main className="min-h-screen bg-background px-5 py-8 md:px-8 md:py-10">
      <header className="mb-8">
        <p className="text-sm tracking-widest text-blush">
          YOUR NAIL COLLECTION
        </p>

        <h1 className="mt-2 font-serif text-3xl text-lavender">
          My Collection
        </h1>

        <p className="mt-2 text-text-secondary">
          Your shades, your style, your little colour library.
        </p>
      </header>

      {/* Collection controls */}
      <section className="mb-8 rounded-2xl border border-border bg-surface p-5 shadow-card">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-serif text-xl text-lavender">Find a shade</h2>

            <p className="mt-1 text-xs text-muted">
              Search and organise your collection.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setFiltersOpen((previous) => !previous)}
              aria-expanded={filtersOpen}
              aria-controls="collection-filters"
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
              href="/collection/new"
              className="inline-block rounded-lg bg-berry px-4 py-2 text-center text-sm font-medium text-white hover:bg-berry-dark"
            >
              + Add powder
            </Link>
          </div>
        </div>

        {filtersOpen && (
          <div id="collection-filters" className="mt-5">
            {/* Search */}
            <div className="mb-5">
              <label
                htmlFor="powder-search"
                className="mb-1 block text-sm font-medium text-text-secondary"
              >
                Search
              </label>
              <input
                id="powder-search"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by shade, brand or product code..."
                className="w-full rounded-lg border border-border-strong bg-surface-elevated px-4 py-2 text-sm text-text outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-100"
              />
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label
                  htmlFor="colour-filter"
                  className="mb-1 block text-sm font-medium text-text-secondary"
                >
                  Colour family
                </label>
                <select
                  id="colour-filter"
                  value={colourFamily}
                  onChange={(event) => setColourFamily(event.target.value)}
                  className="w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text"
                >
                  <option value="">All colours</option>
                  <option value="red">Red</option>
                  <option value="pink">Pink</option>
                  <option value="orange">Orange</option>
                  <option value="yellow">Yellow</option>
                  <option value="green">Green</option>
                  <option value="blue">Blue</option>
                  <option value="purple">Purple</option>
                  <option value="brown">Brown</option>
                  <option value="neutral">Neutral</option>
                  <option value="black">Black</option>
                  <option value="white">White</option>
                  <option value="multicolour">Multicolour</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="finish-filter"
                  className="mb-1 block text-sm font-medium text-text-secondary"
                >
                  Finish
                </label>
                <select
                  id="finish-filter"
                  value={finish}
                  onChange={(event) => setFinish(event.target.value)}
                  className="w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text"
                >
                  <option value="">All finishes</option>
                  <option value="solid">Solid</option>
                  <option value="glitter">Glitter</option>
                  <option value="shimmer">Shimmer</option>
                  <option value="chrome">Chrome</option>
                  <option value="holographic">Holographic</option>
                  <option value="flake">Flake</option>
                  <option value="thermal">Thermal</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="intensity-filter"
                  className="mb-1 block text-sm font-medium text-text-secondary"
                >
                  Intensity
                </label>
                <select
                  id="intensity-filter"
                  value={intensity}
                  onChange={(event) => setIntensity(event.target.value)}
                  className="w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text"
                >
                  <option value="">All intensities</option>
                  <option value="light">Light</option>
                  <option value="medium">Medium</option>
                  <option value="dark">Dark</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="undertone-filter"
                  className="mb-1 block text-sm font-medium text-text-secondary"
                >
                  Undertone
                </label>
                <select
                  id="undertone-filter"
                  value={undertone}
                  onChange={(event) => setUndertone(event.target.value)}
                  className="w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text"
                >
                  <option value="">All undertones</option>
                  <option value="warm">Warm</option>
                  <option value="cool">Cool</option>
                  <option value="neutral">Neutral</option>
                  <option value="unknown">Unknown</option>
                </select>
              </div>
            </div>

            {/* Tag filters */}
            <div className="mt-5 border-t border-border pt-5">
              <div className="mb-3">
                <h3 className="text-sm font-medium text-text-secondary">
                  Filter by tags
                </h3>

                <p className="mt-1 text-xs text-muted">
                  Select one or more tags. Powders matching any selected tag
                  will appear.
                </p>
              </div>

              {tags.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => {
                    const isSelected = selectedTags.includes(tag.id);

                    return (
                      <button
                        key={tag.id}
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => {
                          setSelectedTags((previous) =>
                            isSelected
                              ? previous.filter((id) => id !== tag.id)
                              : [...previous, tag.id]
                          );
                        }}
                        className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                          isSelected
                            ? "border-neon bg-neon/15 text-lavender"
                            : "border-border-strong bg-background text-text-secondary hover:border-neon/60 hover:text-lavender"
                        }`}
                      >
                        {tag.name}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-muted">
                  No tags available yet. Create tags when adding or editing a
                  powder.
                </p>
              )}

              {selectedTags.length > 0 && (
                <p className="mt-3 text-xs text-lavender">
                  {selectedTags.length}{" "}
                  {selectedTags.length === 1 ? "tag" : "tags"} selected ·
                  Matching any selected tag
                </p>
              )}
            </div>

            {/* Sorting and favourites */}
            <div className="mt-5 flex flex-col gap-4 border-t border-[#F0E5E9] pt-4 sm:flex-row sm:items-center sm:justify-between">
              <label className="flex items-center gap-2 text-sm text-text-secondary">
                <input
                  type="checkbox"
                  checked={favouritesOnly}
                  onChange={(event) => setFavouritesOnly(event.target.checked)}
                  className="h-4 w-4 accent-rose-600"
                />
                Show favourites only
              </label>

              <div className="flex items-center gap-2">
                <label
                  htmlFor="sort-powders"
                  className="whitespace-nowrap text-sm text-muted"
                >
                  Sort by
                </label>
                <select
                  id="sort-powders"
                  value={ordering}
                  onChange={(event) => setOrdering(event.target.value)}
                  className="rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text"
                >
                  <option value="-created_at">Recently added</option>
                  <option value="created_at">Oldest added</option>
                  <option value="name">Name (A–Z)</option>
                  <option value="-name">Name (Z–A)</option>
                  <option value="brand">Brand (A–Z)</option>
                  <option value="-brand">Brand (Z–A)</option>
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

      {/* Collection results */}
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted">
          {powders.length} {powders.length === 1 ? "shade" : "shades"}
          {hasActiveFilters ? " found" : " in your collection"}
        </p>

        {loading && (
          <p className="text-xs text-muted">Updating collection...</p>
        )}
      </div>

      {error ? (
        <p className="rounded-xl border border-danger/30 bg-surface p-4 text-sm text-danger">
          {error}
        </p>
      ) : powders.length === 0 && !loading ? (
        <section className="rounded-2xl border border-dashed border-border-strong bg-surface p-10 text-center">
          <h2 className="text-xl font-serif text-lavender">
            {hasActiveFilters
              ? "No shades found"
              : "Your collection starts here"}
          </h2>

          <p className="mt-2 text-sm text-muted">
            {hasActiveFilters
              ? "Try changing your search or filters."
              : "Add your first powder and start organising your shades."}
          </p>

          {hasActiveFilters ? (
            <button
              type="button"
              onClick={clearFilters}
              className="mt-5 rounded-lg border border-border-strong px-4 py-2 text-sm font-medium text-lavender hover:bg-[#FBF3F6]"
            >
              Clear filters
            </button>
          ) : (
            <Link
              href="/collection/new"
              className="mt-5 inline-block rounded-lg bg-berry px-4 py-2 text-sm font-medium text-white hover:bg-berry-dark"
            >
              + Add powder
            </Link>
          )}
        </section>
      ) : (
        <section className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {powders.map((powder) => (
            <Link
              key={powder.id}
              href={`/collection/${powder.id}`}
              aria-label={`View ${powder.name} details`}
              className="group overflow-hidden rounded-2xl border border-border bg-surface shadow-card transition-all duration-200 hover:-translate-y-1 hover:border-border-strong hover:shadow-hover"
            >
              <article>
                <div className="relative aspect-square overflow-hidden bg-[#514B54]">
                  {powder.primary_photo ? (
                    <Image
                      src={getImageUrl(powder.primary_photo)}
                      alt={`${powder.name} product photo`}
                      fill
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                      unoptimized
                      className="transition-transform duration-300 group-hover:scale-105 object-contain"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <span className="text-sm text-[#BDB5C1]">No picture</span>
                    </div>
                  )}
                </div>

                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="font-medium text-text">{powder.name}</h2>

                    {powder.is_favourite && (
                      <span className="shrink-0 text-sm text-blush">♥</span>
                    )}
                  </div>

                  <p className="mt-1 text-sm text-text-secondary">
                    {powder.brand || "Brand not specified"}
                  </p>

                  <p className="mt-2 text-xs capitalize text-muted">
                    {powder.finish} · {powder.colour_family}
                  </p>

                  {powder.tags && powder.tags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {tags
                        .filter((tag) => powder.tags.includes(tag.id))
                        .map((tag) => (
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
          ))}
        </section>
      )}
    </main>
  );
}
