import { Suspense } from "react";
import PowderDetailClient from "./PowderDetailClient";

export const instant = false;

export default function PowderDetailPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-background p-10 text-center">
          Loading powder details...
        </main>
      }
    >
      <PowderDetailClient />
    </Suspense>
  );
}
