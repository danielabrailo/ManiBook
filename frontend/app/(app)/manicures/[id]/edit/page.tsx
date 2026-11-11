"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

import {
  getManicure,
  updateManicure,
  getManicurePhotos,
  uploadManicurePhoto,
  updateManicurePhoto,
  deleteManicurePhoto,
  getPowders,
  getTags,
  getImageUrl,
  Powder,
  Tag,
  Manicure,
  ManicureInput,
  ManicurePhoto,
} from "@/lib/api";

type NewPhoto = {
  key: string;
  file: File;
};

function getLocalDate() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);

  return local.toISOString().slice(0, 10);
}

export default function EditManicurePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const manicureId = Number(params.id);

  // Form fields
  const [title, setTitle] = useState("");
  const [completedAt, setCompletedAt] = useState("");
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

  // Existing and new photos
  const [existingPhotos, setExistingPhotos] = useState<ManicurePhoto[]>([]);
  const [deletedPhotoIds, setDeletedPhotoIds] = useState<number[]>([]);
  const [newPhotos, setNewPhotos] = useState<NewPhoto[]>([]);
  const [primaryPhotoKey, setPrimaryPhotoKey] = useState<string | null>(null);
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});

  // Page state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [photoWarning, setPhotoWarning] = useState("");

  // Load manicure and form options
  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      if (!Number.isInteger(manicureId) || manicureId <= 0) {
        setError("Invalid manicure ID.");
        setLoading(false);
        return;
      }

      const token = sessionStorage.getItem("accessToken");

      if (!token) {
        router.replace("/login");
        return;
      }

      try {
        setLoading(true);
        setError("");

        const [manicureData, photoData, powderData, tagData] =
          await Promise.all([
            getManicure(token, manicureId),
            getManicurePhotos(token, manicureId),
            getPowders(token),
            getTags(token),
          ]);

        if (cancelled) return;

        setTitle(manicureData.title);
        setCompletedAt(manicureData.completed_at);
        setNailShape(manicureData.nail_shape);
        setTechnique(manicureData.technique);
        setNailLength(manicureData.nail_length);
        setRating(
          manicureData.rating !== null ? String(manicureData.rating) : ""
        );
        setNotes(manicureData.notes || "");
        setRemovalDate(manicureData.removal_date || "");

        setSelectedPowders(manicureData.powders);
        setSelectedTags(manicureData.tags);

        setExistingPhotos(photoData);

        // Reset pending local photo changes.
        // Uploaded photos are now part of the backend's existing photo list.
        setNewPhotos([]);
        setDeletedPhotoIds([]);

        setPowders(powderData);
        setTags(tagData);

        const primaryPhoto = photoData.find((photo) => photo.is_primary);

        setPrimaryPhotoKey(
          primaryPhoto
            ? `existing-${primaryPhoto.id}`
            : photoData.length > 0
            ? `existing-${photoData[0].id}`
            : null
        );
      } catch (err) {
        if (!cancelled) {
          const message =
            err instanceof Error
              ? err.message
              : "Could not load this manicure.";

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
    }

    loadData();

    return () => {
      cancelled = true;
    };
  }, [manicureId, router]);

  // Create and clean up preview URLs for newly selected photos.
  useEffect(() => {
    const urls: Record<string, string> = {};

    newPhotos.forEach((photo) => {
      urls[photo.key] = URL.createObjectURL(photo.file);
    });

    setPreviewUrls(urls);

    return () => {
      Object.values(urls).forEach((url) => URL.revokeObjectURL(url));
    };
  }, [newPhotos]);

  const filteredPowders = useMemo(() => {
    const query = powderSearch.toLowerCase();

    return powders.filter(
      (powder) =>
        powder.name.toLowerCase().includes(query) ||
        (powder.brand || "").toLowerCase().includes(query) ||
        (powder.product_code || "").toLowerCase().includes(query)
    );
  }, [powders, powderSearch]);

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
    const files = Array.from(event.target.files || []);

    const addedPhotos = files.map((file) => ({
      key: crypto.randomUUID(),
      file,
    }));

    setNewPhotos((previous) => {
      const updated = [...previous, ...addedPhotos];

      if (!primaryPhotoKey && updated.length > 0) {
        setPrimaryPhotoKey(updated[0].key);
      }

      return updated;
    });

    event.target.value = "";
  }

  function removeNewPhoto(key: string) {
    const remaining = newPhotos.filter((photo) => photo.key !== key);

    setNewPhotos(remaining);

    if (primaryPhotoKey === key) {
      const nextPhoto =
        existingPhotos.find((photo) => !deletedPhotoIds.includes(photo.id)) ||
        null;

      setPrimaryPhotoKey(
        nextPhoto ? `existing-${nextPhoto.id}` : remaining[0]?.key || null
      );
    }
  }

  function removeExistingPhoto(photoId: number) {
    setDeletedPhotoIds((previous) => [...previous, photoId]);

    if (primaryPhotoKey === `existing-${photoId}`) {
      const remaining = existingPhotos.filter(
        (photo) => photo.id !== photoId && !deletedPhotoIds.includes(photo.id)
      );

      const nextPhoto = remaining[0];

      setPrimaryPhotoKey(
        nextPhoto ? `existing-${nextPhoto.id}` : newPhotos[0]?.key || null
      );
    }
  }

  function restoreExistingPhoto(photoId: number) {
    setDeletedPhotoIds((previous) => previous.filter((id) => id !== photoId));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setPhotoWarning("");

    if (!nailShape || !technique || !nailLength) {
      setError("Please select a nail shape, technique and nail length.");
      return;
    }

    if (!title.trim()) {
      setError("Please enter a title for this manicure.");
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

    try {
      // Step 1: Update the manicure details and relationships.
      await updateManicure(token, manicureId, manicureData);

      // Step 2: Set the selected existing photo as primary, if applicable.
      if (primaryPhotoKey?.startsWith("existing-")) {
        const primaryId = Number(primaryPhotoKey.replace("existing-", ""));

        await updateManicurePhoto(token, primaryId, {
          is_primary: true,
        });
      }

      // Step 3: Upload new photos.
      // If a new photo is selected as primary, upload it first.
      const primaryNewPhoto = newPhotos.find(
        (photo) => photo.key === primaryPhotoKey
      );

      if (primaryNewPhoto) {
        await uploadManicurePhoto(
          token,
          manicureId,
          primaryNewPhoto.file,
          true
        );
      }

      for (const photo of newPhotos) {
        if (photo.key === primaryPhotoKey) continue;

        await uploadManicurePhoto(token, manicureId, photo.file, false);
      }

      // Step 4: Delete photos marked for removal.
      for (const photoId of deletedPhotoIds) {
        await deleteManicurePhoto(token, photoId);
      }
      // Clear local pending changes after all photo operations succeed.
      setNewPhotos([]);
      setDeletedPhotoIds([]);

      // Clear local photo changes after a successful save.
      setNewPhotos([]);
      setDeletedPhotoIds([]);

      router.push(`/manicures/${manicureId}`);
    } catch (err) {
      console.error("Failed to update manicure:", err);

      const message =
        err instanceof Error ? err.message : "Could not update your manicure.";

      setError(
        `The update could not be completed: ${message}. Some changes may already have been saved. Please reload the page before trying again.`
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-background px-5 py-10">
        <div className="mx-auto max-w-4xl animate-pulse space-y-6">
          <div className="h-5 w-32 rounded bg-surface-elevated" />
          <div className="h-10 w-64 rounded bg-surface-elevated" />
          <div className="h-64 rounded-2xl bg-surface" />
        </div>
      </main>
    );
  }

  if (error && existingPhotos.length === 0 && !title) {
    return (
      <main className="min-h-screen bg-background px-5 py-10">
        <div className="mx-auto max-w-4xl">
          <Link
            href="/manicures"
            className="text-sm text-muted hover:text-lavender"
          >
            ← Back to manicures
          </Link>

          <div className="mt-8 rounded-2xl border border-border bg-surface p-6">
            <h1 className="font-serif text-2xl text-lavender">
              Unable to load manicure
            </h1>
            <p className="mt-3 text-sm text-danger">{error}</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background px-5 py-8 md:px-8 md:py-10">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <header className="mb-8">
          <Link
            href={`/manicures/${manicureId}`}
            className="text-sm text-muted transition-colors hover:text-lavender"
          >
            ← Back to manicure
          </Link>

          <p className="mt-6 text-sm tracking-widest text-blush">
            YOUR MANICURE JOURNAL
          </p>

          <h1 className="mt-2 font-serif text-3xl text-lavender">
            Edit manicure
          </h1>

          <p className="mt-2 text-text-secondary">
            Update the details, colours and photos of your set.
          </p>
        </header>

        {error && (
          <div className="mb-6 rounded-xl border border-danger/30 bg-surface p-4 text-sm text-danger">
            {error}
          </div>
        )}

        {photoWarning && (
          <div className="mb-6 rounded-xl border border-border-strong bg-surface p-4 text-sm text-text-secondary">
            {photoWarning}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Manicure details */}
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
          </section>

          {/* Tags */}
          <section className="rounded-2xl border border-border bg-surface p-5 shadow-card md:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-serif text-xl text-lavender">Tags</h2>
                <p className="mt-1 text-xs text-muted">
                  Organise your manicure with your existing tags.
                </p>
              </div>

              <span className="rounded-full border border-border-strong bg-background px-3 py-1 text-xs text-lavender">
                {selectedTags.length} selected
              </span>
            </div>

            {tags.length > 0 ? (
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
              <p className="mt-5 text-sm text-muted">No tags available yet.</p>
            )}
          </section>

          {/* Photos */}
          <section className="rounded-2xl border border-border bg-surface p-5 shadow-card md:p-6">
            <h2 className="font-serif text-xl text-lavender">
              Manicure photos
            </h2>

            <p className="mt-1 text-xs text-muted">
              Manage existing photos or add new ones. Choose one primary photo.
            </p>

            {/* Existing photos */}
            {existingPhotos.length > 0 && (
              <div className="mt-5">
                <h3 className="mb-3 text-sm font-medium text-text-secondary">
                  Existing photos
                </h3>

                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  {existingPhotos.map((photo) => {
                    const deleted = deletedPhotoIds.includes(photo.id);
                    const key = `existing-${photo.id}`;
                    const primary = primaryPhotoKey === key;

                    return (
                      <div
                        key={photo.id}
                        className={`overflow-hidden rounded-xl border bg-background ${
                          deleted
                            ? "border-danger/50 opacity-50"
                            : primary
                            ? "border-neon"
                            : "border-border"
                        }`}
                      >
                        <div className="relative aspect-[4/5]">
                          <Image
                            src={getImageUrl(photo.image)}
                            alt={photo.caption || "Manicure photo"}
                            fill
                            unoptimized
                            className="object-cover"
                          />

                          {primary && !deleted && (
                            <span className="absolute left-2 top-2 rounded-full bg-neon/90 px-2 py-1 text-[10px] font-semibold text-white">
                              Primary photo
                            </span>
                          )}

                          {deleted && (
                            <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-sm font-medium text-white">
                              Marked for removal
                            </span>
                          )}
                        </div>

                        <div className="space-y-2 p-3">
                          {deleted ? (
                            <button
                              type="button"
                              onClick={() => restoreExistingPhoto(photo.id)}
                              className="text-xs font-medium text-lavender hover:text-blush"
                            >
                              Undo removal
                            </button>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => setPrimaryPhotoKey(key)}
                                disabled={primary}
                                className="block text-xs font-medium text-lavender hover:text-blush disabled:opacity-50"
                              >
                                {primary
                                  ? "Main photo selected"
                                  : "Make primary"}
                              </button>

                              <button
                                type="button"
                                onClick={() => removeExistingPhoto(photo.id)}
                                className="block text-xs text-muted hover:text-danger"
                              >
                                Remove photo
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Upload new photos */}
            <div className="mt-6">
              <label
                htmlFor="manicure-photos"
                className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-border-strong bg-background p-8 text-center transition-colors hover:border-neon"
              >
                <span className="text-2xl text-lavender">＋</span>
                <span className="mt-2 text-sm font-medium text-text-secondary">
                  Add more photos
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

            {newPhotos.length > 0 && (
              <div className="mt-5">
                <h3 className="mb-3 text-sm font-medium text-text-secondary">
                  New photos
                </h3>

                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  {newPhotos.map((photo) => {
                    const primary = primaryPhotoKey === photo.key;

                    return (
                      <div
                        key={photo.key}
                        className={`overflow-hidden rounded-xl border bg-background ${
                          primary ? "border-neon" : "border-border"
                        }`}
                      >
                        <div className="relative aspect-[4/5]">
                          {previewUrls[photo.key] && (
                            <Image
                              src={previewUrls[photo.key]}
                              alt={photo.file.name}
                              fill
                              unoptimized
                              className="object-cover"
                            />
                          )}

                          {primary && (
                            <span className="absolute left-2 top-2 rounded-full bg-neon/90 px-2 py-1 text-[10px] font-semibold text-white">
                              Primary photo
                            </span>
                          )}
                        </div>

                        <div className="space-y-2 p-3">
                          <p className="truncate text-xs text-text-secondary">
                            {photo.file.name}
                          </p>

                          <button
                            type="button"
                            onClick={() => setPrimaryPhotoKey(photo.key)}
                            disabled={primary}
                            className="block text-xs font-medium text-lavender hover:text-blush disabled:opacity-50"
                          >
                            {primary ? "Main photo selected" : "Make primary"}
                          </button>

                          <button
                            type="button"
                            onClick={() => removeNewPhoto(photo.key)}
                            className="block text-xs text-muted hover:text-danger"
                          >
                            Remove photo
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </section>

          {/* Submit */}
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Link
              href={`/manicures/${manicureId}`}
              className="rounded-lg border border-border-strong px-5 py-2.5 text-center text-sm font-medium text-text-secondary transition-colors hover:border-neon hover:text-lavender"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-berry px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-berry-dark disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Saving changes..." : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
