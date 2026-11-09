"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getPowders, Powder } from "@/lib/api";

import Link from "next/link";

export default function CollectionPage() {
  const router = useRouter();

  const [powders, setPowders] = useState<Powder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadCollection() {
      const token = sessionStorage.getItem("accessToken");

      if (!token) {
        router.replace("/login");
        return;
      }

      try {
        const data = await getPowders(token);

        if (!cancelled) {
          setPowders(data);
        }
      } catch (err) {
        if (!cancelled) {
          const message =
            err instanceof Error ? err.message : "Something went wrong.";

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

    loadCollection();

    return () => {
      cancelled = true;
    };
  }, [router]);

  if (loading) {
    return (
      <main className="p-8 text-[#783B52]">Loading your collection...</main>
    );
  }

  if (error) {
    return <main className="p-8 text-red-700">{error}</main>;
  }

  return (
    <main className="min-h-screen bg-[#FBF8F3] p-6 md:p-10">
      <header className="mb-8">
        <p className="text-sm tracking-widest text-[#783B52]">MANIBOOK</p>

        <h1 className="mt-2 text-3xl font-serif text-[#783B52]">
          My Collection
        </h1>

        <p className="mt-2 text-[#8C7C82]">
          Your shades, your style, your little colour library.
        </p>
      </header>

      <div className="mb-6 flex items-center justify-between">
        <p className="text-sm text-[#8C7C82]">
          {powders.length} {powders.length === 1 ? "shade" : "shades"}
        </p>
      </div>

      {powders.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-[#D8B8C4] bg-white p-10 text-center">
          <h2 className="text-xl font-serif text-[#783B52]">
            Your collection starts here
          </h2>

          <p className="mt-2 text-sm text-[#8C7C82]">
            Add your first powder and start organising your shades.
          </p>
          <Link
            href="/collection/new"
            className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700"
          >
            + Add powder
          </Link>
        </section>
      ) : (
        <section className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {powders.map((powder) => (
            <article
              key={powder.id}
              className="overflow-hidden rounded-2xl border border-[#EADDE1] bg-white shadow-sm"
            >
              <div
                className="aspect-square"
                style={{
                  backgroundColor: powder.hex_colour || "#F8EEF1",
                }}
                aria-label={`Colour swatch for ${powder.name}`}
              />

              <div className="p-4">
                <h2 className="font-medium text-[#382A30]">{powder.name}</h2>

                <p className="mt-1 text-sm text-[#8C7C82]">
                  {powder.brand || "Brand not specified"}
                </p>

                <p className="mt-2 text-xs capitalize text-[#783B52]">
                  {powder.finish} · {powder.colour_family}
                </p>

                {powder.is_favourite && (
                  <span className="mt-2 inline-block text-sm text-[#783B52]">
                    ♥ Favourite
                  </span>
                )}
                <Link
                  href={`/collection/${powder.id}`}
                  className="mt-3 inline-block text-sm font-medium text-rose-600 hover:text-rose-800"
                >
                  View details →
                </Link>
              </div>
            </article>
          ))}
          <Link
            href="/collection/new"
            className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700"
          >
            + Add powder
          </Link>
        </section>
      )}
    </main>
  );
}
