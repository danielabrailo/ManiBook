"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createPowder, uploadPowderPhoto } from "@/lib/api";

export default function NewPowderPage() {
  const router = useRouter();

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
      router.push("/login");
      return;
    }

    try {
      let powderId = createdPowderId;

      // Create the powder only once.
      if (!powderId) {
        const newPowder = await createPowder(token, form);
        powderId = newPowder.id;
        setCreatedPowderId(powderId);
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

  const inputStyle =
    "w-full rounded-lg border border-rose-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none focus:border-rose-400";

  const labelStyle = "mb-1 block text-sm font-medium text-gray-700";

  return (
    <main className="min-h-screen bg-rose-50 px-6 py-10">
      <div className="mx-auto max-w-2xl rounded-2xl bg-white p-8 shadow-sm">
        <button
          type="button"
          onClick={() => router.back()}
          className="mb-6 text-sm text-rose-600 hover:text-rose-800"
        >
          ← Back to collection
        </button>

        <h1 className="mb-2 text-3xl font-semibold text-rose-950">
          Add a new powder
        </h1>

        <p className="mb-8 text-sm text-gray-500">
          Add another colour to your personal nail collection.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className={labelStyle}>Powder name *</label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              className={inputStyle}
              placeholder="e.g. Rosewater"
              required
            />
          </div>

          <div>
            <label className={labelStyle}>Brand *</label>
            <input
              name="brand"
              value={form.brand}
              onChange={handleChange}
              className={inputStyle}
              placeholder="e.g. GLAMRDiP"
              required
            />
          </div>

          <div>
            <label className={labelStyle}>Product code</label>
            <input
              name="product_code"
              value={form.product_code}
              onChange={handleChange}
              className={inputStyle}
              placeholder="Optional"
            />
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label className={labelStyle}>Colour family *</label>
              <select
                name="colour_family"
                value={form.colour_family}
                onChange={handleChange}
                className={inputStyle}
              >
                {[
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
                ].map((value) => (
                  <option key={value} value={value}>
                    {value.charAt(0).toUpperCase() + value.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelStyle}>Finish *</label>
              <select
                name="finish"
                value={form.finish}
                onChange={handleChange}
                className={inputStyle}
              >
                {[
                  "solid",
                  "glitter",
                  "shimmer",
                  "chrome",
                  "holographic",
                  "flake",
                  "thermal",
                  "other",
                ].map((value) => (
                  <option key={value} value={value}>
                    {value.charAt(0).toUpperCase() + value.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelStyle}>Intensity</label>
              <select
                name="intensity"
                value={form.intensity}
                onChange={handleChange}
                className={inputStyle}
              >
                {["light", "medium", "dark"].map((value) => (
                  <option key={value} value={value}>
                    {value.charAt(0).toUpperCase() + value.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelStyle}>Undertone</label>
              <select
                name="undertone"
                value={form.undertone}
                onChange={handleChange}
                className={inputStyle}
              >
                {["warm", "cool", "neutral", "unknown"].map((value) => (
                  <option key={value} value={value}>
                    {value.charAt(0).toUpperCase() + value.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelStyle}>Coverage</label>
              <select
                name="coverage"
                value={form.coverage}
                onChange={handleChange}
                className={inputStyle}
              >
                {["sheer", "buildable", "opaque", "unknown"].map((value) => (
                  <option key={value} value={value}>
                    {value.charAt(0).toUpperCase() + value.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelStyle}>Colour hex code</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={form.hex_colour || "#f4a6b8"}
                  onChange={(e) =>
                    setForm((previous) => ({
                      ...previous,
                      hex_colour: e.target.value,
                    }))
                  }
                  className="h-10 w-12 cursor-pointer rounded border border-rose-200"
                />
                <input
                  name="hex_colour"
                  value={form.hex_colour}
                  onChange={handleChange}
                  className={inputStyle}
                  placeholder="#F4A6B8"
                />
              </div>
            </div>
          </div>

          <div>
            <label className={labelStyle}>Notes</label>
            <textarea
              name="notes"
              value={form.notes}
              onChange={handleChange}
              className={inputStyle}
              rows={3}
              placeholder="Any additional details..."
            />
          </div>

          <div>
            <label className={labelStyle}>Product photo (optional)</label>

            <input
              type="file"
              accept="image/*"
              onChange={(e) => setPhoto(e.target.files?.[0] || null)}
              className={inputStyle}
            />

            <p className="mt-1 text-xs text-gray-500">
              Maximum file size: 5 MB.
            </p>
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              name="is_favourite"
              checked={form.is_favourite}
              onChange={handleChange}
              className="accent-rose-600"
            />
            Add to favourites
          </label>

          {error && (
            <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-rose-600 px-4 py-3 font-medium text-white transition hover:bg-rose-700 disabled:opacity-50"
          >
            {loading ? "Adding powder..." : "Add to my collection"}
          </button>
        </form>
      </div>
    </main>
  );
}
