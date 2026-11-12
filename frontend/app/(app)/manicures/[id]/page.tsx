"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Maximize2, X, ChevronLeft, ChevronRight } from "lucide-react";

import {
  deleteManicure,
  getImageUrl,
  getManicure,
  getManicurePhotos,
  getPowders,
  getTags,
  Manicure,
  ManicurePhoto,
  Powder,
  Tag,
} from "@/lib/api";

export default function ManicureDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const manicureId = Number(params.id);

  const [manicure, setManicure] = useState<Manicure | null>(null);
  const [photos, setPhotos] = useState<ManicurePhoto[]>([]);
  const [powders, setPowders] = useState<Powder[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<ManicurePhoto | null>(
    null
  );
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    async function loadManicure() {
      if (!Number.isInteger(manicureId) || manicureId <= 0) {
        setError("Invalid manicure ID.");
        setLoading(false);
        return;
      }

      const accessToken = sessionStorage.getItem("accessToken");

      if (!accessToken) {
        router.push("/login");
        return;
      }

      try {
        setLoading(true);
        setError("");

        const [manicureData, photoData, powderData, tagData] =
          await Promise.all([
            getManicure(accessToken, manicureId),
            getManicurePhotos(accessToken, manicureId),
            getPowders(accessToken),
            getTags(accessToken),
          ]);

        setManicure(manicureData);
        setPhotos(photoData);
        setPowders(powderData);
        setTags(tagData);

        // Initially display the primary photo, or the first photo if none is primary.
        const primaryPhoto = photoData.find((photo) => photo.is_primary);
        setSelectedPhoto(primaryPhoto ?? photoData[0] ?? null);
      } catch (err) {
        console.error("Failed to load manicure:", err);
        setError(
          "Could not load this manicure. It may have been deleted or you may not have permission to view it."
        );
      } finally {
        setLoading(false);
      }
    }

    loadManicure();
  }, [manicureId, router]);

  const selectedPowders = useMemo(() => {
    if (!manicure) return [];

    return powders.filter((powder) => manicure.powders.includes(powder.id));
  }, [manicure, powders]);

  const selectedTags = useMemo(() => {
    if (!manicure) return [];

    return tags.filter((tag) => manicure.tags.includes(tag.id));
  }, [manicure, tags]);

  const sortedPhotos = useMemo(() => {
    return [...photos].sort(
      (a, b) => Number(b.is_primary) - Number(a.is_primary)
    );
  }, [photos]);

  const galleryPhotos = sortedPhotos.length
    ? sortedPhotos
    : manicure?.primary_photo
    ? [
        {
          id: -1,
          image: manicure.primary_photo,
          is_primary: true,
          caption: "",
        } as ManicurePhoto,
      ]
    : [];

  const mainPhoto =
    galleryPhotos.find((photo) => photo.id === selectedPhoto?.id) ??
    galleryPhotos[0] ??
    null;

  const currentPhotoIndex = galleryPhotos.findIndex(
    (photo) => photo.id === mainPhoto?.id
  );

  useEffect(() => {
    if (!isLightboxOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsLightboxOpen(false);
      }

      if (event.key === "ArrowRight" && galleryPhotos.length > 1) {
        const nextIndex = (currentPhotoIndex + 1) % galleryPhotos.length;
        setSelectedPhoto(galleryPhotos[nextIndex]);
      }

      if (event.key === "ArrowLeft" && galleryPhotos.length > 1) {
        const previousIndex =
          (currentPhotoIndex - 1 + galleryPhotos.length) % galleryPhotos.length;

        setSelectedPhoto(galleryPhotos[previousIndex]);
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isLightboxOpen, galleryPhotos, currentPhotoIndex]);

  async function handleDelete() {
    if (!manicure) return;

    const confirmed = window.confirm(
      "Are you sure you want to delete this manicure? This action cannot be undone."
    );

    if (!confirmed) return;

    const accessToken = sessionStorage.getItem("accessToken");

    if (!accessToken) {
      router.push("/login");
      return;
    }

    try {
      setDeleting(true);
      await deleteManicure(accessToken, manicure.id);
      router.push("/manicures");
    } catch (err) {
      console.error("Failed to delete manicure:", err);
      setError("Could not delete this manicure. Please try again.");
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

  function formatDate(date: string) {
    return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#211B25] px-6 py-12 text-[#F5EDF3]">
        <div className="mx-auto max-w-6xl animate-pulse space-y-6">
          <div className="h-5 w-32 rounded bg-[#49394C]" />
          <div className="h-10 w-72 rounded bg-[#49394C]" />
          <div className="h-80 rounded-2xl bg-[#35263B]" />
        </div>
      </main>
    );
  }

  if (error && !manicure) {
    return (
      <main className="min-h-screen bg-[#211B25] px-6 py-12 text-[#F5EDF3]">
        <div className="mx-auto max-w-3xl">
          <Link
            href="/manicures"
            className="text-sm text-[#C76B91] transition hover:text-[#D8B9E8]"
          >
            ← Back to manicures
          </Link>

          <div className="mt-8 rounded-2xl border border-[#49394C] bg-[#2B222F] p-8">
            <h1 className="text-xl font-semibold">Something went wrong</h1>
            <p className="mt-3 text-sm text-[#C8B9C8]">{error}</p>
          </div>
        </div>
      </main>
    );
  }

  if (!manicure) return null;

  return (
    <main className="min-h-screen bg-[#211B25] px-4 py-8 text-[#F5EDF3] sm:px-6 lg:py-12">
      <div className="mx-auto max-w-6xl">
        {/* Back navigation */}
        <Link
          href="/manicures"
          className="inline-flex items-center gap-2 text-sm text-[#C8B9C8] transition hover:text-[#D8B9E8]"
        >
          <span>←</span>
          Back to manicures
        </Link>

        {/* Header */}
        <div className="mt-7 flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#C76B91]">
              Manicure details
            </p>

            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#F5EDF3] sm:text-4xl">
              {manicure.title}
            </h1>

            <p className="mt-2 text-sm text-[#9D8D9E]">
              Applied on {formatDate(manicure.completed_at)}
            </p>
          </div>

          <div className="flex gap-3">
            <Link
              href={`/manicures/${manicure.id}/edit`}
              className="rounded-xl border border-[#654B68] px-5 py-2.5 text-sm font-medium text-[#D8B9E8] transition hover:bg-[#35263B]"
            >
              Edit
            </Link>

            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="rounded-xl border border-red-900/60 px-5 py-2.5 text-sm font-medium text-red-300 transition hover:bg-red-950/40 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {deleting ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-6 rounded-xl border border-red-900/60 bg-red-950/30 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

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
                  className="group relative block aspect-[4/5] max-h-[680px] w-full overflow-hidden rounded-2xl border border-[#49394C] bg-[#2B222F] text-left"
                >
                  <Image
                    src={getImageUrl(mainPhoto.image)}
                    alt={mainPhoto.caption || manicure.title}
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

                {galleryPhotos.length > 1 && (
                  <div>
                    <div className="grid grid-cols-4 gap-3 sm:grid-cols-5">
                      {galleryPhotos.map((photo) => {
                        const isSelected = mainPhoto?.id === photo.id;

                        return (
                          <button
                            key={photo.id}
                            type="button"
                            onClick={() => setSelectedPhoto(photo)}
                            aria-label={`View photo${
                              photo.is_primary ? ", primary photo" : ""
                            }`}
                            aria-pressed={isSelected}
                            className={`relative aspect-square overflow-hidden rounded-xl border-2 bg-[#2B222F] transition ${
                              isSelected
                                ? "border-[#C026D3] ring-2 ring-[#C026D3]/20"
                                : "border-[#49394C] hover:border-[#9D788F]"
                            }`}
                          >
                            <Image
                              src={getImageUrl(photo.image)}
                              alt={photo.caption || "Manicure photo"}
                              fill
                              unoptimized
                              sizes="(max-width: 640px) 25vw, 120px"
                              className="object-cover transition duration-300 hover:scale-105"
                            />

                            {photo.is_primary && (
                              <span className="absolute bottom-1 left-1 rounded-full bg-black/70 px-2 py-1 text-[9px] font-medium text-white backdrop-blur-sm">
                                Primary
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    <p className="mt-3 text-xs text-[#9D8D9E]">
                      Select a thumbnail to view the photo. The primary photo
                      setting won't change.
                    </p>
                  </div>
                )}
                {mainPhoto.caption && (
                  <p className="text-sm text-[#C8B9C8]">{mainPhoto.caption}</p>
                )}
              </div>
            ) : (
              <div className="flex aspect-[4/5] max-h-[680px] items-center justify-center rounded-2xl border border-dashed border-[#654B68] bg-[#2B222F]">
                <div className="text-center">
                  <div className="text-4xl text-[#654B68]">✧</div>
                  <p className="mt-3 text-sm text-[#9D8D9E]">
                    No photos added yet
                  </p>
                </div>
              </div>
            )}
          </section>

          {isLightboxOpen && mainPhoto && (
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Manicure photo viewer"
              onClick={() => setIsLightboxOpen(false)}
              className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-4 backdrop-blur-sm"
            >
              <div
                onClick={(event) => event.stopPropagation()}
                className="relative flex h-full w-full max-w-6xl flex-col items-center justify-center"
              >
                {/* Close button */}
                <button
                  type="button"
                  onClick={() => setIsLightboxOpen(false)}
                  aria-label="Close photo viewer"
                  className="absolute right-0 top-0 z-20 rounded-full border border-white/20 bg-[#35263B] p-3 text-white transition hover:bg-[#49394C]"
                >
                  <X size={24} />
                </button>

                {/* Photo counter */}
                <div className="absolute left-0 top-2 z-20 rounded-full bg-black/50 px-3 py-1.5 text-xs font-medium text-white">
                  {currentPhotoIndex + 1} / {galleryPhotos.length}
                </div>

                {/* Main image */}
                <div className="relative flex h-[75vh] w-full items-center justify-center">
                  <Image
                    src={getImageUrl(mainPhoto.image)}
                    alt={mainPhoto.caption || manicure.title}
                    fill
                    unoptimized
                    sizes="100vw"
                    className="object-contain"
                    priority
                  />
                </div>

                {/* Navigation buttons */}
                {galleryPhotos.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        const previousIndex =
                          (currentPhotoIndex - 1 + galleryPhotos.length) %
                          galleryPhotos.length;

                        setSelectedPhoto(galleryPhotos[previousIndex]);
                      }}
                      aria-label="Previous photo"
                      className="absolute left-0 top-1/2 z-20 -translate-y-1/2 rounded-full border border-white/20 bg-[#35263B]/90 p-3 text-white transition hover:bg-[#49394C]"
                    >
                      <ChevronLeft size={28} />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const nextIndex =
                          (currentPhotoIndex + 1) % galleryPhotos.length;

                        setSelectedPhoto(galleryPhotos[nextIndex]);
                      }}
                      aria-label="Next photo"
                      className="absolute right-0 top-1/2 z-20 -translate-y-1/2 rounded-full border border-white/20 bg-[#35263B]/90 p-3 text-white transition hover:bg-[#49394C]"
                    >
                      <ChevronRight size={28} />
                    </button>
                  </>
                )}

                {/* Caption */}
                <div className="mt-4 min-h-8 text-center">
                  {mainPhoto.caption && (
                    <p className="text-sm text-[#E8DCE8]">
                      {mainPhoto.caption}
                    </p>
                  )}
                </div>

                <p className="mt-2 text-xs text-[#9D8D9E]">
                  Use ← → to navigate · Esc to close
                </p>
              </div>
            </div>
          )}

          {/* Details */}
          <div className="space-y-6">
            {/* Manicure information */}
            <section className="rounded-2xl border border-[#49394C] bg-[#2B222F] p-6">
              <h2 className="text-lg font-semibold">Details</h2>

              <div className="mt-5 grid grid-cols-2 gap-x-5 gap-y-6">
                <DetailItem
                  label="Nail shape"
                  value={formatChoice(manicure.nail_shape)}
                />
                <DetailItem
                  label="Technique"
                  value={formatChoice(manicure.technique)}
                />
                <DetailItem
                  label="Nail length"
                  value={formatChoice(manicure.nail_length)}
                />
                <DetailItem
                  label="Rating"
                  value={
                    manicure.rating ? `${manicure.rating}/10` : "Not rated"
                  }
                />
              </div>
            </section>

            {/* Wear tracking */}
            <section className="rounded-2xl border border-[#49394C] bg-[#2B222F] p-6">
              <h2 className="text-lg font-semibold">Wear tracking</h2>

              <div className="mt-5 grid grid-cols-2 gap-5">
                <DetailItem
                  label="Applied"
                  value={formatDate(manicure.completed_at)}
                />
                <DetailItem
                  label="Removed"
                  value={
                    manicure.removal_date
                      ? formatDate(manicure.removal_date)
                      : "Still wearing"
                  }
                />
                <div className="col-span-2 rounded-xl bg-[#35263B] p-4">
                  <p className="text-xs text-[#9D8D9E]">Wear duration</p>
                  <p className="mt-1 text-2xl font-semibold text-[#D8B9E8]">
                    {manicure.wear_duration_days !== null &&
                    manicure.wear_duration_days !== undefined
                      ? `${manicure.wear_duration_days} days`
                      : "Not available"}
                  </p>
                </div>
              </div>
            </section>

            {/* Powders used */}
            <section className="rounded-2xl border border-[#49394C] bg-[#2B222F] p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold">Powders used</h2>
                <span className="text-xs text-[#9D8D9E]">
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
                      className="flex items-center justify-between gap-3 rounded-xl border border-[#49394C] bg-[#35263B] px-4 py-3 transition hover:border-[#C76B91]"
                    >
                      <div>
                        <p className="font-medium text-[#F5EDF3]">
                          {powder.name}
                        </p>
                        {powder.brand && (
                          <p className="mt-1 text-xs text-[#9D8D9E]">
                            {powder.brand}
                          </p>
                        )}
                      </div>
                      <span className="text-[#C76B91]">→</span>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-sm text-[#9D8D9E]">
                  No powders linked to this manicure.
                </p>
              )}
            </section>

            {/* Tags */}
            <section className="rounded-2xl border border-[#49394C] bg-[#2B222F] p-6">
              <h2 className="text-lg font-semibold">Tags</h2>

              {selectedTags.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {selectedTags.map((tag) => (
                    <span
                      key={tag.id}
                      className="rounded-full border border-[#654B68] bg-[#35263B] px-3 py-1.5 text-xs font-medium text-[#D8B9E8]"
                    >
                      {tag.name}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm text-[#9D8D9E]">No tags added.</p>
              )}
            </section>

            {/* Notes */}
            {manicure.notes && (
              <section className="rounded-2xl border border-[#49394C] bg-[#2B222F] p-6">
                <h2 className="text-lg font-semibold">Notes</h2>
                <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-[#C8B9C8]">
                  {manicure.notes}
                </p>
              </section>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-[#9D8D9E]">{label}</p>
      <p className="mt-1.5 text-sm font-medium text-[#F5EDF3]">{value}</p>
    </div>
  );
}
