"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createPowder, updatePowder, uploadPowderPhoto } from "@/lib/api";
import TagInput from "../../../components/TagInput";

export default function NewPowderPage() {
  const router = useRouter();
  const [accessToken, setAccessToken] = useState("");
  const [selectedTags, setSelectedTags] = useState<number[]>([]);

  useEffect(() => {
    const token = sessionStorage.getItem("accessToken");

    if (!token) {
      router.replace("/login");
      return;
    }

    setAccessToken(token);
  }, [router]);

  const [form, setForm] = useState({
    name: "",
    brand: "",
    product_code: "",
    colour_family: "pink",
    hex_colour: "",
    finish: "solid",
    intensity: "medium",
    undertone: "unknown",
    coverage: "unknown",
    is_favourite: false,
    notes: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const [createdPowderId, setCreatedPowderId] = useState<number | null>(null);

  const inputClass =
    "w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-text placeholder:text-muted outline-none transition focus:border-orchid focus:ring-1 focus:ring-orchid/30";

  const labelClass = "mb-1.5 block text-sm font-medium text-text-secondary";

  const sectionClass =
    "rounded-xl border border-border bg-background/50 p-5 sm:p-6";

  function handleChange(
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) {
    const { name, value, type } = e.target;

    setForm((previous) => ({
      ...previous,
      [name]:
        type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const token = sessionStorage.getItem("accessToken");

    if (!token) {
      setLoading(false);
      router.push("/login");
      return;
    }

    try {
      let powderId = createdPowderId;

      // Create the powder only once.
      if (!powderId) {
        const newPowder = await createPowder(token, {
          ...form,
          tags: selectedTags,
        });

        powderId = newPowder.id;
        setCreatedPowderId(powderId);
      } else {
        // If the powder was already created but photo upload failed,
        // make sure any tag changes are saved before retrying.
        await updatePowder(token, powderId, {
          tags: selectedTags,
        });
      }

      // Upload the photo if one was selected.
      if (photo && powderId) {
        await uploadPowderPhoto(token, powderId, photo);
      }

      router.push("/collection");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
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

  const hexIsValid = /^#[0-9A-Fa-f]{6}$/.test(form.hex_colour);

  return (
    <main className="min-h-screen bg-background px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-3xl">
        {/* Back navigation */}
        <button
          type="button"
          onClick={() => router.push("/collection")}
          className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-text-secondary transition hover:text-lavender"
        >
          <span aria-hidden="true">←</span>
          Back to collection
        </button>

        {/* Page heading */}
        <div className="mb-8">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-blush">
            Your collection
          </p>

          <h1 className="text-3xl font-semibold tracking-tight text-text sm:text-4xl">
            Add a new powder
          </h1>

          <p className="mt-3 max-w-xl text-sm leading-relaxed text-text-secondary">
            Give your new colour a place in your collection. Add its details,
            characteristics, and a photo to keep everything organised.
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
                  value={form.name}
                  onChange={handleChange}
                  className={inputClass}
                  placeholder="e.g. Rosewater"
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
                  value={form.brand}
                  onChange={handleChange}
                  className={inputClass}
                  placeholder="e.g. GLAMRDiP"
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
                  value={form.product_code}
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
              <div>
                <label htmlFor="colour_family" className={labelClass}>
                  Colour family <span className="text-berry">*</span>
                </label>
                <select
                  id="colour_family"
                  name="colour_family"
                  value={form.colour_family}
                  onChange={handleChange}
                  className={inputClass}
                >
                  {colourFamilies.map((value) => (
                    <option key={value} value={value}>
                      {value.charAt(0).toUpperCase() + value.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="finish" className={labelClass}>
                  Finish <span className="text-berry">*</span>
                </label>
                <select
                  id="finish"
                  name="finish"
                  value={form.finish}
                  onChange={handleChange}
                  className={inputClass}
                >
                  {finishes.map((value) => (
                    <option key={value} value={value}>
                      {value.charAt(0).toUpperCase() + value.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="intensity" className={labelClass}>
                  Intensity
                </label>
                <select
                  id="intensity"
                  name="intensity"
                  value={form.intensity}
                  onChange={handleChange}
                  className={inputClass}
                >
                  {["light", "medium", "dark"].map((value) => (
                    <option key={value} value={value}>
                      {value.charAt(0).toUpperCase() + value.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="undertone" className={labelClass}>
                  Undertone
                </label>
                <select
                  id="undertone"
                  name="undertone"
                  value={form.undertone}
                  onChange={handleChange}
                  className={inputClass}
                >
                  {["warm", "cool", "neutral", "unknown"].map((value) => (
                    <option key={value} value={value}>
                      {value.charAt(0).toUpperCase() + value.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="coverage" className={labelClass}>
                  Coverage
                </label>
                <select
                  id="coverage"
                  name="coverage"
                  value={form.coverage}
                  onChange={handleChange}
                  className={inputClass}
                >
                  {["sheer", "buildable", "opaque", "unknown"].map((value) => (
                    <option key={value} value={value}>
                      {value.charAt(0).toUpperCase() + value.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Hex colour */}
              <div>
                <label htmlFor="hex_colour" className={labelClass}>
                  Colour hex code
                </label>

                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    aria-label="Choose powder colour"
                    value={hexIsValid ? form.hex_colour : "#f4a6b8"}
                    onChange={(e) =>
                      setForm((previous) => ({
                        ...previous,
                        hex_colour: e.target.value.toUpperCase(),
                      }))
                    }
                    className="h-11 w-12 shrink-0 cursor-pointer rounded-lg border border-border bg-background p-1"
                  />

                  <input
                    id="hex_colour"
                    name="hex_colour"
                    value={form.hex_colour}
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
                      style={{ backgroundColor: form.hex_colour }}
                    />
                    <span className="text-xs text-muted">Colour preview</span>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Notes */}
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
              value={form.notes}
              onChange={handleChange}
              className={`${inputClass} resize-y`}
              rows={4}
              placeholder="e.g. Glows in the dark, looks different under daylight..."
            />
          </section>

          {/* Tags */}
          <section className={sectionClass}>
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-text">
                Tags
                <span className="ml-2 text-xs font-normal text-muted">
                  Optional
                </span>
              </h2>

              <p className="mt-1 text-sm text-muted">
                Add your own labels to organise and find this powder later.
              </p>
            </div>

            {accessToken ? (
              <TagInput
                accessToken={accessToken}
                selectedTags={selectedTags}
                onChange={setSelectedTags}
              />
            ) : (
              <p className="text-sm text-muted">Loading tags...</p>
            )}
          </section>

          {/* Product photo */}
          <section className={sectionClass}>
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-text">Product photo</h2>
              <p className="mt-1 text-sm text-muted">
                Add a picture to help you recognise this powder in your
                collection.
              </p>
            </div>

            <label
              htmlFor="photo"
              className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-border-strong bg-surface/60 px-5 py-8 text-center transition hover:border-orchid hover:bg-surface"
            >
              <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-plum text-xl text-lavender">
                <span aria-hidden="true">↑</span>
              </span>

              <span className="text-sm font-medium text-text">
                {photo ? photo.name : "Choose a product photo"}
              </span>

              <span className="mt-1 text-xs text-muted">
                {photo
                  ? "Click to choose a different image"
                  : "PNG, JPG or other image formats · Maximum 5 MB"}
              </span>

              <input
                id="photo"
                type="file"
                accept="image/*"
                onChange={(e) => setPhoto(e.target.files?.[0] || null)}
                className="sr-only"
              />
            </label>

            {photo && (
              <button
                type="button"
                onClick={() => setPhoto(null)}
                className="mt-3 text-xs font-medium text-red-400 transition hover:text-red-300"
              >
                Remove selected photo
              </button>
            )}
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
                checked={form.is_favourite}
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

          {/* Submit */}
          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => router.push("/collection")}
              disabled={loading}
              className="rounded-lg border border-border px-5 py-3 text-sm font-medium text-text-secondary transition hover:border-border-strong hover:bg-surface hover:text-text disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-berry px-7 py-3 text-sm font-semibold text-white transition hover:bg-berry-dark disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Adding powder..." : "Add to my collection"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
