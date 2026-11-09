"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import { getPowder, updatePowder, Powder } from "@/lib/api";

function EditPowderContent() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [powder, setPowder] = useState<Powder | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      const token = sessionStorage.getItem("accessToken");

      if (!token) {
        router.push("/login");
        return;
      }

      try {
        const data = await getPowder(token, Number(id));
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

    setPowder({
      ...powder,
      [name]:
        type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const token = sessionStorage.getItem("accessToken");

    if (!token || !powder) {
      router.push("/login");
      return;
    }

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

  if (loading) {
    return <main className="p-10 text-center">Loading powder...</main>;
  }

  if (!powder) {
    return (
      <main className="p-10">
        <p className="text-red-700">{error || "Powder not found."}</p>
      </main>
    );
  }

  const inputStyle =
    "w-full rounded-lg border border-rose-200 bg-white px-3 py-2 text-sm text-gray-800";

  const labelStyle = "mb-1 block text-sm font-medium text-gray-700";

  const selectOptions: Record<string, string[]> = {
    colour_family: [
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
    ],
    finish: [
      "solid",
      "glitter",
      "shimmer",
      "chrome",
      "holographic",
      "flake",
      "thermal",
      "other",
    ],
    intensity: ["light", "medium", "dark"],
    undertone: ["warm", "cool", "neutral", "unknown"],
    coverage: ["sheer", "buildable", "opaque", "unknown"],
  };

  return (
    <main className="min-h-screen bg-rose-50 px-6 py-10">
      <div className="mx-auto max-w-2xl rounded-2xl bg-white p-8 shadow-sm">
        <button
          type="button"
          onClick={() => router.back()}
          className="mb-6 text-sm text-rose-600"
        >
          ← Back
        </button>

        <h1 className="mb-2 text-3xl font-semibold text-rose-950">
          Edit powder
        </h1>
        <p className="mb-8 text-sm text-gray-500">
          Update your powder details.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className={labelStyle}>Powder name *</label>
            <input
              name="name"
              value={powder.name}
              onChange={handleChange}
              className={inputStyle}
              required
            />
          </div>

          <div>
            <label className={labelStyle}>Brand *</label>
            <input
              name="brand"
              value={powder.brand}
              onChange={handleChange}
              className={inputStyle}
              required
            />
          </div>

          <div>
            <label className={labelStyle}>Product code</label>
            <input
              name="product_code"
              value={powder.product_code || ""}
              onChange={handleChange}
              className={inputStyle}
            />
          </div>

          {Object.entries(selectOptions).map(([field, options]) => (
            <div key={field}>
              <label className={labelStyle}>
                {field
                  .replace("_", " ")
                  .replace(/\b\w/g, (c) => c.toUpperCase())}
              </label>
              <select
                name={field}
                value={powder[field as keyof Powder] as string}
                onChange={handleChange}
                className={inputStyle}
              >
                {options.map((option) => (
                  <option key={option} value={option}>
                    {option.charAt(0).toUpperCase() + option.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          ))}

          <div>
            <label className={labelStyle}>Colour hex code</label>
            <div className="flex gap-2">
              <input
                type="color"
                value={powder.hex_colour || "#f4a6b8"}
                onChange={(e) =>
                  setPowder({ ...powder, hex_colour: e.target.value })
                }
                className="h-10 w-12"
              />
              <input
                name="hex_colour"
                value={powder.hex_colour || ""}
                onChange={handleChange}
                placeholder="#F4A6B8"
                className={inputStyle}
              />
            </div>
          </div>

          <div>
            <label className={labelStyle}>Notes</label>
            <textarea
              name="notes"
              value={powder.notes || ""}
              onChange={handleChange}
              className={inputStyle}
              rows={4}
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              name="is_favourite"
              checked={powder.is_favourite}
              onChange={handleChange}
              className="accent-rose-600"
            />
            Favourite
          </label>

          {error && (
            <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-lg bg-rose-600 px-4 py-3 font-medium text-white hover:bg-rose-700 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save changes"}
          </button>
        </form>
      </div>
    </main>
  );
}

export default function EditPowderPage() {
  return (
    <Suspense fallback={<main className="p-10 text-center">Loading...</main>}>
      <EditPowderContent />
    </Suspense>
  );
}
