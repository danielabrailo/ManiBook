"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getPowders, Powder, PowderFilters } from "@/lib/api";

export default function CollectionPage() {
  const router = useRouter();

  const [powders, setPowders] = useState<Powder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Collection browsing filters
  const [search, setSearch] = useState("");
  const [colourFamily, setColourFamily] = useState("");
  const [finish, setFinish] = useState("");
  const [intensity, setIntensity] = useState("");
  const [undertone, setUndertone] = useState("");
  const [favouritesOnly, setFavouritesOnly] = useState(false);
  const [ordering, setOrdering] = useState("-created_at");

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
  ]);

  function clearFilters() {
    setSearch("");
    setColourFamily("");
    setFinish("");
    setIntensity("");
    setUndertone("");
    setFavouritesOnly(false);
    setOrdering("-created_at");
  }

  const hasActiveFilters =
    search.trim() !== "" ||
    colourFamily !== "" ||
    finish !== "" ||
    intensity !== "" ||
    undertone !== "" ||
    favouritesOnly;

  return (
    <main className="min-h-screen bg-[#FBF8F3] p-6 md:p-10">
      <header className="mb-8">
        <p className="text-sm tracking-widest text-[#783B52]">MANIBOOK</p>

        <h1 className="mt-2 text-3xl font-serif text-[#783B52]">
          My Collection
        </h1>

        <p className="mt-2 text-[#8C7C82]">
          Your shades, your style, your little colour library.
        </p>
      </header>

      {/* Collection controls */}
      <section className="mb-8 rounded-2xl border border-[#EADDE1] bg-white p-5">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-serif text-xl text-[#783B52]">Find a shade</h2>

          <Link
            href="/collection/new"
            className="inline-block rounded-lg bg-rose-600 px-4 py-2 text-center text-sm font-medium text-white hover:bg-rose-700"
          >
            + Add powder
          </Link>
        </div>

        {/* Search */}
        <div className="mb-5">
          <label
            htmlFor="powder-search"
            className="mb-1 block text-sm font-medium text-[#382A30]"
          >
            Search
          </label>
          <input
            id="powder-search"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by shade, brand or product code..."
            className="w-full rounded-lg border border-[#D8B8C4] bg-[#FFFCFA] px-4 py-2 text-sm text-[#382A30] outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-100"
          />
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label
              htmlFor="colour-filter"
              className="mb-1 block text-sm font-medium text-[#382A30]"
            >
              Colour family
            </label>
            <select
              id="colour-filter"
              value={colourFamily}
              onChange={(event) => setColourFamily(event.target.value)}
              className="w-full rounded-lg border border-[#D8B8C4] bg-white px-3 py-2 text-sm text-[#382A30]"
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
              className="mb-1 block text-sm font-medium text-[#382A30]"
            >
              Finish
            </label>
            <select
              id="finish-filter"
              value={finish}
              onChange={(event) => setFinish(event.target.value)}
              className="w-full rounded-lg border border-[#D8B8C4] bg-white px-3 py-2 text-sm text-[#382A30]"
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
              className="mb-1 block text-sm font-medium text-[#382A30]"
            >
              Intensity
            </label>
            <select
              id="intensity-filter"
              value={intensity}
              onChange={(event) => setIntensity(event.target.value)}
              className="w-full rounded-lg border border-[#D8B8C4] bg-white px-3 py-2 text-sm text-[#382A30]"
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
              className="mb-1 block text-sm font-medium text-[#382A30]"
            >
              Undertone
            </label>
            <select
              id="undertone-filter"
              value={undertone}
              onChange={(event) => setUndertone(event.target.value)}
              className="w-full rounded-lg border border-[#D8B8C4] bg-white px-3 py-2 text-sm text-[#382A30]"
            >
              <option value="">All undertones</option>
              <option value="warm">Warm</option>
              <option value="cool">Cool</option>
              <option value="neutral">Neutral</option>
              <option value="unknown">Unknown</option>
            </select>
          </div>
        </div>

        {/* Sorting and favourites */}
        <div className="mt-5 flex flex-col gap-4 border-t border-[#F0E5E9] pt-4 sm:flex-row sm:items-center sm:justify-between">
          <label className="flex items-center gap-2 text-sm text-[#783B52]">
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
              className="whitespace-nowrap text-sm text-[#8C7C82]"
            >
              Sort by
            </label>
            <select
              id="sort-powders"
              value={ordering}
              onChange={(event) => setOrdering(event.target.value)}
              className="rounded-lg border border-[#D8B8C4] bg-white px-3 py-2 text-sm text-[#382A30]"
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
            className="mt-4 text-sm font-medium text-rose-600 hover:text-rose-800"
          >
            Clear filters
          </button>
        )}
      </section>

      {/* Collection results */}
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-[#8C7C82]">
          {powders.length} {powders.length === 1 ? "shade" : "shades"}
          {hasActiveFilters ? " found" : " in your collection"}
        </p>

        {loading && (
          <p className="text-xs text-[#8C7C82]">Updating collection...</p>
        )}
      </div>

      {error ? (
        <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>
      ) : powders.length === 0 && !loading ? (
        <section className="rounded-2xl border border-dashed border-[#D8B8C4] bg-white p-10 text-center">
          <h2 className="text-xl font-serif text-[#783B52]">
            {hasActiveFilters
              ? "No shades found"
              : "Your collection starts here"}
          </h2>

          <p className="mt-2 text-sm text-[#8C7C82]">
            {hasActiveFilters
              ? "Try changing your search or filters."
              : "Add your first powder and start organising your shades."}
          </p>

          {hasActiveFilters ? (
            <button
              type="button"
              onClick={clearFilters}
              className="mt-5 rounded-lg border border-[#D8B8C4] px-4 py-2 text-sm font-medium text-[#783B52] hover:bg-[#FBF3F6]"
            >
              Clear filters
            </button>
          ) : (
            <Link
              href="/collection/new"
              className="mt-5 inline-block rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700"
            >
              + Add powder
            </Link>
          )}
        </section>
      ) : (
        <section className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {powders.map((powder) => (
            <article
              key={powder.id}
              className="overflow-hidden rounded-2xl border border-[#EADDE1] bg-white shadow-sm"
            >
              <div
                className="aspect-square"
                style={{
                  backgroundColor: powder.hex_colour || "#F8EEF1",
                }}
                aria-label={`Colour swatch for ${powder.name}`}
              />

              <div className="p-4">
                <h2 className="font-medium text-[#382A30]">{powder.name}</h2>

                <p className="mt-1 text-sm text-[#8C7C82]">
                  {powder.brand || "Brand not specified"}
                </p>

                <p className="mt-2 text-xs capitalize text-[#783B52]">
                  {powder.finish} · {powder.colour_family}
                </p>

                {powder.is_favourite && (
                  <span className="mt-2 inline-block text-sm text-[#783B52]">
                    ♥ Favourite
                  </span>
                )}

                <Link
                  href={`/collection/${powder.id}`}
                  className="mt-3 inline-block text-sm font-medium text-rose-600 hover:text-rose-800"
                >
                  View details →
                </Link>
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
