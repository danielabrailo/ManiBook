"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import {
  generateDesign,
  getPowders,
  Powder,
  GenerateDesignRequest,
  GenerateDesignResponse,
  SaveGeneratedDesignRequest,
  saveGeneratedDesign,
} from "@/lib/api";

const STYLES: { value: GenerateDesignRequest["style"]; label: string }[] = [
  { value: "minimalist", label: "Minimalist" },
  { value: "romantic_coquette", label: "Romantic / Coquette" },
  { value: "gothic_witchy", label: "Gothic / Witchy" },
  { value: "elegant", label: "Elegant" },
  { value: "bold_maximalist", label: "Bold / Maximalist" },
  { value: "seasonal", label: "Seasonal" },
];

const FINISHES = [
  "solid",
  "glitter",
  "shimmer",
  "chrome",
  "holographic",
  "flake",
  "thermal",
  "other",
];

const COLOUR_FAMILIES = [
  "red",
  "pink",
  "orange",
  "yellow",
  "green",
  "blue",
  "purple",
  "brown",
  "neutral",
  "black",
  "white",
  "multicolour",
  "other",
];

const UNDERTONES = ["warm", "cool", "neutral", "unknown"];

const SHAPES = [
  "almond",
  "oval",
  "square",
  "coffin",
  "stiletto",
  "round",
  "other",
];

const LENGTHS = ["extra_short", "short", "medium", "long", "extra_long"];

const inputClass =
  "w-full rounded-lg border border-border-strong bg-surface-elevated px-3 py-2.5 text-sm text-text outline-none transition-colors focus:border-neon focus:ring-2 focus:ring-neon/20";

const labelClass = "mb-1.5 block text-sm font-medium text-text-secondary";

function formatChoice(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export default function GenerateDesignPage() {
  const router = useRouter();

  const [powders, setPowders] = useState<Powder[]>([]);
  const [loadingPowders, setLoadingPowders] = useState(true);
  const [powderError, setPowderError] = useState("");

  const [colourMode, setColourMode] =
    useState<GenerateDesignRequest["colour_mode"]>("any");
  const [selectedPowderIds, setSelectedPowderIds] = useState<number[]>([]);

  const [finishes, setFinishes] = useState<string[]>([]);
  const [colourFamilies, setColourFamilies] = useState<string[]>([]);
  const [undertones, setUndertones] = useState<string[]>([]);
  const [favouritesOnly, setFavouritesOnly] = useState(false);

  const [paletteSize, setPaletteSize] = useState(3);
  const [style, setStyle] = useState<GenerateDesignRequest["style"]>("elegant");
  const [complexity, setComplexity] =
    useState<GenerateDesignRequest["complexity"]>("medium");
  const [occasion, setOccasion] =
    useState<NonNullable<GenerateDesignRequest["occasion"]>>("everyday");

  const [nailShape, setNailShape] = useState("almond");
  const [nailLength, setNailLength] = useState("medium");
  const [preferences, setPreferences] = useState("");

  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<GenerateDesignResponse | null>(null);
  const [generatedPreferences, setGeneratedPreferences] =
    useState<GenerateDesignRequest | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  // Load the user's collection.
  useEffect(() => {
    let cancelled = false;

    async function loadPowders() {
      const token = sessionStorage.getItem("accessToken");

      if (!token) {
        router.replace("/login");
        return;
      }

      setLoadingPowders(true);
      setPowderError("");

      try {
        const data = await getPowders(token);

        if (!cancelled) {
          setPowders(data);
        }
      } catch (err) {
        if (!cancelled) {
          const message =
            err instanceof Error
              ? err.message
              : "Could not load your collection.";

          setPowderError(message);

          if (message.includes("session has expired")) {
            sessionStorage.removeItem("accessToken");
            sessionStorage.removeItem("refreshToken");
            router.replace("/login");
          }
        }
      } finally {
        if (!cancelled) {
          setLoadingPowders(false);
        }
      }
    }

    loadPowders();

    return () => {
      cancelled = true;
    };
  }, [router]);

  function toggleOption(
    value: string,
    selected: string[],
    update: (values: string[]) => void
  ) {
    update(
      selected.includes(value)
        ? selected.filter((item) => item !== value)
        : [...selected, value]
    );
  }

  function togglePowder(id: number) {
    setSelectedPowderIds((previous) =>
      previous.includes(id)
        ? previous.filter((powderId) => powderId !== id)
        : [...previous, id]
    );
  }

  async function handleGenerate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setResult(null);
    setGeneratedPreferences(null);

    if (colourMode === "selected" && selectedPowderIds.length === 0) {
      setError("Select at least one powder for your palette.");
      return;
    }

    if (colourMode === "selected" && selectedPowderIds.length > 5) {
      setError("You can select a maximum of 5 powders.");
      return;
    }

    const token = sessionStorage.getItem("accessToken");

    if (!token) {
      router.replace("/login");
      return;
    }

    const request: GenerateDesignRequest = {
      colour_mode: colourMode,
      ...(colourMode === "selected"
        ? { selected_powder_ids: selectedPowderIds }
        : {}),
      finishes,
      colour_families: colourFamilies,
      undertones,
      favourites_only: favouritesOnly,
      palette_size: paletteSize,
      style,
      complexity,
      occasion,
      nail_shape: nailShape,
      nail_length: nailLength,
      preferences: preferences.trim(),
    };

    setGenerating(true);

    try {
      const data = await generateDesign(token, request);
      setResult(data);
      setGeneratedPreferences(request);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not generate your design.";

      setError(message);

      if (message.includes("session has expired")) {
        sessionStorage.removeItem("accessToken");
        sessionStorage.removeItem("refreshToken");
        router.replace("/login");
      }
    } finally {
      setGenerating(false);
    }
  }

  async function handleSave() {
    if (!result || !generatedPreferences || saving) return;

    const token = sessionStorage.getItem("accessToken");

    if (!token) {
      router.replace("/login");
      return;
    }

    setSaving(true);
    setSaveError("");

    const designData: SaveGeneratedDesignRequest = {
      generated_plan: result.design,
      style: generatedPreferences.style,
      nail_shape: generatedPreferences.nail_shape,
    };

    try {
      const savedDesign = await saveGeneratedDesign(token, designData);

      router.push(`/designs/${savedDesign.id}`);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not save this design.";

      setSaveError(message);

      if (message.includes("session has expired")) {
        sessionStorage.removeItem("accessToken");
        sessionStorage.removeItem("refreshToken");
        router.replace("/login");
      }
    } finally {
      setSaving(false);
    }
  }

  const selectedPowders = powders.filter((powder) =>
    selectedPowderIds.includes(powder.id)
  );

  return (
    <main className="min-h-screen bg-background px-5 py-8 md:px-8 md:py-10">
      <header className="mb-8">
        <Link
          href="/designs"
          className="text-sm text-text-secondary transition-colors hover:text-lavender"
        >
          ← Back to designs
        </Link>

        <p className="mt-6 text-sm tracking-widest text-blush">
          MANIBOOK AI STUDIO
        </p>

        <h1 className="mt-2 font-serif text-3xl text-lavender">
          Design generator
        </h1>

        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-text-secondary">
          Create a nail design using the colours in your personal collection.
          Choose your palette, style, and preferences, and let AI bring your
          next manicure idea to life.
        </p>
      </header>

      <form onSubmit={handleGenerate} className="space-y-6">
        {/* Colour selection */}
        <section className="rounded-2xl border border-border bg-surface p-5 shadow-card md:p-6">
          <div className="mb-5">
            <h2 className="font-serif text-xl text-lavender">
              1. Choose your colours
            </h2>
            <p className="mt-1 text-xs text-muted">
              Decide which powders AI should consider from your collection.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {[
              {
                value: "any",
                title: "Any colours",
                description: "Use any eligible colours from my collection.",
              },
              {
                value: "underused",
                title: "Prioritise underused",
                description: "Give priority to powders I use less often.",
              },
              {
                value: "selected",
                title: "Choose manually",
                description: "Only use the powders I select.",
              },
            ].map((option) => (
              <label
                key={option.value}
                className={`cursor-pointer rounded-xl border p-4 transition-colors ${
                  colourMode === option.value
                    ? "border-neon bg-neon/10"
                    : "border-border-strong bg-surface-elevated hover:border-neon"
                }`}
              >
                <input
                  type="radio"
                  name="colourMode"
                  value={option.value}
                  checked={colourMode === option.value}
                  onChange={() =>
                    setColourMode(
                      option.value as GenerateDesignRequest["colour_mode"]
                    )
                  }
                  className="sr-only"
                />

                <span className="block text-sm font-medium text-text">
                  {option.title}
                </span>
                <span className="mt-1 block text-xs leading-relaxed text-muted">
                  {option.description}
                </span>
              </label>
            ))}
          </div>

          {colourMode === "selected" && (
            <div className="mt-5 border-t border-border pt-5">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-medium text-text">
                  Select your powders
                </h3>
                <span className="text-xs text-muted">
                  {selectedPowderIds.length} / 5 selected
                </span>
              </div>

              {loadingPowders ? (
                <p className="text-sm text-muted">Loading your collection...</p>
              ) : powderError ? (
                <p className="text-sm text-danger">{powderError}</p>
              ) : powders.length === 0 ? (
                <p className="text-sm text-muted">
                  Your collection is empty. Add some powders before using manual
                  colour selection.
                </p>
              ) : (
                <div className="grid max-h-80 grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">
                  {powders.map((powder) => {
                    const checked = selectedPowderIds.includes(powder.id);
                    const atLimit = selectedPowderIds.length >= 5 && !checked;

                    return (
                      <label
                        key={powder.id}
                        className={`flex items-center gap-3 rounded-lg border p-3 transition-colors ${
                          checked
                            ? "border-neon bg-neon/10"
                            : "border-border-strong bg-surface-elevated"
                        } ${
                          atLimit
                            ? "cursor-not-allowed opacity-50"
                            : "cursor-pointer"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={atLimit}
                          onChange={() => togglePowder(powder.id)}
                          className="accent-[#B89ACB]"
                        />

                        <span
                          className="h-8 w-8 shrink-0 rounded-full border border-white/10"
                          style={{
                            backgroundColor: powder.hex_colour || "#514B54",
                          }}
                        />

                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium text-text">
                            {powder.name}
                          </span>
                          <span className="block truncate text-xs text-muted">
                            {powder.brand || formatChoice(powder.colour_family)}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}

              {selectedPowders.length > 0 && (
                <p className="mt-3 text-xs text-muted">
                  {selectedPowders.map((powder) => powder.name).join(", ")}
                </p>
              )}
            </div>
          )}

          {/* Optional powder filters */}
          <div className="mt-6 space-y-5 border-t border-border pt-5">
            <div>
              <h3 className="mb-2 text-sm font-medium text-text">
                Preferred finishes
              </h3>
              <p className="mb-3 text-xs text-muted">
                Leave empty to allow any finish.
              </p>
              <div className="flex flex-wrap gap-2">
                {FINISHES.map((finish) => {
                  const checked = finishes.includes(finish);

                  return (
                    <button
                      key={finish}
                      type="button"
                      aria-pressed={checked}
                      onClick={() =>
                        toggleOption(finish, finishes, setFinishes)
                      }
                      className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                        checked
                          ? "border-neon bg-neon/20 text-lavender"
                          : "border-border-strong text-text-secondary hover:border-neon"
                      }`}
                    >
                      {formatChoice(finish)}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <h3 className="mb-2 text-sm font-medium text-text">
                Colour families
              </h3>
              <p className="mb-3 text-xs text-muted">
                Choose one or more colour families, or leave empty for all.
              </p>
              <div className="flex flex-wrap gap-2">
                {COLOUR_FAMILIES.map((family) => {
                  const checked = colourFamilies.includes(family);

                  return (
                    <button
                      key={family}
                      type="button"
                      aria-pressed={checked}
                      onClick={() =>
                        toggleOption(family, colourFamilies, setColourFamilies)
                      }
                      className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                        checked
                          ? "border-neon bg-neon/20 text-lavender"
                          : "border-border-strong text-text-secondary hover:border-neon"
                      }`}
                    >
                      {formatChoice(family)}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <h3 className="mb-2 text-sm font-medium text-text">Undertones</h3>
              <div className="flex flex-wrap gap-2">
                {UNDERTONES.map((undertone) => {
                  const checked = undertones.includes(undertone);

                  return (
                    <button
                      key={undertone}
                      type="button"
                      aria-pressed={checked}
                      onClick={() =>
                        toggleOption(undertone, undertones, setUndertones)
                      }
                      className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                        checked
                          ? "border-neon bg-neon/20 text-lavender"
                          : "border-border-strong text-text-secondary hover:border-neon"
                      }`}
                    >
                      {formatChoice(undertone)}
                    </button>
                  );
                })}
              </div>
            </div>

            <label className="flex cursor-pointer items-center gap-2 text-sm text-text-secondary">
              <input
                type="checkbox"
                checked={favouritesOnly}
                onChange={(event) => setFavouritesOnly(event.target.checked)}
                className="accent-[#B89ACB]"
              />
              Only consider my favourite powders
            </label>
          </div>
        </section>

        {/* Design preferences */}
        <section className="rounded-2xl border border-border bg-surface p-5 shadow-card md:p-6">
          <div className="mb-5">
            <h2 className="font-serif text-xl text-lavender">
              2. Define your design
            </h2>
            <p className="mt-1 text-xs text-muted">
              Tell AI what kind of manicure you want to create.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="design-style" className={labelClass}>
                Design style
              </label>
              <select
                id="design-style"
                value={style}
                onChange={(event) =>
                  setStyle(event.target.value as GenerateDesignRequest["style"])
                }
                className={inputClass}
              >
                {STYLES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="design-complexity" className={labelClass}>
                Complexity
              </label>
              <select
                id="design-complexity"
                value={complexity}
                onChange={(event) =>
                  setComplexity(
                    event.target.value as GenerateDesignRequest["complexity"]
                  )
                }
                className={inputClass}
              >
                <option value="low">Simple</option>
                <option value="medium">Moderate</option>
                <option value="high">Detailed</option>
              </select>
            </div>

            <div>
              <label htmlFor="design-occasion" className={labelClass}>
                Occasion
              </label>
              <select
                id="design-occasion"
                value={occasion}
                onChange={(event) =>
                  setOccasion(
                    event.target.value as NonNullable<
                      GenerateDesignRequest["occasion"]
                    >
                  )
                }
                className={inputClass}
              >
                <option value="everyday">Everyday</option>
                <option value="party_event">Party / Event</option>
                <option value="seasonal">Seasonal</option>
              </select>
            </div>

            <div>
              <label htmlFor="design-palette-size" className={labelClass}>
                Palette size
              </label>
              <select
                id="design-palette-size"
                value={paletteSize}
                onChange={(event) => setPaletteSize(Number(event.target.value))}
                className={inputClass}
              >
                {[1, 2, 3, 4, 5].map((size) => (
                  <option key={size} value={size}>
                    {size} {size === 1 ? "colour" : "colours"}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="design-shape" className={labelClass}>
                Nail shape
              </label>
              <select
                id="design-shape"
                value={nailShape}
                onChange={(event) => setNailShape(event.target.value)}
                className={inputClass}
              >
                {SHAPES.map((shape) => (
                  <option key={shape} value={shape}>
                    {formatChoice(shape)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="design-length" className={labelClass}>
                Nail length
              </label>
              <select
                id="design-length"
                value={nailLength}
                onChange={(event) => setNailLength(event.target.value)}
                className={inputClass}
              >
                {LENGTHS.map((length) => (
                  <option key={length} value={length}>
                    {formatChoice(length)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-5">
            <label htmlFor="design-preferences" className={labelClass}>
              Additional preferences
            </label>
            <textarea
              id="design-preferences"
              value={preferences}
              onChange={(event) =>
                setPreferences(event.target.value.slice(0, 500))
              }
              maxLength={500}
              rows={4}
              placeholder="For example: I want delicate floral details, subtle glitter accents, and a romantic autumn feeling..."
              className={inputClass}
            />
            <p className="mt-1 text-right text-xs text-muted">
              {preferences.length}/500
            </p>
          </div>
        </section>

        {error && (
          <p
            role="alert"
            className="rounded-xl border border-danger/30 bg-surface p-4 text-sm text-danger"
          >
            {error}
          </p>
        )}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Link
            href="/designs"
            className="rounded-lg border border-border-strong px-5 py-3 text-center text-sm font-medium text-text-secondary transition-colors hover:border-neon hover:text-lavender"
          >
            Cancel
          </Link>

          <button
            type="submit"
            disabled={
              generating ||
              loadingPowders ||
              (colourMode === "selected" && selectedPowderIds.length === 0)
            }
            className="rounded-lg bg-berry px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-berry-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            {generating ? "Creating your design..." : "Generate design"}
          </button>
        </div>
      </form>

      {/* Generated design preview */}
      {result && (
        <section className="mt-10 space-y-6">
          {/* Design overview */}
          <div className="overflow-hidden rounded-2xl border border-neon bg-surface shadow-card">
            <div className="border-b border-border bg-neon/10 p-5 md:p-6">
              <p className="text-xs font-medium tracking-widest text-blush">
                YOUR AI-GENERATED DESIGN
              </p>

              <h2 className="mt-2 font-serif text-3xl text-lavender">
                {result.design.title}
              </h2>

              <p className="mt-3 max-w-3xl text-sm leading-relaxed text-text-secondary">
                {result.design.concept}
              </p>

              {generatedPreferences && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {[
                    formatChoice(generatedPreferences.style),
                    `${formatChoice(
                      generatedPreferences.complexity
                    )} complexity`,
                    formatChoice(generatedPreferences.occasion),
                    formatChoice(generatedPreferences.nail_shape || ""),
                    formatChoice(generatedPreferences.nail_length || ""),
                  ]
                    .filter(Boolean)
                    .map((item) => (
                      <span
                        key={item}
                        className="rounded-full border border-border-strong bg-surface px-3 py-1 text-xs text-text-secondary"
                      >
                        {item}
                      </span>
                    ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 divide-x divide-border">
              <div className="p-4 text-center">
                <p className="font-serif text-2xl text-lavender">
                  {result.palette_powders.length}
                </p>
                <p className="mt-1 text-xs text-muted">Colours</p>
              </div>

              <div className="p-4 text-center">
                <p className="font-serif text-2xl text-lavender">
                  {result.design.nails.length}
                </p>
                <p className="mt-1 text-xs text-muted">Nail designs</p>
              </div>

              <div className="p-4 text-center">
                <p className="font-serif text-2xl text-lavender">
                  {result.selection_summary.total_eligible}
                </p>
                <p className="mt-1 text-xs text-muted">Eligible powders</p>
              </div>
            </div>
          </div>

          {/* Colour palette */}
          <div className="rounded-2xl border border-border bg-surface p-5 shadow-card md:p-6">
            <div className="mb-5">
              <p className="text-xs tracking-widest text-blush">
                THE COLOUR STORY
              </p>

              <h3 className="mt-1 font-serif text-2xl text-lavender">
                Your palette
              </h3>

              <p className="mt-1 text-sm text-text-secondary">
                Every colour below comes from your personal powder collection.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {result.design.palette.map((item) => {
                const powder = result.palette_powders.find(
                  (candidate) => candidate.id === item.powder_id
                );

                if (!powder) return null;

                return (
                  <div
                    key={item.powder_id}
                    className="overflow-hidden rounded-xl border border-border-strong bg-surface-elevated"
                  >
                    <div className="flex items-center gap-3 p-4">
                      <span
                        className="h-14 w-14 shrink-0 rounded-full border border-white/10 shadow-inner"
                        style={{
                          backgroundColor: powder.hex_colour || "#514B54",
                        }}
                        aria-label={`Colour swatch for ${powder.name}`}
                      />

                      <div className="min-w-0">
                        <h4 className="truncate text-sm font-medium text-text">
                          {powder.name}
                        </h4>

                        <p className="truncate text-xs text-muted">
                          {powder.brand || "No brand specified"}
                        </p>

                        <p className="mt-1 text-xs text-text-secondary">
                          {formatChoice(powder.finish)} ·{" "}
                          {formatChoice(powder.colour_family)}
                        </p>
                      </div>
                    </div>

                    <div className="border-t border-border px-4 py-3">
                      <p className="text-xs font-medium text-blush">
                        {item.role}
                      </p>

                      <p className="mt-1 text-xs leading-relaxed text-text-secondary">
                        {item.reason}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Five-nail design */}
          <div className="rounded-2xl border border-border bg-surface p-5 shadow-card md:p-6">
            <div className="mb-5">
              <p className="text-xs tracking-widest text-blush">THE MANICURE</p>

              <h3 className="mt-1 font-serif text-2xl text-lavender">
                Your five-nail design
              </h3>

              <p className="mt-1 text-sm text-text-secondary">
                Individual instructions for each nail, from thumb to pinky.
              </p>
            </div>

            <div className="space-y-4">
              {result.design.nails.map((nail, index) => {
                const nailPowders = nail.powder_ids
                  .map((id) =>
                    result.palette_powders.find((powder) => powder.id === id)
                  )
                  .filter((powder) => powder !== undefined);

                return (
                  <article
                    key={nail.finger}
                    className="rounded-xl border border-border-strong bg-surface-elevated p-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-neon bg-neon/10 font-serif text-lg text-lavender">
                        {index + 1}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h4 className="font-medium capitalize text-text">
                            {nail.finger}
                          </h4>

                          <div className="flex flex-wrap gap-2">
                            <span className="rounded-full bg-neon/10 px-2.5 py-1 text-xs text-lavender">
                              {formatChoice(nail.technique)}
                            </span>

                            <span className="rounded-full border border-border-strong px-2.5 py-1 text-xs text-text-secondary">
                              {formatChoice(nail.pattern)}
                            </span>
                          </div>
                        </div>

                        <p className="mt-3 text-sm leading-relaxed text-text-secondary">
                          {nail.description}
                        </p>

                        <div className="mt-3">
                          <p className="mb-2 text-xs font-medium text-muted">
                            POWDERS USED
                          </p>

                          <div className="flex flex-wrap gap-2">
                            {nailPowders.map((powder) => (
                              <span
                                key={powder.id}
                                className="inline-flex items-center gap-2 rounded-full border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-text-secondary"
                              >
                                <span
                                  className="h-4 w-4 rounded-full border border-white/10"
                                  style={{
                                    backgroundColor:
                                      powder.hex_colour || "#514B54",
                                  }}
                                />
                                {powder.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>

          {/* Finishing instructions */}
          <div className="rounded-2xl border border-border bg-surface p-5 shadow-card md:p-6">
            <p className="text-xs tracking-widest text-blush">
              THE FINAL TOUCHES
            </p>

            <h3 className="mt-1 font-serif text-2xl text-lavender">
              Finishing tips
            </h3>

            <p className="mt-1 text-sm text-text-secondary">
              Suggestions to help you bring this design to life.
            </p>

            <ol className="mt-5 space-y-3">
              {result.design.finishing_tips.map((tip, index) => (
                <li key={index} className="flex items-start gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-neon/10 text-xs font-medium text-lavender">
                    {index + 1}
                  </span>

                  <p className="pt-1 text-sm leading-relaxed text-text-secondary">
                    {tip}
                  </p>
                </li>
              ))}
            </ol>
          </div>

          {/* Save status and next steps */}
          <div className="rounded-2xl border border-border bg-surface p-5 md:p-6">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 text-lavender">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  className="h-6 w-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 3v18m9-9H3"
                  />
                </svg>
              </span>

              <div className="mt-8 rounded-2xl border border-border bg-surface p-6">
                <div>
                  <h2 className="text-lg font-semibold text-text">
                    Save your design
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-text-secondary">
                    Your generated design is ready. Save it to your collection
                    to keep the design plan and its selected powders.
                  </p>
                </div>

                {saveError && (
                  <div className="mt-4 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
                    {saveError}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="mt-5 w-full rounded-xl bg-berry px-5 py-3 text-sm font-medium text-white transition hover:bg-berry-dark disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                >
                  {saving ? "Saving design..." : "Save design to my collection"}
                </button>
              </div>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
