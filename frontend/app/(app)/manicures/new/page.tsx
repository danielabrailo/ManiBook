"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

import {
  createManicure,
  getPowders,
  getTags,
  uploadManicurePhoto,
  Powder,
  Tag,
  Manicure,
  ManicureInput,
} from "@/lib/api";

function getLocalDate() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);

  return local.toISOString().slice(0, 10);
}

export default function NewManicurePage() {
  const router = useRouter();

  // Form fields
  const [title, setTitle] = useState("");
  const [completedAt, setCompletedAt] = useState(getLocalDate());
  const [nailShape, setNailShape] = useState<Manicure["nail_shape"] | "">("");
  const [technique, setTechnique] = useState<Manicure["technique"] | "">("");
  const [nailLength, setNailLength] = useState<Manicure["nail_length"] | "">(
    ""
  );
  const [rating, setRating] = useState("");
  const [notes, setNotes] = useState("");
  const [removalDate, setRemovalDate] = useState("");

  // Related objects
  const [powders, setPowders] = useState<Powder[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedPowders, setSelectedPowders] = useState<number[]>([]);
  const [selectedTags, setSelectedTags] = useState<number[]>([]);
  const [powderSearch, setPowderSearch] = useState("");

  // Photos
  const [photos, setPhotos] = useState<File[]>([]);
  const [primaryPhotoIndex, setPrimaryPhotoIndex] = useState(0);

  // Page state
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [savedManicureId, setSavedManicureId] = useState<number | null>(null);
  const [photoUploadWarning, setPhotoUploadWarning] = useState("");

  // Load powders and tags.
  useEffect(() => {
    let cancelled = false;

    async function loadOptions() {
      const token = sessionStorage.getItem("accessToken");

      if (!token) {
        router.replace("/login");
        return;
      }

      setLoadingOptions(true);

      try {
        const [powderData, tagData] = await Promise.all([
          getPowders(token),
          getTags(token),
        ]);

        if (!cancelled) {
          setPowders(powderData);
          setTags(tagData);
        }
      } catch (err) {
        if (!cancelled) {
          const message =
            err instanceof Error
              ? err.message
              : "Could not load your collection.";

          setError(message);

          if (message.includes("session has expired")) {
            sessionStorage.removeItem("accessToken");
            sessionStorage.removeItem("refreshToken");
            router.replace("/login");
          }
        }
      } finally {
        if (!cancelled) {
          setLoadingOptions(false);
        }
      }
    }

    loadOptions();

    return () => {
      cancelled = true;
    };
  }, [router]);

  function togglePowder(powderId: number) {
    setSelectedPowders((previous) =>
      previous.includes(powderId)
        ? previous.filter((id) => id !== powderId)
        : [...previous, powderId]
    );
  }

  function toggleTag(tagId: number) {
    setSelectedTags((previous) =>
      previous.includes(tagId)
        ? previous.filter((id) => id !== tagId)
        : [...previous, tagId]
    );
  }

  function handlePhotoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(event.target.files || []);

    setPhotos(selectedFiles);
    setPrimaryPhotoIndex(0);

    // Allow selecting the same files again after changing the selection.
    event.target.value = "";
  }

  function removePhoto(index: number) {
    setPhotos((previous) => previous.filter((_, i) => i !== index));

    setPrimaryPhotoIndex((previous) => {
      if (previous === index) return 0;
      if (previous > index) return previous - 1;
      return previous;
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setPhotoUploadWarning("");

    if (!nailShape || !technique || !nailLength) {
      setError("Please select a nail shape, technique and nail length.");
      return;
    }

    const token = sessionStorage.getItem("accessToken");

    if (!token) {
      router.replace("/login");
      return;
    }

    const manicureData: ManicureInput = {
      title: title.trim(),
      completed_at: completedAt,
      nail_shape: nailShape,
      technique,
      nail_length: nailLength,
      rating: rating ? Number(rating) : null,
      notes: notes.trim(),
      removal_date: removalDate || null,
      powders: selectedPowders,
      tags: selectedTags,
    };

    setSaving(true);

    let createdManicure: Manicure;

    // Step 1: Create the manicure.
    try {
      createdManicure = await createManicure(token, manicureData);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not save your manicure.";

      setError(message);

      if (message.includes("session has expired")) {
        sessionStorage.removeItem("accessToken");
        sessionStorage.removeItem("refreshToken");
        router.replace("/login");
      }

      setSaving(false);
      return;
    }

    // Step 2: Upload photos after the manicure exists.
    const uploadErrors: string[] = [];

    for (let index = 0; index < photos.length; index++) {
      try {
        await uploadManicurePhoto(
          token,
          createdManicure.id,
          photos[index],
          index === primaryPhotoIndex
        );
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Unknown upload error.";

        uploadErrors.push(`${photos[index].name}: ${message}`);
      }
    }

    setSaving(false);
    setSavedManicureId(createdManicure.id);

    if (uploadErrors.length > 0) {
      setPhotoUploadWarning(
        `Your manicure was saved, but ${uploadErrors.length} photo(s) could not be uploaded. You can add them from the manicure detail page.`
      );
      return;
    }

    router.push(`/manicures/${createdManicure.id}`);
  }

  const filteredPowders = powders.filter((powder) => {
    const query = powderSearch.toLowerCase();

    return (
      powder.name.toLowerCase().includes(query) ||
      (powder.brand || "").toLowerCase().includes(query) ||
      (powder.product_code || "").toLowerCase().includes(query)
    );
  });

  return (
    <main className="min-h-screen bg-background px-5 py-8 md:px-8 md:py-10">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <header className="mb-8">
          <Link
            href="/manicures"
            className="text-sm text-muted transition-colors hover:text-lavender"
          >
            ← Back to manicures
          </Link>

          <p className="mt-6 text-sm tracking-widest text-blush">
            YOUR MANICURE JOURNAL
          </p>

          <h1 className="mt-2 font-serif text-3xl text-lavender">
            Add a manicure
          </h1>

          <p className="mt-2 text-text-secondary">
            Save the details, colours and photos of your latest set.
          </p>
        </header>

        {error && (
          <div className="mb-6 rounded-xl border border-danger/30 bg-surface p-4 text-sm text-danger">
            {error}
          </div>
        )}

        {photoUploadWarning && (
          <div className="mb-6 rounded-xl border border-border-strong bg-surface p-4 text-sm text-text-secondary">
            <p>{photoUploadWarning}</p>

            {savedManicureId && (
              <Link
                href={`/manicures/${savedManicureId}`}
                className="mt-3 inline-block font-medium text-lavender hover:text-blush"
              >
                Open saved manicure →
              </Link>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic details */}
          <section className="rounded-2xl border border-border bg-surface p-5 shadow-card md:p-6">
            <h2 className="font-serif text-xl text-lavender">
              Manicure details
            </h2>

            <p className="mt-1 text-xs text-muted">
              The basics of your nail set.
            </p>

            <div className="mt-5 space-y-4">
              <div>
                <label
                  htmlFor="manicure-title"
                  className="mb-1 block text-sm font-medium text-text-secondary"
                >
                  Title *
                </label>

                <input
                  id="manicure-title"
                  type="text"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="e.g. Pink chrome nails"
                  maxLength={150}
                  required
                  className="w-full rounded-lg border border-border-strong bg-surface-elevated px-4 py-2.5 text-sm text-text outline-none focus:border-neon"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="completed-at"
                    className="mb-1 block text-sm font-medium text-text-secondary"
                  >
                    Application date *
                  </label>

                  <input
                    id="completed-at"
                    type="date"
                    value={completedAt}
                    max={getLocalDate()}
                    onChange={(event) => setCompletedAt(event.target.value)}
                    required
                    className="w-full rounded-lg border border-border-strong bg-surface-elevated px-3 py-2.5 text-sm text-text"
                  />
                </div>

                <div>
                  <label
                    htmlFor="removal-date"
                    className="mb-1 block text-sm font-medium text-text-secondary"
                  >
                    Removal date
                  </label>

                  <input
                    id="removal-date"
                    type="date"
                    value={removalDate}
                    min={completedAt || undefined}
                    max={getLocalDate()}
                    onChange={(event) => setRemovalDate(event.target.value)}
                    className="w-full rounded-lg border border-border-strong bg-surface-elevated px-3 py-2.5 text-sm text-text"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label
                    htmlFor="nail-shape"
                    className="mb-1 block text-sm font-medium text-text-secondary"
                  >
                    Nail shape *
                  </label>

                  <select
                    id="nail-shape"
                    value={nailShape}
                    onChange={(event) =>
                      setNailShape(
                        event.target.value as Manicure["nail_shape"] | ""
                      )
                    }
                    required
                    className="w-full rounded-lg border border-border-strong bg-surface-elevated px-3 py-2.5 text-sm text-text"
                  >
                    <option value="">Select shape</option>
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
                    htmlFor="technique"
                    className="mb-1 block text-sm font-medium text-text-secondary"
                  >
                    Technique *
                  </label>

                  <select
                    id="technique"
                    value={technique}
                    onChange={(event) =>
                      setTechnique(
                        event.target.value as Manicure["technique"] | ""
                      )
                    }
                    required
                    className="w-full rounded-lg border border-border-strong bg-surface-elevated px-3 py-2.5 text-sm text-text"
                  >
                    <option value="">Select technique</option>
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
                    htmlFor="nail-length"
                    className="mb-1 block text-sm font-medium text-text-secondary"
                  >
                    Nail length *
                  </label>

                  <select
                    id="nail-length"
                    value={nailLength}
                    onChange={(event) =>
                      setNailLength(
                        event.target.value as Manicure["nail_length"] | ""
                      )
                    }
                    required
                    className="w-full rounded-lg border border-border-strong bg-surface-elevated px-3 py-2.5 text-sm text-text"
                  >
                    <option value="">Select length</option>
                    <option value="extra_short">Extra short</option>
                    <option value="short">Short</option>
                    <option value="medium">Medium</option>
                    <option value="long">Long</option>
                    <option value="extra_long">Extra long</option>
                  </select>
                </div>
              </div>

              <div>
                <label
                  htmlFor="rating"
                  className="mb-1 block text-sm font-medium text-text-secondary"
                >
                  Your rating
                </label>

                <select
                  id="rating"
                  value={rating}
                  onChange={(event) => setRating(event.target.value)}
                  className="w-full rounded-lg border border-border-strong bg-surface-elevated px-3 py-2.5 text-sm text-text sm:w-1/2"
                >
                  <option value="">Not rated</option>
                  {Array.from({ length: 10 }, (_, index) => index + 1).map(
                    (value) => (
                      <option key={value} value={value}>
                        {value}/10
                      </option>
                    )
                  )}
                </select>
              </div>

              <div>
                <label
                  htmlFor="notes"
                  className="mb-1 block text-sm font-medium text-text-secondary"
                >
                  Notes
                </label>

                <textarea
                  id="notes"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={4}
                  placeholder="Products, application experience, design details, things to remember..."
                  className="w-full resize-y rounded-lg border border-border-strong bg-surface-elevated px-4 py-3 text-sm text-text outline-none focus:border-neon"
                />
              </div>
            </div>
          </section>

          {/* Powders */}
          <section className="rounded-2xl border border-border bg-surface p-5 shadow-card md:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-serif text-xl text-lavender">
                  Powders used
                </h2>

                <p className="mt-1 text-xs text-muted">
                  Select the colours used in this manicure.
                </p>
              </div>

              <span className="rounded-full border border-border-strong bg-background px-3 py-1 text-xs text-lavender">
                {selectedPowders.length} selected
              </span>
            </div>

            {loadingOptions ? (
              <p className="mt-5 text-sm text-muted">
                Loading your collection...
              </p>
            ) : powders.length === 0 ? (
              <div className="mt-5 rounded-xl border border-dashed border-border-strong p-5 text-center">
                <p className="text-sm text-text-secondary">
                  You haven't added any powders yet.
                </p>

                <Link
                  href="/collection/new"
                  className="mt-3 inline-block text-sm font-medium text-lavender hover:text-blush"
                >
                  Add a powder first →
                </Link>
              </div>
            ) : (
              <>
                <input
                  type="search"
                  value={powderSearch}
                  onChange={(event) => setPowderSearch(event.target.value)}
                  placeholder="Search your powders..."
                  className="mt-5 w-full rounded-lg border border-border-strong bg-surface-elevated px-4 py-2 text-sm text-text outline-none focus:border-neon"
                />

                <div className="mt-4 max-h-72 space-y-2 overflow-y-auto pr-1">
                  {filteredPowders.map((powder) => {
                    const selected = selectedPowders.includes(powder.id);

                    return (
                      <label
                        key={powder.id}
                        className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-colors ${
                          selected
                            ? "border-neon bg-neon/10"
                            : "border-border bg-background hover:border-border-strong"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => togglePowder(powder.id)}
                          className="h-4 w-4 accent-fuchsia-500"
                        />

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-text">
                            {powder.name}
                          </p>

                          <p className="mt-0.5 text-xs text-muted">
                            {powder.brand || "Brand not specified"}
                            {powder.finish ? ` · ${powder.finish}` : ""}
                          </p>
                        </div>

                        {selected && (
                          <span className="text-xs font-medium text-lavender">
                            Selected
                          </span>
                        )}
                      </label>
                    );
                  })}

                  {filteredPowders.length === 0 && (
                    <p className="py-4 text-center text-sm text-muted">
                      No matching powders found.
                    </p>
                  )}
                </div>
              </>
            )}
          </section>

          {/* Tags */}
          <section className="rounded-2xl border border-border bg-surface p-5 shadow-card md:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-serif text-xl text-lavender">Tags</h2>

                <p className="mt-1 text-xs text-muted">
                  Organise your manicures with your existing tags.
                </p>
              </div>

              <span className="rounded-full border border-border-strong bg-background px-3 py-1 text-xs text-lavender">
                {selectedTags.length} selected
              </span>
            </div>

            {loadingOptions ? (
              <p className="mt-5 text-sm text-muted">Loading tags...</p>
            ) : tags.length > 0 ? (
              <div className="mt-5 flex flex-wrap gap-2">
                {tags.map((tag) => {
                  const selected = selectedTags.includes(tag.id);

                  return (
                    <button
                      key={tag.id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => toggleTag(tag.id)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                        selected
                          ? "border-neon bg-neon/15 text-lavender"
                          : "border-border-strong bg-background text-text-secondary hover:border-neon/60 hover:text-lavender"
                      }`}
                    >
                      {selected ? "✓ " : ""}
                      {tag.name}
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="mt-5 text-sm text-muted">
                No tags available yet. You can create tags from your collection.
              </p>
            )}
          </section>

          {/* Photos */}
          <section className="rounded-2xl border border-border bg-surface p-5 shadow-card md:p-6">
            <h2 className="font-serif text-xl text-lavender">
              Manicure photos
            </h2>

            <p className="mt-1 text-xs text-muted">
              Upload photos of your finished set. Choose one as the main photo.
            </p>

            <div className="mt-5">
              <label
                htmlFor="manicure-photos"
                className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-border-strong bg-background p-8 text-center transition-colors hover:border-neon"
              >
                <span className="text-2xl text-lavender">＋</span>

                <span className="mt-2 text-sm font-medium text-text-secondary">
                  Choose photos
                </span>

                <span className="mt-1 text-xs text-muted">
                  You can select multiple images.
                </span>

                <input
                  id="manicure-photos"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoChange}
                  className="sr-only"
                />
              </label>
            </div>

            {photos.length > 0 && (
              <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
                {photos.map((photo, index) => {
                  const previewUrl = URL.createObjectURL(photo);

                  return (
                    <div
                      key={`${photo.name}-${photo.lastModified}-${index}`}
                      className="overflow-hidden rounded-xl border border-border bg-background"
                    >
                      <div className="relative aspect-[4/5]">
                        <Image
                          src={previewUrl}
                          alt={photo.name}
                          fill
                          unoptimized
                          className="object-cover"
                        />

                        {primaryPhotoIndex === index && (
                          <span className="absolute left-2 top-2 rounded-full bg-neon/90 px-2 py-1 text-[10px] font-semibold text-white">
                            Primary photo
                          </span>
                        )}
                      </div>

                      <div className="space-y-2 p-3">
                        <p className="truncate text-xs text-text-secondary">
                          {photo.name}
                        </p>

                        <button
                          type="button"
                          onClick={() => setPrimaryPhotoIndex(index)}
                          disabled={primaryPhotoIndex === index}
                          className="block text-xs font-medium text-lavender hover:text-blush disabled:cursor-default disabled:opacity-50"
                        >
                          {primaryPhotoIndex === index
                            ? "Main photo selected"
                            : "Make primary"}
                        </button>

                        <button
                          type="button"
                          onClick={() => removePhoto(index)}
                          className="block text-xs text-muted hover:text-danger"
                        >
                          Remove photo
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Submit */}
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Link
              href="/manicures"
              className="rounded-lg border border-border-strong px-5 py-2.5 text-center text-sm font-medium text-text-secondary transition-colors hover:border-neon hover:text-lavender"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={saving || loadingOptions || savedManicureId !== null}
              className="rounded-lg bg-berry px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-berry-dark disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving
                ? "Saving manicure..."
                : savedManicureId
                ? "Manicure saved"
                : "Save manicure"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
