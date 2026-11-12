"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

import {
  getDesign,
  updateDesign,
  getDesignPhotos,
  uploadDesignPhoto,
  updateDesignPhoto,
  deleteDesignPhoto,
  getPowders,
  getTags,
  getImageUrl,
  Powder,
  Tag,
  Design,
  DesignInput,
  DesignPhoto,
} from "@/lib/api";

type NewPhoto = {
  key: string;
  file: File;
};

const MAX_PHOTO_SIZE = 5 * 1024 * 1024;

export default function EditDesignPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const designId = Number(params.id);

  // Design fields
  const [title, setTitle] = useState("");
  const [source, setSource] = useState<Design["source"]>("manual");
  const [status, setStatus] = useState<Design["status"]>("idea");
  const [style, setStyle] = useState("");
  const [nailShape, setNailShape] = useState("");
  const [instructions, setInstructions] = useState("");

  // Related objects
  const [powders, setPowders] = useState<Powder[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedPowders, setSelectedPowders] = useState<number[]>([]);
  const [selectedTags, setSelectedTags] = useState<number[]>([]);
  const [powderSearch, setPowderSearch] = useState("");

  // Existing and new photos
  const [existingPhotos, setExistingPhotos] = useState<DesignPhoto[]>([]);
  const [deletedPhotoIds, setDeletedPhotoIds] = useState<number[]>([]);
  const [newPhotos, setNewPhotos] = useState<NewPhoto[]>([]);
  const [primaryPhotoKey, setPrimaryPhotoKey] = useState<string | null>(null);
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});

  // Page state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [photoWarning, setPhotoWarning] = useState("");

  // Load design and form options
  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      if (!Number.isInteger(designId) || designId <= 0) {
        setError("Invalid design ID.");
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

        const [designData, photoData, powderData, tagData] = await Promise.all([
          getDesign(token, designId),
          getDesignPhotos(token, designId),
          getPowders(token),
          getTags(token),
        ]);

        if (cancelled) return;

        setTitle(designData.title);
        setSource(designData.source);
        setStatus(designData.status);
        setStyle(designData.style || "");
        setNailShape(designData.nail_shape || "");
        setInstructions(designData.instructions || "");

        setSelectedPowders(designData.powders);
        setSelectedTags(designData.tags);

        setExistingPhotos(photoData);
        setDeletedPhotoIds([]);
        setNewPhotos([]);

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
            err instanceof Error ? err.message : "Could not load this design.";

          setError(message);

          if (message.toLowerCase().includes("session has expired")) {
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
  }, [designId, router]);

  // Create and clean up preview URLs for newly selected photos
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

  // Filter powders by name, brand or product code
  const filteredPowders = useMemo(() => {
    const query = powderSearch.toLowerCase().trim();

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
    const validFiles: File[] = [];
    const rejectedFiles: string[] = [];

    files.forEach((file) => {
      if (!file.type.startsWith("image/")) {
        rejectedFiles.push(`${file.name} is not an image.`);
      } else if (file.size > MAX_PHOTO_SIZE) {
        rejectedFiles.push(`${file.name} exceeds the 5 MB limit.`);
      } else {
        validFiles.push(file);
      }
    });

    const addedPhotos = validFiles.map((file) => ({
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

    setPhotoWarning(rejectedFiles.length > 0 ? rejectedFiles.join(" ") : "");

    // Allow selecting the same file again after removing it
    event.target.value = "";
  }

  function removeNewPhoto(key: string) {
    const remaining = newPhotos.filter((photo) => photo.key !== key);

    setNewPhotos(remaining);

    if (primaryPhotoKey === key) {
      const nextExisting = existingPhotos.find(
        (photo) => !deletedPhotoIds.includes(photo.id)
      );

      setPrimaryPhotoKey(
        nextExisting ? `existing-${nextExisting.id}` : remaining[0]?.key || null
      );
    }
  }

  function removeExistingPhoto(photoId: number) {
    setDeletedPhotoIds((previous) =>
      previous.includes(photoId) ? previous : [...previous, photoId]
    );

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

    if (!title.trim()) {
      setError("Please enter a title for this design.");
      return;
    }

    const token = sessionStorage.getItem("accessToken");

    if (!token) {
      router.replace("/login");
      return;
    }

    const designData: DesignInput = {
      title: title.trim(),
      source,
      status,
      style: style.trim(),
      nail_shape: nailShape.trim(),
      instructions: instructions.trim(),
      powders: selectedPowders,
      tags: selectedTags,
    };

    // Determine which photo should be primary after all pending changes.
    const activeExistingPhotos = existingPhotos.filter(
      (photo) => !deletedPhotoIds.includes(photo.id)
    );

    const activeNewPhotos = newPhotos;

    const hasRemainingPhotos =
      activeExistingPhotos.length > 0 || activeNewPhotos.length > 0;

    let effectivePrimaryKey = primaryPhotoKey;

    const primaryIsValid =
      (effectivePrimaryKey?.startsWith("existing-") &&
        activeExistingPhotos.some(
          (photo) => `existing-${photo.id}` === effectivePrimaryKey
        )) ||
      activeNewPhotos.some((photo) => photo.key === effectivePrimaryKey);

    if (hasRemainingPhotos && !primaryIsValid) {
      effectivePrimaryKey = activeExistingPhotos.length
        ? `existing-${activeExistingPhotos[0].id}`
        : activeNewPhotos[0].key;
    }

    setSaving(true);

    try {
      // Step 1: Update design details and relationships.
      await updateDesign(token, designId, designData);

      // Step 2: Set an existing photo as primary, if selected.
      if (effectivePrimaryKey?.startsWith("existing-")) {
        const primaryId = Number(effectivePrimaryKey.replace("existing-", ""));

        await updateDesignPhoto(token, primaryId, {
          is_primary: true,
        });
      }

      // Step 3: Upload the new primary photo first, if applicable.
      // The backend will unset the previous primary photo.
      const primaryNewPhoto = activeNewPhotos.find(
        (photo) => photo.key === effectivePrimaryKey
      );

      if (primaryNewPhoto) {
        await uploadDesignPhoto(token, designId, primaryNewPhoto.file, true);
      }

      // Step 4: Upload the remaining new photos.
      for (const photo of activeNewPhotos) {
        if (photo.key === effectivePrimaryKey) continue;

        await uploadDesignPhoto(token, designId, photo.file, false);
      }

      // Step 5: Delete existing photos marked for removal.
      for (const photoId of deletedPhotoIds) {
        await deleteDesignPhoto(token, photoId);
      }

      router.push(`/designs/${designId}`);
      router.refresh();
    } catch (err) {
      console.error("Failed to update design:", err);

      const message =
        err instanceof Error ? err.message : "Could not update your design.";

      setError(
        `The update could not be completed: ${message}. Some changes may already have been saved. Reload the page before trying again to avoid duplicate uploads.`
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

  if (error && !title) {
    return (
      <main className="min-h-screen bg-background px-5 py-10">
        <div className="mx-auto max-w-4xl">
          <Link
            href="/designs"
            className="text-sm text-muted hover:text-lavender"
          >
            ← Back to designs
          </Link>

          <div className="mt-8 rounded-2xl border border-border bg-surface p-6">
            <h1 className="font-serif text-2xl text-lavender">
              Unable to load design
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
            href={`/designs/${designId}`}
            className="text-sm text-muted transition-colors hover:text-lavender"
          >
            ← Back to design
          </Link>

          <p className="mt-6 text-sm tracking-widest text-blush">
            YOUR DESIGN COLLECTION
          </p>

          <h1 className="mt-2 font-serif text-3xl text-lavender">
            Edit design
          </h1>

          <p className="mt-2 text-text-secondary">
            Update the details, colours and photos of your nail design.
          </p>
        </header>

        {error && (
          <div
            role="alert"
            className="mb-6 rounded-xl border border-danger/30 bg-surface p-4 text-sm text-danger"
          >
            {error}
          </div>
        )}

        {photoWarning && (
          <div
            role="alert"
            className="mb-6 rounded-xl border border-border-strong bg-surface p-4 text-sm text-text-secondary"
          >
            {photoWarning}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Design details */}
          <section className="rounded-2xl border border-border bg-surface p-5 shadow-card md:p-6">
            <h2 className="font-serif text-xl text-lavender">Design details</h2>

            <p className="mt-1 text-xs text-muted">
              The basic information about your design.
            </p>

            <div className="mt-5 space-y-4">
              <div>
                <label
                  htmlFor="design-title"
                  className="mb-1 block text-sm font-medium text-text-secondary"
                >
                  Title *
                </label>

                <input
                  id="design-title"
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
                    htmlFor="design-source"
                    className="mb-1 block text-sm font-medium text-text-secondary"
                  >
                    Source *
                  </label>

                  <select
                    id="design-source"
                    value={source}
                    onChange={(event) =>
                      setSource(event.target.value as Design["source"])
                    }
                    required
                    className="w-full rounded-lg border border-border-strong bg-surface-elevated px-3 py-2.5 text-sm text-text"
                  >
                    <option value="manual">Manual</option>
                    <option value="ai">AI generated</option>
                    <option value="inspiration">Inspiration</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="design-status"
                    className="mb-1 block text-sm font-medium text-text-secondary"
                  >
                    Status *
                  </label>

                  <select
                    id="design-status"
                    value={status}
                    onChange={(event) =>
                      setStatus(event.target.value as Design["status"])
                    }
                    required
                    className="w-full rounded-lg border border-border-strong bg-surface-elevated px-3 py-2.5 text-sm text-text"
                  >
                    <option value="idea">Idea</option>
                    <option value="planned">Planned</option>
                    <option value="tried">Tried</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="design-style"
                    className="mb-1 block text-sm font-medium text-text-secondary"
                  >
                    Style
                  </label>

                  <input
                    id="design-style"
                    type="text"
                    value={style}
                    onChange={(event) => setStyle(event.target.value)}
                    placeholder="e.g. Minimalist, floral, gothic..."
                    className="w-full rounded-lg border border-border-strong bg-surface-elevated px-4 py-2.5 text-sm text-text outline-none focus:border-neon"
                  />
                </div>

                <div>
                  <label
                    htmlFor="design-nail-shape"
                    className="mb-1 block text-sm font-medium text-text-secondary"
                  >
                    Nail shape
                  </label>

                  <input
                    id="design-nail-shape"
                    type="text"
                    value={nailShape}
                    onChange={(event) => setNailShape(event.target.value)}
                    placeholder="e.g. Almond, square, coffin..."
                    className="w-full rounded-lg border border-border-strong bg-surface-elevated px-4 py-2.5 text-sm text-text outline-none focus:border-neon"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="design-instructions"
                  className="mb-1 block text-sm font-medium text-text-secondary"
                >
                  Instructions and notes
                </label>

                <textarea
                  id="design-instructions"
                  value={instructions}
                  onChange={(event) => setInstructions(event.target.value)}
                  rows={5}
                  placeholder="Describe the design, application steps, details to remember..."
                  className="w-full resize-y rounded-lg border border-border-strong bg-surface-elevated px-4 py-3 text-sm text-text outline-none focus:border-neon"
                />
              </div>
            </div>
          </section>

          {/* Powders */}
          <section className="rounded-2xl border border-border bg-surface p-5 shadow-card md:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-serif text-xl text-lavender">Powders</h2>
                <p className="mt-1 text-xs text-muted">
                  Select the colours you want to use for this design.
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
                  Organise your design with your existing tags.
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
            <h2 className="font-serif text-xl text-lavender">Design photos</h2>

            <p className="mt-1 text-xs text-muted">
              Manage existing photos or add new ones. Choose one primary photo.
              Each image must be 5 MB or smaller.
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
                    const primary = primaryPhotoKey === key && !deleted;

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
                            alt={photo.caption || "Design photo"}
                            fill
                            unoptimized
                            className="object-cover"
                          />

                          {primary && (
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

            {/* Add new photos */}
            <div className="mt-6">
              <label
                htmlFor="design-photos"
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
                  id="design-photos"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoChange}
                  className="sr-only"
                />
              </label>
            </div>

            {/* New photo previews */}
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

          {/* Actions */}
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Link
              href={`/designs/${designId}`}
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
