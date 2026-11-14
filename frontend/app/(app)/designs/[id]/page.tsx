"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Maximize2, X, ChevronLeft, ChevronRight, Upload } from "lucide-react";

import {
  deleteDesign,
  deleteDesignPhoto,
  getDesign,
  getDesignPhotos,
  getImageUrl,
  getPowders,
  getTags,
  updateDesignPhoto,
  uploadDesignPhoto,
  Design,
  DesignPhoto,
  Powder,
  Tag,
} from "@/lib/api";

export default function DesignDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const designId = Number(params.id);

  const [design, setDesign] = useState<Design | null>(null);
  const [photos, setPhotos] = useState<DesignPhoto[]>([]);
  const [powders, setPowders] = useState<Powder[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);

  const [selectedPhotoId, setSelectedPhotoId] = useState<number | null>(null);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const [fileInputKey, setFileInputKey] = useState(0);

  const [updatingPhotoId, setUpdatingPhotoId] = useState<number | null>(null);
  const [editingPhotoId, setEditingPhotoId] = useState<number | null>(null);
  const [editedCaption, setEditedCaption] = useState("");
  const [savingCaption, setSavingCaption] = useState(false);

  useEffect(() => {
    async function loadDesign() {
      if (!Number.isInteger(designId) || designId <= 0) {
        setError("Invalid design ID.");
        setLoading(false);
        return;
      }

      const token = sessionStorage.getItem("accessToken");

      if (!token) {
        router.push("/login");
        return;
      }

      try {
        setLoading(true);
        setError("");

        const [designData, photoData] = await Promise.all([
          getDesign(token, designId),
          getDesignPhotos(token, designId),
        ]);

        setDesign(designData);
        setPhotos(photoData);

        const primaryPhoto = photoData.find((photo) => photo.is_primary);
        setSelectedPhotoId(primaryPhoto?.id ?? photoData[0]?.id ?? null);

        // Supporting data should not prevent the design itself from loading.
        try {
          const powderData = await getPowders(token);
          setPowders(powderData);
        } catch {
          setPowders([]);
        }

        try {
          const tagData = await getTags(token);
          setTags(tagData);
        } catch {
          setTags([]);
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Could not load this design."
        );
      } finally {
        setLoading(false);
      }
    }

    loadDesign();
  }, [designId, router]);

  const selectedPowders = useMemo(() => {
    if (!design) return [];

    return powders.filter((powder) => design.powders.includes(powder.id));
  }, [design, powders]);

  const selectedTags = useMemo(() => {
    if (!design) return [];

    return tags.filter((tag) => design.tags.includes(tag.id));
  }, [design, tags]);

  const sortedPhotos = useMemo(
    () =>
      [...photos].sort((a, b) => Number(b.is_primary) - Number(a.is_primary)),
    [photos]
  );

  const mainPhoto =
    sortedPhotos.find((photo) => photo.id === selectedPhotoId) ??
    sortedPhotos[0] ??
    null;

  const currentPhotoIndex = sortedPhotos.findIndex(
    (photo) => photo.id === mainPhoto?.id
  );

  useEffect(() => {
    if (!isLightboxOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsLightboxOpen(false);
      }

      if (event.key === "ArrowRight" && sortedPhotos.length > 1) {
        const nextIndex = (currentPhotoIndex + 1) % sortedPhotos.length;
        setSelectedPhotoId(sortedPhotos[nextIndex].id);
      }

      if (event.key === "ArrowLeft" && sortedPhotos.length > 1) {
        const previousIndex =
          (currentPhotoIndex - 1 + sortedPhotos.length) % sortedPhotos.length;

        setSelectedPhotoId(sortedPhotos[previousIndex].id);
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isLightboxOpen, sortedPhotos, currentPhotoIndex]);

  async function handleUploadPhoto() {
    if (!selectedFile || !design) return;

    const token = sessionStorage.getItem("accessToken");

    if (!token) {
      router.push("/login");
      return;
    }

    setUploading(true);

    try {
      // The first uploaded photo becomes the primary photo automatically.
      const shouldBePrimary = photos.length === 0;

      const uploadedPhoto = await uploadDesignPhoto(
        token,
        design.id,
        selectedFile,
        shouldBePrimary,
        caption.trim()
      );

      setPhotos((previous) => [
        ...previous.map((photo) =>
          uploadedPhoto.is_primary ? { ...photo, is_primary: false } : photo
        ),
        uploadedPhoto,
      ]);

      setSelectedPhotoId(uploadedPhoto.id);
      setSelectedFile(null);
      setCaption("");
      setFileInputKey((previous) => previous + 1);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not upload photo.");
    } finally {
      setUploading(false);
    }
  }

  async function handleSetPrimary(photoId: number) {
    const token = sessionStorage.getItem("accessToken");

    if (!token) {
      router.push("/login");
      return;
    }

    setUpdatingPhotoId(photoId);

    try {
      const updatedPhoto = await updateDesignPhoto(token, photoId, {
        is_primary: true,
      });

      setPhotos((previous) =>
        previous.map((photo) => ({
          ...photo,
          is_primary: photo.id === updatedPhoto.id,
        }))
      );

      setError("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not update the primary photo."
      );
    } finally {
      setUpdatingPhotoId(null);
    }
  }

  function handleEditCaption(photo: DesignPhoto) {
    setEditingPhotoId(photo.id);
    setEditedCaption(photo.caption);
  }

  function handleCancelCaptionEdit() {
    setEditingPhotoId(null);
    setEditedCaption("");
  }

  async function handleSaveCaption(photoId: number) {
    const token = sessionStorage.getItem("accessToken");

    if (!token) {
      router.push("/login");
      return;
    }

    setSavingCaption(true);

    try {
      const updatedPhoto = await updateDesignPhoto(token, photoId, {
        caption: editedCaption.trim(),
      });

      setPhotos((previous) =>
        previous.map((photo) => (photo.id === photoId ? updatedPhoto : photo))
      );

      setEditingPhotoId(null);
      setEditedCaption("");
      setError("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not update caption."
      );
    } finally {
      setSavingCaption(false);
    }
  }

  async function handleDeletePhoto(photoId: number) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this photo?"
    );

    if (!confirmed) return;

    const token = sessionStorage.getItem("accessToken");

    if (!token) {
      router.push("/login");
      return;
    }

    try {
      await deleteDesignPhoto(token, photoId);

      const remainingPhotos = photos.filter((photo) => photo.id !== photoId);

      setPhotos(remainingPhotos);

      if (selectedPhotoId === photoId) {
        const nextPrimary =
          remainingPhotos.find((photo) => photo.is_primary) ??
          remainingPhotos[0] ??
          null;

        setSelectedPhotoId(nextPrimary?.id ?? null);
      }

      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete photo.");
    }
  }

  async function handleDeleteDesign() {
    if (!design) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete "${design.title}"? This action cannot be undone.`
    );

    if (!confirmed) return;

    const token = sessionStorage.getItem("accessToken");

    if (!token) {
      router.push("/login");
      return;
    }

    try {
      setDeleting(true);
      await deleteDesign(token, design.id);
      router.push("/designs");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not delete this design."
      );
      setDeleting(false);
    }
  }

  function formatChoice(value: string | null | undefined) {
    if (!value) return "Not specified";

    return value
      .replaceAll("_", " ")
      .replaceAll("-", " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-background px-6 py-12 text-text">
        <div className="mx-auto max-w-6xl animate-pulse space-y-6">
          <div className="h-5 w-32 rounded bg-surface-elevated" />
          <div className="h-10 w-72 rounded bg-surface-elevated" />
          <div className="h-80 rounded-2xl bg-surface" />
        </div>
      </main>
    );
  }

  if (error && !design) {
    return (
      <main className="min-h-screen bg-background px-6 py-12 text-text">
        <div className="mx-auto max-w-3xl">
          <Link
            href="/designs"
            className="text-sm text-blush transition hover:text-lavender"
          >
            ← Back to designs
          </Link>

          <div className="mt-8 rounded-2xl border border-border bg-surface p-8">
            <h1 className="text-xl font-semibold">Something went wrong</h1>
            <p className="mt-3 text-sm text-text-secondary">{error}</p>
          </div>
        </div>
      </main>
    );
  }

  if (!design) return null;

  return (
    <main className="min-h-screen bg-background px-4 py-8 text-text sm:px-6 lg:py-12">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/designs"
          className="inline-flex items-center gap-2 text-sm text-text-secondary transition hover:text-lavender"
        >
          ← Back to designs
        </Link>

        {error && (
          <div className="mt-6 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
            {error}
          </div>
        )}

        {/* Header */}
        <div className="mt-7 flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-blush">
              Design details
            </p>

            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-text sm:text-4xl">
              {design.title}
            </h1>

            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-full border border-border-strong bg-surface px-3 py-1 text-xs font-medium text-lavender">
                {formatChoice(design.status)}
              </span>

              <span className="rounded-full border border-border bg-surface px-3 py-1 text-xs text-text-secondary">
                {formatChoice(design.source)}
              </span>
            </div>
          </div>

          <div className="flex gap-3">
            <Link
              href={`/designs/${design.id}/edit`}
              className="rounded-xl border border-border-strong px-5 py-2.5 text-sm font-medium text-lavender transition hover:bg-surface"
            >
              Edit
            </Link>

            <button
              type="button"
              onClick={handleDeleteDesign}
              disabled={deleting}
              className="rounded-xl border border-danger/30 px-5 py-2.5 text-sm font-medium text-danger transition hover:bg-danger/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {deleting ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>

        {/* Main content */}
        <div className="mt-8 grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          {/* Photo gallery */}
          <section>
            {mainPhoto ? (
              <div className="space-y-4">
                <button
                  type="button"
                  onClick={() => setIsLightboxOpen(true)}
                  aria-label="Open photo in full-screen viewer"
                  className="group relative block aspect-[4/5] max-h-[680px] w-full overflow-hidden rounded-2xl border border-border bg-surface text-left"
                >
                  <Image
                    src={getImageUrl(mainPhoto.image)}
                    alt={mainPhoto.caption || design.title}
                    fill
                    unoptimized
                    className="object-cover transition duration-300 group-hover:scale-[1.02]"
                    priority
                  />

                  {mainPhoto.is_primary && (
                    <span className="absolute left-4 top-4 rounded-full border border-white/20 bg-black/60 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm">
                      Primary photo
                    </span>
                  )}

                  <span className="absolute bottom-4 right-4 rounded-full bg-black/60 px-3 py-2 text-xs font-medium text-white opacity-0 backdrop-blur-sm transition group-hover:opacity-100">
                    <span className="flex items-center gap-2">
                      <Maximize2 size={16} />
                      View full size
                    </span>
                  </span>
                </button>

                {sortedPhotos.length > 1 && (
                  <div className="grid grid-cols-4 gap-3 sm:grid-cols-5">
                    {sortedPhotos.map((photo) => {
                      const isSelected = mainPhoto.id === photo.id;

                      return (
                        <button
                          key={photo.id}
                          type="button"
                          onClick={() => setSelectedPhotoId(photo.id)}
                          aria-label={`View photo${
                            photo.is_primary ? ", primary photo" : ""
                          }`}
                          aria-pressed={isSelected}
                          className={`relative aspect-square overflow-hidden rounded-xl border-2 bg-surface transition ${
                            isSelected
                              ? "border-neon ring-2 ring-neon/20"
                              : "border-border hover:border-border-strong"
                          }`}
                        >
                          <Image
                            src={getImageUrl(photo.image)}
                            alt={photo.caption || "Design photo"}
                            fill
                            unoptimized
                            sizes="(max-width: 640px) 25vw, 120px"
                            className="object-cover transition duration-300 hover:scale-105"
                          />

                          {photo.is_primary && (
                            <span className="absolute bottom-1 left-1 rounded-full bg-black/70 px-2 py-1 text-[9px] font-medium text-white">
                              Primary
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}

                {mainPhoto.caption && (
                  <p className="text-sm text-text-secondary">
                    {mainPhoto.caption}
                  </p>
                )}
              </div>
            ) : (
              <div className="flex aspect-[4/5] max-h-[680px] items-center justify-center rounded-2xl border border-dashed border-border-strong bg-surface">
                <div className="text-center">
                  <div className="text-4xl text-muted">✧</div>
                  <p className="mt-3 text-sm text-muted">No photos added yet</p>
                </div>
              </div>
            )}

            {/* Upload */}
            <div className="mt-6 rounded-2xl border border-border bg-surface p-5">
              <h2 className="text-sm font-semibold text-text">Add a photo</h2>

              <div className="mt-4 space-y-3">
                <input
                  key={fileInputKey}
                  type="file"
                  accept="image/*"
                  onChange={(event) =>
                    setSelectedFile(event.target.files?.[0] ?? null)
                  }
                  className="block w-full text-sm text-text-secondary file:mr-4 file:rounded-lg file:border-0 file:bg-surface-elevated file:px-4 file:py-2 file:text-sm file:font-medium file:text-text hover:file:bg-border"
                />

                <input
                  type="text"
                  value={caption}
                  onChange={(event) => setCaption(event.target.value)}
                  maxLength={200}
                  placeholder="Add a caption (optional)"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text placeholder:text-muted focus:border-neon focus:outline-none"
                />

                <button
                  type="button"
                  onClick={handleUploadPhoto}
                  disabled={!selectedFile || uploading}
                  className="inline-flex items-center gap-2 rounded-lg bg-berry px-4 py-2 text-sm font-medium text-white transition hover:bg-berry-dark disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Upload size={16} />
                  {uploading ? "Uploading..." : "Upload photo"}
                </button>
              </div>
            </div>

            {/* Photo management */}
            {sortedPhotos.length > 0 && (
              <section className="mt-8">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Manage photos</h2>
                  <span className="text-sm text-muted">
                    {photos.length} {photos.length === 1 ? "photo" : "photos"}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  {sortedPhotos.map((photo) => (
                    <div
                      key={photo.id}
                      className="overflow-hidden rounded-xl border border-border bg-surface"
                    >
                      <div className="relative aspect-square">
                        <Image
                          src={getImageUrl(photo.image)}
                          alt={photo.caption || design.title}
                          fill
                          unoptimized
                          className="object-cover"
                        />

                        {photo.is_primary && (
                          <span className="absolute left-2 top-2 rounded-full bg-berry px-3 py-1 text-xs font-medium text-white">
                            Primary
                          </span>
                        )}
                      </div>

                      <div className="space-y-3 p-3">
                        {editingPhotoId === photo.id ? (
                          <>
                            <input
                              type="text"
                              value={editedCaption}
                              onChange={(event) =>
                                setEditedCaption(event.target.value)
                              }
                              maxLength={200}
                              autoFocus
                              aria-label="Edit photo caption"
                              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text focus:border-neon focus:outline-none"
                            />

                            <p className="text-right text-xs text-muted">
                              {editedCaption.length}/200
                            </p>

                            <div className="flex gap-3">
                              <button
                                type="button"
                                onClick={() => handleSaveCaption(photo.id)}
                                disabled={savingCaption}
                                className="text-xs font-medium text-blush hover:text-lavender disabled:opacity-50"
                              >
                                {savingCaption ? "Saving..." : "Save"}
                              </button>

                              <button
                                type="button"
                                onClick={handleCancelCaptionEdit}
                                disabled={savingCaption}
                                className="text-xs font-medium text-muted hover:text-text"
                              >
                                Cancel
                              </button>
                            </div>
                          </>
                        ) : (
                          <>
                            <p className="min-h-5 text-sm text-text-secondary">
                              {photo.caption || "No caption"}
                            </p>

                            <div className="flex flex-col gap-2">
                              <button
                                type="button"
                                onClick={() => handleEditCaption(photo)}
                                disabled={editingPhotoId !== null}
                                className="text-left text-xs font-medium text-blush hover:text-lavender disabled:opacity-50"
                              >
                                Edit caption
                              </button>

                              {!photo.is_primary && (
                                <button
                                  type="button"
                                  onClick={() => handleSetPrimary(photo.id)}
                                  disabled={
                                    updatingPhotoId !== null ||
                                    editingPhotoId !== null
                                  }
                                  className="text-left text-xs font-medium text-blush hover:text-lavender disabled:opacity-50"
                                >
                                  {updatingPhotoId === photo.id
                                    ? "Updating..."
                                    : "Set as primary"}
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => handleDeletePhoto(photo.id)}
                                disabled={editingPhotoId !== null}
                                className="text-left text-xs font-medium text-danger hover:text-red-300 disabled:opacity-50"
                              >
                                Remove photo
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </section>

          {/* Design information */}
          <div className="space-y-6">
            <section className="rounded-2xl border border-border bg-surface p-6 shadow-card">
              <h2 className="text-lg font-semibold">Details</h2>

              <div className="mt-5 grid grid-cols-2 gap-x-5 gap-y-6">
                <DetailItem
                  label="Source"
                  value={formatChoice(design.source)}
                />
                <DetailItem
                  label="Status"
                  value={formatChoice(design.status)}
                />
                <DetailItem label="Style" value={formatChoice(design.style)} />
                <DetailItem
                  label="Nail shape"
                  value={formatChoice(design.nail_shape)}
                />
              </div>
            </section>

            {/* Powders */}
            <section className="rounded-2xl border border-border bg-surface p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold">Powders needed</h2>
                <span className="text-xs text-muted">
                  {selectedPowders.length}{" "}
                  {selectedPowders.length === 1 ? "powder" : "powders"}
                </span>
              </div>

              {selectedPowders.length > 0 ? (
                <div className="mt-4 space-y-3">
                  {selectedPowders.map((powder) => (
                    <Link
                      key={powder.id}
                      href={`/collection/${powder.id}`}
                      className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface-elevated px-4 py-3 transition hover:border-blush"
                    >
                      <div>
                        <p className="font-medium text-text">{powder.name}</p>
                        {powder.brand && (
                          <p className="mt-1 text-xs text-muted">
                            {powder.brand}
                          </p>
                        )}
                      </div>

                      <span className="text-blush">→</span>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-sm text-muted">
                  No powders linked to this design.
                </p>
              )}
            </section>

            {/* Tags */}
            <section className="rounded-2xl border border-border bg-surface p-6">
              <h2 className="text-lg font-semibold">Tags</h2>

              {selectedTags.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {selectedTags.map((tag) => (
                    <span
                      key={tag.id}
                      className="rounded-full border border-border-strong bg-surface-elevated px-3 py-1.5 text-xs font-medium text-lavender"
                    >
                      {tag.name}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm text-muted">No tags added.</p>
              )}
            </section>

            {/* AI-generated design plan */}
            {design.source === "ai" && design.generated_plan && (
              <section className="rounded-2xl border border-border bg-surface p-6 shadow-card">
                <h2 className="text-lg font-semibold">
                  AI-generated design plan
                </h2>

                {/* Concept */}
                <div className="mt-4">
                  <h3 className="text-sm font-medium text-lavender">
                    Design concept
                  </h3>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-text-secondary">
                    {design.generated_plan.concept}
                  </p>
                </div>

                {/* Palette */}
                <div className="mt-6">
                  <h3 className="text-sm font-medium text-lavender">
                    Colour palette
                  </h3>

                  <div className="mt-3 space-y-3">
                    {design.generated_plan.palette.map((item) => {
                      const powder = selectedPowders.find(
                        (p) => p.id === item.powder_id
                      );

                      return (
                        <div
                          key={item.powder_id}
                          className="flex gap-3 rounded-xl border border-border bg-surface-elevated p-3"
                        >
                          <div
                            className="h-11 w-11 shrink-0 rounded-lg border border-border"
                            style={{
                              backgroundColor: powder?.hex_colour || "#777777",
                            }}
                          />

                          <div className="min-w-0">
                            <p className="text-sm font-medium text-text">
                              {powder?.name || `Powder #${item.powder_id}`}
                            </p>

                            {powder?.brand && (
                              <p className="text-xs text-muted">
                                {powder.brand}
                              </p>
                            )}

                            <p className="mt-1 text-xs text-lavender">
                              {formatChoice(item.role)}
                            </p>

                            <p className="mt-1 text-xs leading-5 text-text-secondary">
                              {item.reason}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Nail-by-nail instructions */}
                <div className="mt-6">
                  <h3 className="text-sm font-medium text-lavender">
                    Nail-by-nail instructions
                  </h3>

                  <div className="mt-3 space-y-3">
                    {design.generated_plan.nails.map((nail) => {
                      const nailPowders = nail.powder_ids.map((id) =>
                        selectedPowders.find((powder) => powder.id === id)
                      );

                      return (
                        <div
                          key={nail.finger}
                          className="rounded-xl border border-border bg-surface-elevated p-4"
                        >
                          <h4 className="font-medium text-text">
                            {formatChoice(nail.finger)}
                          </h4>

                          <div className="mt-2 flex flex-wrap gap-2">
                            <span className="rounded-full border border-border-strong px-2.5 py-1 text-xs text-lavender">
                              {formatChoice(nail.technique)}
                            </span>

                            <span className="rounded-full border border-border-strong px-2.5 py-1 text-xs text-text-secondary">
                              {formatChoice(nail.pattern)}
                            </span>
                          </div>

                          <div className="mt-3">
                            <p className="text-xs font-medium text-muted">
                              Powders used
                            </p>

                            <p className="mt-1 text-sm text-text-secondary">
                              {nailPowders
                                .map(
                                  (powder, index) =>
                                    powder?.name ||
                                    `Powder #${nail.powder_ids[index]}`
                                )
                                .join(", ")}
                            </p>
                          </div>

                          <p className="mt-3 text-sm leading-6 text-text-secondary">
                            {nail.description}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Finishing tips */}
                {design.generated_plan.finishing_tips.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-sm font-medium text-lavender">
                      Finishing tips
                    </h3>

                    <ul className="mt-3 space-y-2">
                      {design.generated_plan.finishing_tips.map(
                        (tip, index) => (
                          <li
                            key={index}
                            className="flex gap-3 text-sm leading-6 text-text-secondary"
                          >
                            <span className="text-blush">✧</span>
                            <span>{tip}</span>
                          </li>
                        )
                      )}
                    </ul>
                  </div>
                )}
              </section>
            )}

            {/* General instructions and notes for non-AI designs,
    or older AI designs without a structured plan */}
            {(design.source !== "ai" || !design.generated_plan) &&
              design.instructions && (
                <section className="rounded-2xl border border-border bg-surface p-6">
                  <h2 className="text-lg font-semibold">
                    Instructions & notes
                  </h2>
                  <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-text-secondary">
                    {design.instructions}
                  </p>
                </section>
              )}

            {/* Timestamps */}
            <section className="rounded-2xl border border-border bg-surface p-6">
              <h2 className="text-lg font-semibold">Record information</h2>

              <div className="mt-4 space-y-3">
                <DetailItem
                  label="Created"
                  value={new Date(design.created_at).toLocaleDateString()}
                />
                <DetailItem
                  label="Last updated"
                  value={new Date(design.updated_at).toLocaleDateString()}
                />
              </div>
            </section>
          </div>
        </div>

        {/* Lightbox */}
        {isLightboxOpen && mainPhoto && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Design photo viewer"
            onClick={() => setIsLightboxOpen(false)}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-4 backdrop-blur-sm"
          >
            <div
              onClick={(event) => event.stopPropagation()}
              className="relative flex h-full w-full max-w-6xl flex-col items-center justify-center"
            >
              <button
                type="button"
                onClick={() => setIsLightboxOpen(false)}
                aria-label="Close photo viewer"
                className="absolute right-0 top-0 z-20 rounded-full border border-white/20 bg-surface-elevated p-3 text-white transition hover:bg-surface"
              >
                <X size={24} />
              </button>

              <div className="absolute left-0 top-2 z-20 rounded-full bg-black/50 px-3 py-1.5 text-xs font-medium text-white">
                {currentPhotoIndex + 1} / {sortedPhotos.length}
              </div>

              <div className="relative flex h-[75vh] w-full items-center justify-center">
                <Image
                  src={getImageUrl(mainPhoto.image)}
                  alt={mainPhoto.caption || design.title}
                  fill
                  unoptimized
                  sizes="100vw"
                  className="object-contain"
                  priority
                />
              </div>

              {sortedPhotos.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      const previousIndex =
                        (currentPhotoIndex - 1 + sortedPhotos.length) %
                        sortedPhotos.length;

                      setSelectedPhotoId(sortedPhotos[previousIndex].id);
                    }}
                    aria-label="Previous photo"
                    className="absolute left-0 top-1/2 z-20 -translate-y-1/2 rounded-full border border-white/20 bg-surface-elevated/90 p-3 text-white transition hover:bg-surface"
                  >
                    <ChevronLeft size={28} />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const nextIndex =
                        (currentPhotoIndex + 1) % sortedPhotos.length;

                      setSelectedPhotoId(sortedPhotos[nextIndex].id);
                    }}
                    aria-label="Next photo"
                    className="absolute right-0 top-1/2 z-20 -translate-y-1/2 rounded-full border border-white/20 bg-surface-elevated/90 p-3 text-white transition hover:bg-surface"
                  >
                    <ChevronRight size={28} />
                  </button>
                </>
              )}

              <div className="mt-4 min-h-8 text-center">
                {mainPhoto.caption && (
                  <p className="text-sm text-white">{mainPhoto.caption}</p>
                )}
              </div>

              <p className="mt-2 text-xs text-muted">
                Use ← → to navigate · Esc to close
              </p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1.5 text-sm font-medium text-text">{value}</p>
    </div>
  );
}
