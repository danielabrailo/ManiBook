"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getPowder, updatePowder, Powder } from "@/lib/api";

function EditPowderContent() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [powder, setPowder] = useState<Powder | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const inputClass =
    "w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-text placeholder:text-muted outline-none transition focus:border-orchid focus:ring-1 focus:ring-orchid/30";

  const labelClass = "mb-1.5 block text-sm font-medium text-text-secondary";

  const sectionClass =
    "rounded-xl border border-border bg-background/50 p-5 sm:p-6";

  useEffect(() => {
    async function load() {
      const token = sessionStorage.getItem("accessToken");

      if (!token) {
        router.push("/login");
        return;
      }

      const powderId = Number(id);

      if (!Number.isInteger(powderId) || powderId <= 0) {
        setError("Invalid powder ID.");
        setLoading(false);
        return;
      }

      try {
        const data = await getPowder(token, powderId);
        setPowder(data);
      } catch {
        setError("Could not load this powder.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [id, router]);

  function handleChange(
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) {
    if (!powder) return;

    const { name, value, type } = e.target;

    setPowder((previous) => {
      if (!previous) return previous;

      return {
        ...previous,
        [name]:
          type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
      };
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const token = sessionStorage.getItem("accessToken");

    if (!token) {
      router.push("/login");
      return;
    }

    if (!powder) return;

    setSaving(true);
    setError("");

    try {
      await updatePowder(token, powder.id, {
        name: powder.name,
        brand: powder.brand,
        product_code: powder.product_code,
        colour_family: powder.colour_family,
        hex_colour: powder.hex_colour,
        finish: powder.finish,
        intensity: powder.intensity,
        undertone: powder.undertone,
        coverage: powder.coverage,
        is_favourite: powder.is_favourite,
        notes: powder.notes,
      });

      router.push(`/collection/${powder.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save changes.");
    } finally {
      setSaving(false);
    }
  }

  const colourFamilies = [
    "red",
    "pink",
    "orange",
    "yellow",
    "green",
    "blue",
    "purple",
    "brown",
    "neutral",
    "black",
    "white",
    "multicolour",
    "other",
  ];

  const finishes = [
    "solid",
    "glitter",
    "shimmer",
    "chrome",
    "holographic",
    "flake",
    "thermal",
    "other",
  ];

  const selectOptions: Record<string, string[]> = {
    colour_family: colourFamilies,
    finish: finishes,
    intensity: ["light", "medium", "dark"],
    undertone: ["warm", "cool", "neutral", "unknown"],
    coverage: ["sheer", "buildable", "opaque", "unknown"],
  };

  const hexIsValid =
    powder !== null && /^#[0-9A-Fa-f]{6}$/.test(powder.hex_colour || "");

  if (loading) {
    return (
      <main className="min-h-screen bg-background px-4 py-12">
        <div className="mx-auto max-w-3xl animate-pulse">
          <div className="mb-4 h-4 w-32 rounded bg-surface" />
          <div className="mb-3 h-10 w-64 rounded bg-surface" />
          <div className="h-4 w-80 rounded bg-surface" />
          <div className="mt-10 space-y-5">
            <div className="h-64 rounded-xl border border-border bg-surface/50" />
            <div className="h-72 rounded-xl border border-border bg-surface/50" />
          </div>
        </div>
      </main>
    );
  }

  if (!powder) {
    return (
      <main className="min-h-screen bg-background px-4 py-12">
        <div className="mx-auto max-w-3xl">
          <button
            type="button"
            onClick={() => router.push("/collection")}
            className="mb-6 text-sm font-medium text-text-secondary hover:text-lavender"
          >
            ← Back to collection
          </button>

          <div className="rounded-xl border border-border bg-surface p-6">
            <p className="text-sm text-red-400">
              {error || "Powder not found."}
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-3xl">
        {/* Back navigation */}
        <button
          type="button"
          onClick={() => router.push(`/collection/${powder.id}`)}
          className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-text-secondary transition hover:text-lavender"
        >
          <span aria-hidden="true">←</span>
          Back to powder
        </button>

        {/* Page heading */}
        <div className="mb-8">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-blush">
            Your collection
          </p>

          <h1 className="text-3xl font-semibold tracking-tight text-text sm:text-4xl">
            Edit powder
          </h1>

          <p className="mt-3 max-w-xl text-sm leading-relaxed text-text-secondary">
            Update the details and characteristics of your powder. Keep your
            collection accurate and organised.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Basic information */}
          <section className={sectionClass}>
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-text">
                Basic information
              </h2>
              <p className="mt-1 text-sm text-muted">
                The essentials to identify your powder.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="name" className={labelClass}>
                  Powder name <span className="text-berry">*</span>
                </label>
                <input
                  id="name"
                  name="name"
                  value={powder.name}
                  onChange={handleChange}
                  className={inputClass}
                  required
                  maxLength={150}
                />
              </div>

              <div>
                <label htmlFor="brand" className={labelClass}>
                  Brand <span className="text-berry">*</span>
                </label>
                <input
                  id="brand"
                  name="brand"
                  value={powder.brand}
                  onChange={handleChange}
                  className={inputClass}
                  required
                  maxLength={100}
                />
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="product_code" className={labelClass}>
                  Product code
                </label>
                <input
                  id="product_code"
                  name="product_code"
                  value={powder.product_code || ""}
                  onChange={handleChange}
                  className={inputClass}
                  placeholder="Optional"
                  maxLength={100}
                />
              </div>
            </div>
          </section>

          {/* Colour and finish */}
          <section className={sectionClass}>
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-text">
                Colour and finish
              </h2>
              <p className="mt-1 text-sm text-muted">
                Describe the appearance and characteristics of your powder.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              {Object.entries(selectOptions).map(([field, options]) => (
                <div key={field}>
                  <label htmlFor={field} className={labelClass}>
                    {field
                      .replace("_", " ")
                      .replace(/\b\w/g, (c) => c.toUpperCase())}
                    {["colour_family", "finish"].includes(field) && (
                      <span className="text-berry"> *</span>
                    )}
                  </label>

                  <select
                    id={field}
                    name={field}
                    value={powder[field as keyof Powder] as string}
                    onChange={handleChange}
                    className={inputClass}
                  >
                    {options.map((option) => (
                      <option key={option} value={option}>
                        {option.charAt(0).toUpperCase() + option.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
              ))}

              {/* Hex colour */}
              <div>
                <label htmlFor="hex_colour" className={labelClass}>
                  Colour hex code
                </label>

                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    aria-label="Choose powder colour"
                    value={hexIsValid ? powder.hex_colour : "#f4a6b8"}
                    onChange={(e) =>
                      setPowder((previous) =>
                        previous
                          ? {
                              ...previous,
                              hex_colour: e.target.value.toUpperCase(),
                            }
                          : previous
                      )
                    }
                    className="h-11 w-12 shrink-0 cursor-pointer rounded-lg border border-border bg-background p-1"
                  />

                  <input
                    id="hex_colour"
                    name="hex_colour"
                    value={powder.hex_colour || ""}
                    onChange={handleChange}
                    className={inputClass}
                    placeholder="#F4A6B8"
                    maxLength={7}
                  />
                </div>

                {hexIsValid && (
                  <div className="mt-3 flex items-center gap-2">
                    <span
                      className="h-5 w-5 rounded-full border border-border"
                      style={{ backgroundColor: powder.hex_colour }}
                    />
                    <span className="text-xs text-muted">Colour preview</span>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Additional details */}
          <section className={sectionClass}>
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-text">
                Additional details
              </h2>
              <p className="mt-1 text-sm text-muted">
                Anything else you want to remember about this powder.
              </p>
            </div>

            <label htmlFor="notes" className={labelClass}>
              Notes
            </label>

            <textarea
              id="notes"
              name="notes"
              value={powder.notes || ""}
              onChange={handleChange}
              className={`${inputClass} resize-y`}
              rows={4}
              placeholder="e.g. Glows in the dark, looks different under daylight..."
            />
          </section>

          {/* Favourite */}
          <section className={sectionClass}>
            <label className="flex cursor-pointer items-center justify-between gap-4">
              <div>
                <span className="block text-sm font-semibold text-text">
                  Add to favourites
                </span>
                <span className="mt-1 block text-xs text-muted">
                  Keep this powder easy to find in your collection.
                </span>
              </div>

              <input
                type="checkbox"
                name="is_favourite"
                checked={powder.is_favourite}
                onChange={handleChange}
                className="h-5 w-5 shrink-0 cursor-pointer accent-berry"
              />
            </label>
          </section>

          {/* Error message */}
          {error && (
            <div
              role="alert"
              className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300"
            >
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => router.push(`/collection/${powder.id}`)}
              disabled={saving}
              className="rounded-lg border border-border px-5 py-3 text-sm font-medium text-text-secondary transition hover:border-border-strong hover:bg-surface hover:text-text disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-berry px-7 py-3 text-sm font-semibold text-white transition hover:bg-berry-dark disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Saving changes..." : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

export default function EditPowderPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-background px-4 py-12 text-center text-text-secondary">
          Loading powder...
        </main>
      }
    >
      <EditPowderContent />
    </Suspense>
  );
}
