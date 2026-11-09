"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  getPowder,
  getPowderPhotos,
  getImageUrl,
  Powder,
  PowderPhoto,
} from "@/lib/api";
import { Suspense } from "react";

function PowderDetailContent() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [powder, setPowder] = useState<Powder | null>(null);
  const [photos, setPhotos] = useState<PowderPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

  if (loading) {
    return (
      <main className="min-h-screen bg-rose-50 p-10 text-center">
        Loading powder details...
      </main>
    );
  }

  if (error || !powder) {
    return (
      <main className="min-h-screen bg-rose-50 p-10">
        <p className="text-red-700">{error || "Powder not found."}</p>
        <button
          onClick={() => router.push("/collection")}
          className="mt-4 text-rose-600 underline"
        >
          Back to collection
        </button>
      </main>
    );
  }

  const productPhotos = photos.filter(
    (photo) => photo.photo_type === "product"
  );

  const swatchPhotos = photos.filter((photo) => photo.photo_type === "swatch");

  const inspirationPhotos = photos.filter(
    (photo) => photo.photo_type === "inspiration"
  );

  const mainPhoto = photos.find((photo) => photo.is_primary) || photos[0];

  function PhotoGallery({
    title,
    items,
  }: {
    title: string;
    items: PowderPhoto[];
  }) {
    if (items.length === 0) return null;

    return (
      <section className="mt-8">
        <h2 className="mb-4 text-xl font-semibold text-rose-950">{title}</h2>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {items.map((photo) => (
            <div key={photo.id}>
              <img
                src={getImageUrl(photo.image)}
                alt={photo.caption || title}
                className="aspect-square w-full rounded-xl object-cover"
              />
              {photo.caption && (
                <p className="mt-2 text-sm text-gray-500">{photo.caption}</p>
              )}
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <main className="min-h-screen bg-rose-50 px-6 py-10">
      <div className="mx-auto max-w-5xl">
        <button
          onClick={() => router.push("/collection")}
          className="mb-6 text-sm text-rose-600 hover:text-rose-800"
        >
          ← Back to collection
        </button>

        <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
          <div className="grid grid-cols-1 gap-8 p-8 md:grid-cols-2">
            <div>
              {mainPhoto ? (
                <img
                  src={getImageUrl(mainPhoto.image)}
                  alt={mainPhoto.caption || powder.name}
                  className="aspect-square w-full rounded-2xl object-cover"
                />
              ) : (
                <div
                  className="flex aspect-square items-center justify-center rounded-2xl"
                  style={{
                    backgroundColor: powder.hex_colour || "#f4a6b8",
                  }}
                >
                  <span className="rounded-lg bg-white/70 px-4 py-2 text-sm text-gray-700">
                    No photo uploaded
                  </span>
                </div>
              )}
            </div>

            <div>
              <p className="text-sm font-medium uppercase tracking-wide text-rose-500">
                {powder.brand}
              </p>

              <h1 className="mt-2 text-3xl font-semibold text-rose-950">
                {powder.name}
              </h1>

              {powder.product_code && (
                <p className="mt-2 text-sm text-gray-500">
                  Product code: {powder.product_code}
                </p>
              )}

              <div className="mt-6 flex items-center gap-3">
                <div
                  className="h-12 w-12 rounded-full border border-gray-200"
                  style={{
                    backgroundColor: powder.hex_colour || "#f4a6b8",
                  }}
                />
                <div>
                  <p className="text-sm font-medium text-gray-800">
                    Colour reference
                  </p>
                  <p className="text-sm text-gray-500">
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
                    className="flex justify-between border-b border-rose-100 pb-3"
                  >
                    <span className="text-sm text-gray-500">{label}</span>
                    <span className="text-sm font-medium capitalize text-gray-800">
                      {value}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-6">
                {powder.is_favourite && (
                  <span className="rounded-full bg-rose-100 px-3 py-1 text-sm text-rose-700">
                    ♥ Favourite
                  </span>
                )}
              </div>

              {powder.notes && (
                <div className="mt-6">
                  <h2 className="font-medium text-gray-800">Notes</h2>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-gray-600">
                    {powder.notes}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        <PhotoGallery title="Product photos" items={productPhotos} />
        <PhotoGallery title="Swatches" items={swatchPhotos} />
        <PhotoGallery title="Inspiration" items={inspirationPhotos} />

        {photos.length === 0 && (
          <p className="mt-8 text-center text-sm text-gray-500">
            No photos have been added to this powder yet.
          </p>
        )}
      </div>
    </main>
  );
}

export default function PowderDetailPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-rose-50 p-10 text-center">
          Loading powder details...
        </main>
      }
    >
      <PowderDetailContent />
    </Suspense>
  );
}
