"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

import {
  createDesign,
  getPowders,
  getTags,
  uploadDesignPhoto,
  Powder,
  Tag,
  Design,
  DesignInput,
} from "@/lib/api";

export default function NewDesignPage() {
  const router = useRouter();

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

  // Photos
  const [photos, setPhotos] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [primaryPhotoIndex, setPrimaryPhotoIndex] = useState(0);

  // Page state
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [photoError, setPhotoError] = useState("");
  const [photoUploadWarning, setPhotoUploadWarning] = useState("");
  const [savedDesignId, setSavedDesignId] = useState<number | null>(null);

  // Load the user's powders and tags.
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

  // Create and clean up local image previews.
  useEffect(() => {
    const urls = photos.map((photo) => URL.createObjectURL(photo));

    setPreviewUrls(urls);

    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [photos]);

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
    const validFiles: File[] = [];
    const rejectedFiles: string[] = [];

    const maxFileSize = 5 * 1024 * 1024;

    selectedFiles.forEach((file) => {
      if (!file.type.startsWith("image/")) {
        rejectedFiles.push(`${file.name} is not an image.`);
      } else if (file.size > maxFileSize) {
        rejectedFiles.push(`${file.name} exceeds the 5 MB limit.`);
      } else {
        validFiles.push(file);
      }
    });

    setPhotos(validFiles);
    setPrimaryPhotoIndex(0);
    setPhotoError(rejectedFiles.join(" "));

    // Allow the same files to be selected again.
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

    if (!title.trim()) {
      setError("Please enter a title for your design.");
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
      style: style.trim(),
      nail_shape: nailShape,
      instructions: instructions.trim(),
      status,
      powders: selectedPowders,
      tags: selectedTags,
    };

    setSaving(true);

    let createdDesign: Design;

    // Step 1: Save the design and its relationships.
    try {
      createdDesign = await createDesign(token, designData);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not save your design.";

      setError(message);

      if (message.includes("session has expired")) {
        sessionStorage.removeItem("accessToken");
        sessionStorage.removeItem("refreshToken");
        router.replace("/login");
      }

      setSaving(false);
      return;
    }

    // Step 2: Upload photos after the design exists.
    const uploadErrors: string[] = [];

    for (let index = 0; index < photos.length; index++) {
      try {
        await uploadDesignPhoto(
          token,
          createdDesign.id,
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
    setSavedDesignId(createdDesign.id);

    if (uploadErrors.length > 0) {
      setPhotoUploadWarning(
        `Your design was saved, but ${uploadErrors.length} photo(s) could not be uploaded. You can add or retry photos from the design detail page once it is available.`
      );
      return;
    }

    router.push("/designs");
  }

  const filteredPowders = powders.filter((powder) => {
    const query = powderSearch.toLowerCase().trim();

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
            href="/designs"
            className="text-sm text-muted transition-colors hover:text-lavender"
          >
            ← Back to designs
          </Link>

          <p className="mt-6 text-sm tracking-widest text-blush">
            YOUR DESIGN COLLECTION
          </p>

          <h1 className="mt-2 font-serif text-3xl text-lavender">
            Create a design
          </h1>

          <p className="mt-2 text-text-secondary">
            Save a nail design idea, the colours you want to use, and any
            inspiration or instructions you want to keep.
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

        {photoUploadWarning && (
          <div
            role="alert"
            className="mb-6 rounded-xl border border-border-strong bg-surface p-4 text-sm text-text-secondary"
          >
            <p>{photoUploadWarning}</p>

            {savedDesignId && (
              <Link
                href="/designs"
                className="mt-3 inline-block font-medium text-lavender hover:text-blush"
              >
                Return to your designs →
              </Link>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic details */}
          <section className="rounded-2xl border border-border bg-surface p-5 shadow-card md:p-6">
            <h2 className="font-serif text-xl text-lavender">Design details</h2>

            <p className="mt-1 text-xs text-muted">
              Give your design a name and describe its overall look.
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
                  placeholder="e.g. Lavender chrome French tips"
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
                    Source
                  </label>

                  <select
                    id="design-source"
                    value={source}
                    onChange={(event) =>
                      setSource(event.target.value as Design["source"])
                    }
                    className="w-full rounded-lg border border-border-strong bg-surface-elevated px-3 py-2.5 text-sm text-text"
                  >
                    <option value="manual">My own idea</option>
                    <option value="inspiration">External inspiration</option>
                    <option value="ai">AI generated</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="design-status"
                    className="mb-1 block text-sm font-medium text-text-secondary"
                  >
                    Status
                  </label>

                  <select
                    id="design-status"
                    value={status}
                    onChange={(event) =>
                      setStatus(event.target.value as Design["status"])
                    }
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
                    placeholder="e.g. Minimalist, gothic, floral..."
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

                  <select
                    id="design-nail-shape"
                    value={nailShape}
                    onChange={(event) => setNailShape(event.target.value)}
                    className="w-full rounded-lg border border-border-strong bg-surface-elevated px-3 py-2.5 text-sm text-text"
                  >
                    <option value="">Not specified</option>
                    <option value="almond">Almond</option>
                    <option value="oval">Oval</option>
                    <option value="square">Square</option>
                    <option value="coffin">Coffin</option>
                    <option value="stiletto">Stiletto</option>
                    <option value="round">Round</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label
                  htmlFor="design-instructions"
                  className="mb-1 block text-sm font-medium text-text-secondary"
                >
                  Description and instructions
                </label>

                <textarea
                  id="design-instructions"
                  value={instructions}
                  onChange={(event) => setInstructions(event.target.value)}
                  rows={5}
                  placeholder="Describe the design, application steps, colour combinations, or details you want to remember..."
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
                  Organise this design with your existing tags.
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
            <h2 className="font-serif text-xl text-lavender">Design photos</h2>

            <p className="mt-1 text-xs text-muted">
              Add reference images or photos of your finished design. Choose one
              as the main image.
            </p>

            <div className="mt-5">
              <label
                htmlFor="design-photos"
                className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-border-strong bg-background p-8 text-center transition-colors hover:border-neon"
              >
                <span className="text-2xl text-lavender">＋</span>

                <span className="mt-2 text-sm font-medium text-text-secondary">
                  Choose photos
                </span>

                <span className="mt-1 text-xs text-muted">
                  Select multiple images · Maximum 5 MB per image
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

            {photoError && (
              <p role="alert" className="mt-3 text-sm text-danger">
                {photoError}
              </p>
            )}

            {photos.length > 0 && (
              <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
                {photos.map((photo, index) => (
                  <div
                    key={`${photo.name}-${photo.lastModified}-${index}`}
                    className="overflow-hidden rounded-xl border border-border bg-background"
                  >
                    <div className="relative aspect-[4/5]">
                      {previewUrls[index] && (
                        <Image
                          src={previewUrls[index]}
                          alt={photo.name}
                          fill
                          unoptimized
                          className="object-cover"
                        />
                      )}

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
                ))}
              </div>
            )}
          </section>

          {/* Submit */}
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Link
              href="/designs"
              className="rounded-lg border border-border-strong px-5 py-2.5 text-center text-sm font-medium text-text-secondary transition-colors hover:border-neon hover:text-lavender"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={saving || loadingOptions || savedDesignId !== null}
              className="rounded-lg bg-berry px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-berry-dark disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving
                ? "Saving design..."
                : savedDesignId
                ? "Design saved"
                : "Save design"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
