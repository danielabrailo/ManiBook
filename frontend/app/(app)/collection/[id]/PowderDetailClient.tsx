"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  getPowder,
  getPowderPhotos,
  getImageUrl,
  deletePowder,
  deletePowderPhoto,
  uploadPowderPhoto,
  updatePowderPhoto,
  Powder,
  PowderPhoto,
  getTags,
  Tag,
} from "@/lib/api";

type PhotoType = "product" | "swatch" | "inspiration";

interface PhotoGalleryProps {
  title: string;
  photoType: PhotoType;
  items: PowderPhoto[];
  onUpload: (
    photoType: PhotoType,
    file: File,
    caption: string
  ) => Promise<void>;
  onSetPrimary: (photoId: number) => Promise<void>;
  onDelete: (photoId: number) => Promise<void>;
  onUpdateCaption: (photoId: number, caption: string) => Promise<void>;
}

function PhotoGallery({
  title,
  photoType,
  items,
  onUpload,
  onSetPrimary,
  onDelete,
  onUpdateCaption,
}: PhotoGalleryProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [updatingPhotoId, setUpdatingPhotoId] = useState<number | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);

  const [editingPhotoId, setEditingPhotoId] = useState<number | null>(null);
  const [editedCaption, setEditedCaption] = useState("");
  const [isSavingCaption, setIsSavingCaption] = useState(false);

  async function handleUpload() {
    if (!selectedFile) return;

    setIsUploading(true);

    try {
      await onUpload(photoType, selectedFile, caption.trim());
      setSelectedFile(null);
      setCaption("");
      setFileInputKey((previous) => previous + 1);
    } catch {
      // The parent component displays the error.
    } finally {
      setIsUploading(false);
    }
  }

  async function handleSetPrimary(photoId: number) {
    setUpdatingPhotoId(photoId);

    try {
      await onSetPrimary(photoId);
    } catch {
      // The parent component displays the error.
    } finally {
      setUpdatingPhotoId(null);
    }
  }

  function handleEditCaption(photoId: number, currentCaption: string) {
    setEditingPhotoId(photoId);
    setEditedCaption(currentCaption);
  }

  function handleCancelCaptionEdit() {
    setEditingPhotoId(null);
    setEditedCaption("");
  }

  async function handleSaveCaption(photoId: number) {
    setIsSavingCaption(true);

    try {
      await onUpdateCaption(photoId, editedCaption.trim());
      setEditingPhotoId(null);
      setEditedCaption("");
    } catch {
      // Keep the editor open so the user can retry.
      // The parent component displays the error.
    } finally {
      setIsSavingCaption(false);
    }
  }

  return (
    <section className="mt-10">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-text">{title}</h2>
        <span className="text-sm text-muted">
          {items.length} {items.length === 1 ? "photo" : "photos"}
        </span>
      </div>

      {/* Upload form */}
      <div className="mb-6 rounded-xl border border-border bg-surface p-5">
        <h3 className="mb-3 text-sm font-semibold text-text">Add a photo</h3>

        <div className="flex flex-col gap-3">
          <input
            key={fileInputKey}
            type="file"
            accept="image/*"
            onChange={(event) =>
              setSelectedFile(event.target.files?.[0] || null)
            }
            className="block w-full text-sm text-text-secondary file:mr-4 file:rounded-lg file:border-0 file:bg-plum file:px-4 file:py-2 file:text-sm file:font-medium file:text-text hover:file:bg-border"
          />

          <input
            type="text"
            value={caption}
            onChange={(event) => setCaption(event.target.value)}
            maxLength={200}
            placeholder="Add a caption (optional)"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text placeholder:text-muted focus:border-orchid focus:outline-none"
          />

          <div>
            <button
              type="button"
              onClick={handleUpload}
              disabled={!selectedFile || isUploading}
              className="rounded-lg bg-berry px-4 py-2 text-sm font-medium text-white transition hover:bg-berry-dark disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isUploading ? "Uploading..." : "Upload photo"}
            </button>
          </div>
        </div>
      </div>

      {/* Photo grid */}
      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border-strong bg-surface/50 px-6 py-10 text-center">
          <p className="text-sm text-muted">
            No {title.toLowerCase()} added yet.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {items.map((photo) => (
            <div
              key={photo.id}
              className="overflow-hidden rounded-xl border border-border bg-surface"
            >
              <div className="relative">
                <img
                  src={getImageUrl(photo.image)}
                  alt={photo.caption || title}
                  className="aspect-square w-full bg-background object-contain"
                />

                {photo.is_primary && (
                  <span className="absolute left-2 top-2 rounded-full bg-berry px-3 py-1 text-xs font-medium text-white">
                    Primary
                  </span>
                )}
              </div>

              <div className="p-3">
                {editingPhotoId === photo.id ? (
                  <div className="flex flex-col gap-2">
                    <input
                      type="text"
                      value={editedCaption}
                      onChange={(event) => setEditedCaption(event.target.value)}
                      maxLength={200}
                      autoFocus
                      aria-label="Edit photo caption"
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text placeholder:text-muted focus:border-orchid focus:outline-none"
                    />

                    <span className="text-right text-xs text-muted">
                      {editedCaption.length}/200
                    </span>

                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => handleSaveCaption(photo.id)}
                        disabled={isSavingCaption}
                        className="text-xs font-medium text-berry hover:text-berry-dark disabled:opacity-50"
                      >
                        {isSavingCaption ? "Saving..." : "Save"}
                      </button>

                      <button
                        type="button"
                        onClick={handleCancelCaptionEdit}
                        disabled={isSavingCaption}
                        className="text-xs font-medium text-muted hover:text-text disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="min-h-5 text-sm text-text-secondary">
                      {photo.caption || "No caption"}
                    </p>

                    <div className="mt-3 flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          handleEditCaption(photo.id, photo.caption)
                        }
                        disabled={isSavingCaption || editingPhotoId !== null}
                        className="text-left text-xs font-medium text-blush hover:text-lavender disabled:opacity-50"
                      >
                        Edit caption
                      </button>

                      {!photo.is_primary && (
                        <button
                          type="button"
                          onClick={() => handleSetPrimary(photo.id)}
                          disabled={
                            updatingPhotoId !== null || editingPhotoId !== null
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
                        onClick={() => void onDelete(photo.id)}
                        disabled={editingPhotoId !== null}
                        className="text-left text-xs font-medium text-red-400 hover:text-red-300 disabled:opacity-50"
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
      )}
    </section>
  );
}

function PowderDetailContent() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [powder, setPowder] = useState<Powder | null>(null);
  const [photos, setPhotos] = useState<PowderPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tags, setTags] = useState<Tag[]>([]);

  useEffect(() => {
    async function loadPowder() {
      const token = sessionStorage.getItem("accessToken");

      if (!token) {
        router.push("/login");
        return;
      }

      const id = Number(params.id);

      if (!Number.isInteger(id) || id <= 0) {
        setError("Invalid powder ID.");
        setLoading(false);
        return;
      }

      try {
        const [powderData, photoData] = await Promise.all([
          getPowder(token, id),
          getPowderPhotos(token, id),
        ]);

        setPowder(powderData);
        setPhotos(photoData);

        // Load tags separately so a tag API error doesn't prevent
        // the powder details and photos from loading.
        try {
          const tagData = await getTags(token);
          setTags(tagData);
        } catch {
          setTags([]);
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Could not load powder details."
        );
      } finally {
        setLoading(false);
      }
    }

    loadPowder();
  }, [params.id, router]);

  async function handleUploadPhoto(
    photoType: PhotoType,
    file: File,
    caption: string
  ) {
    if (!powder) return;

    const token = sessionStorage.getItem("accessToken");

    if (!token) {
      router.push("/login");
      throw new Error("Authentication required.");
    }

    try {
      const hasPrimary = photos.some(
        (photo) => photo.photo_type === photoType && photo.is_primary
      );

      const uploadedPhoto = await uploadPowderPhoto(
        token,
        powder.id,
        file,
        photoType,
        !hasPrimary,
        caption
      );

      setPhotos((previous) => [
        ...previous.map((photo) =>
          photo.photo_type === photoType && uploadedPhoto.is_primary
            ? { ...photo, is_primary: false }
            : photo
        ),
        uploadedPhoto,
      ]);

      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not upload photo.");
      throw err;
    }
  }

  async function handleSetPrimary(photoId: number) {
    const token = sessionStorage.getItem("accessToken");

    if (!token) {
      router.push("/login");
      throw new Error("Authentication required.");
    }

    const photo = photos.find((item) => item.id === photoId);

    if (!photo) return;

    try {
      const updatedPhoto = await updatePowderPhoto(token, photoId, {
        is_primary: true,
      });

      setPhotos((previous) =>
        previous.map((item) =>
          item.photo_type === updatedPhoto.photo_type
            ? {
                ...item,
                is_primary: item.id === updatedPhoto.id,
              }
            : item
        )
      );

      setError("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not update the primary photo."
      );
      throw err;
    }
  }

  async function handleUpdatePhotoCaption(photoId: number, caption: string) {
    const token = sessionStorage.getItem("accessToken");

    if (!token) {
      router.push("/login");
      throw new Error("Your session has expired. Please log in again.");
    }

    try {
      const updatedPhoto = await updatePowderPhoto(token, photoId, {
        caption,
      });

      setPhotos((previous) =>
        previous.map((photo) => (photo.id === photoId ? updatedPhoto : photo))
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not update photo caption."
      );

      throw err;
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
      await deletePowderPhoto(token, photoId);
      setPhotos((previous) => previous.filter((photo) => photo.id !== photoId));
      setError("");
    } catch {
      setError("Could not delete this photo.");
    }
  }

  async function handleDeletePowder() {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${powder?.name}"? This cannot be undone.`
    );

    if (!confirmed || !powder) return;

    const token = sessionStorage.getItem("accessToken");

    if (!token) {
      router.push("/login");
      return;
    }

    try {
      await deletePowder(token, powder.id);
      router.push("/collection");
    } catch {
      setError("Could not delete this powder. Please try again.");
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-background p-10 text-center text-text-secondary">
        Loading powder details...
      </main>
    );
  }

  if (error && !powder) {
    return (
      <main className="min-h-screen bg-background p-10">
        <p className="text-red-400">{error}</p>
        <button
          onClick={() => router.push("/collection")}
          className="mt-4 text-blush underline"
        >
          Back to collection
        </button>
      </main>
    );
  }

  if (!powder) return null;
  const powderTags = tags.filter((tag) => powder.tags?.includes(tag.id));

  const productPhotos = photos.filter(
    (photo) => photo.photo_type === "product"
  );

  const swatchPhotos = photos.filter((photo) => photo.photo_type === "swatch");

  const inspirationPhotos = photos.filter(
    (photo) => photo.photo_type === "inspiration"
  );

  // The main image must always come from the product-photo category.
  const mainPhoto =
    productPhotos.find((photo) => photo.is_primary) || productPhotos[0];

  return (
    <main className="min-h-screen bg-background px-6 py-10">
      <div className="mx-auto max-w-5xl">
        <button
          onClick={() => router.push("/collection")}
          className="mb-6 text-sm text-blush hover:text-lavender"
        >
          ← Back to collection
        </button>

        {error && (
          <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
          <div className="grid grid-cols-1 gap-8 p-8 md:grid-cols-2">
            <div>
              {mainPhoto ? (
                <img
                  src={getImageUrl(mainPhoto.image)}
                  alt={mainPhoto.caption || powder.name}
                  className="aspect-square w-full rounded-2xl bg-background object-contain"
                />
              ) : (
                <div
                  className="flex aspect-square items-center justify-center rounded-2xl"
                  style={{
                    backgroundColor: powder.hex_colour || "#35263B",
                  }}
                >
                  <span className="rounded-lg bg-surface/80 px-4 py-2 text-sm text-text">
                    No product photo uploaded
                  </span>
                </div>
              )}
            </div>

            <div>
              <p className="text-sm font-medium uppercase tracking-wide text-blush">
                {powder.brand || "Unbranded"}
              </p>

              <h1 className="mt-2 text-3xl font-semibold text-text">
                {powder.name}
              </h1>

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  onClick={() => router.push(`/collection/${powder.id}/edit`)}
                  className="rounded-lg bg-berry px-4 py-2 text-sm font-medium text-white hover:bg-berry-dark"
                >
                  Edit powder
                </button>

                <button
                  onClick={handleDeletePowder}
                  className="rounded-lg border border-red-400/40 px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-500/10"
                >
                  Delete powder
                </button>
              </div>

              {powder.product_code && (
                <p className="mt-2 text-sm text-muted">
                  Product code: {powder.product_code}
                </p>
              )}

              <div className="mt-6 flex items-center gap-3">
                <div
                  className="h-12 w-12 rounded-full border border-border"
                  style={{
                    backgroundColor: powder.hex_colour || "#35263B",
                  }}
                />
                <div>
                  <p className="text-sm font-medium text-text">
                    Colour reference
                  </p>
                  <p className="text-sm text-muted">
                    {powder.hex_colour || "No hex colour specified"}
                  </p>
                </div>
              </div>

              <div className="mt-8 space-y-4">
                {[
                  ["Colour family", powder.colour_family],
                  ["Finish", powder.finish],
                  ["Intensity", powder.intensity],
                  ["Undertone", powder.undertone],
                  ["Coverage", powder.coverage],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="flex justify-between border-b border-border pb-3"
                  >
                    <span className="text-sm text-text-secondary">{label}</span>
                    <span className="text-sm font-medium capitalize text-text">
                      {value}
                    </span>
                  </div>
                ))}
              </div>

              {/* Tags */}
              <div className="mt-6">
                <h2 className="mb-3 text-sm font-semibold text-text">Tags</h2>

                {powderTags.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {powderTags.map((tag) => (
                      <span
                        key={tag.id}
                        className="inline-flex items-center rounded-full border border-border-strong bg-background px-3 py-1.5 text-xs font-medium text-lavender"
                      >
                        {tag.name}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted">No tags added yet.</p>
                )}
              </div>

              {powder.is_favourite && (
                <div className="mt-6">
                  <span className="rounded-full bg-berry/15 px-3 py-1 text-sm text-blush">
                    ♥ Favourite
                  </span>
                </div>
              )}

              {powder.notes && (
                <div className="mt-6">
                  <h2 className="font-medium text-text">Notes</h2>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-text-secondary">
                    {powder.notes}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        <PhotoGallery
          title="Product photos"
          photoType="product"
          items={productPhotos}
          onUpload={handleUploadPhoto}
          onSetPrimary={handleSetPrimary}
          onDelete={handleDeletePhoto}
          onUpdateCaption={handleUpdatePhotoCaption}
        />

        <PhotoGallery
          title="Swatches"
          photoType="swatch"
          items={swatchPhotos}
          onUpload={handleUploadPhoto}
          onSetPrimary={handleSetPrimary}
          onDelete={handleDeletePhoto}
          onUpdateCaption={handleUpdatePhotoCaption}
        />

        <PhotoGallery
          title="Inspiration"
          photoType="inspiration"
          items={inspirationPhotos}
          onUpload={handleUploadPhoto}
          onSetPrimary={handleSetPrimary}
          onDelete={handleDeletePhoto}
          onUpdateCaption={handleUpdatePhotoCaption}
        />
      </div>
    </main>
  );
}

export const instant = false;

export default function PowderDetailClient() {
  return <PowderDetailContent />;
}
