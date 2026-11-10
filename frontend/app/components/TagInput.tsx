"use client";

import { useEffect, useState } from "react";
import { createTag, getTags, Tag } from "@/lib/api";

interface TagInputProps {
  accessToken: string;
  selectedTags: number[];
  onChange: (tagIds: number[]) => void;
}

export default function TagInput({
  accessToken,
  selectedTags,
  onChange,
}: TagInputProps) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadTags() {
      try {
        setLoading(true);
        const data = await getTags(accessToken);
        setTags(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load tags.");
      } finally {
        setLoading(false);
      }
    }

    loadTags();
  }, [accessToken]);

  const selectedTagObjects = tags.filter((tag) =>
    selectedTags.includes(tag.id)
  );

  const filteredTags = tags.filter(
    (tag) =>
      tag.name.toLowerCase().includes(input.trim().toLowerCase()) &&
      !selectedTags.includes(tag.id)
  );

  const exactMatch = tags.find(
    (tag) => tag.name.toLowerCase() === input.trim().toLowerCase()
  );

  function addTag(tag: Tag) {
    if (selectedTags.includes(tag.id)) return;

    onChange([...selectedTags, tag.id]);
    setInput("");
    setError("");
  }

  function removeTag(tagId: number) {
    onChange(selectedTags.filter((id) => id !== tagId));
  }

  async function handleCreateTag() {
    const name = input.trim();

    if (!name || creating) return;

    // Reuse an existing tag instead of creating a duplicate.
    if (exactMatch) {
      addTag(exactMatch);
      return;
    }

    try {
      setCreating(true);
      setError("");

      const newTag = await createTag(accessToken, name);

      setTags((previous) => [...previous, newTag]);
      addTag(newTag);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create tag.");
    } finally {
      setCreating(false);
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();

      if (exactMatch) {
        addTag(exactMatch);
      } else if (input.trim()) {
        handleCreateTag();
      }
    }
  }

  return (
    <div className="space-y-3">
      {/* Selected tags */}
      {selectedTagObjects.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedTagObjects.map((tag) => (
            <span
              key={tag.id}
              className="inline-flex items-center gap-2 rounded-full border border-border-strong bg-surface px-3 py-1.5 text-sm text-lavender"
            >
              {tag.name}

              <button
                type="button"
                onClick={() => removeTag(tag.id)}
                aria-label={`Remove ${tag.name} tag`}
                className="text-text-secondary transition hover:text-berry"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Search and create input */}
      <div className="relative">
        <input
          type="text"
          value={input}
          onChange={(event) => {
            setInput(event.target.value);
            setError("");
          }}
          onKeyDown={handleKeyDown}
          placeholder="Search or create a tag..."
          maxLength={50}
          disabled={loading || creating}
          className="w-full rounded-lg border border-border bg-surface px-4 py-3 text-sm text-text outline-none transition placeholder:text-muted focus:border-orchid focus:ring-2 focus:ring-orchid/20 disabled:opacity-50"
        />

        {/* Suggestions */}
        {input.trim() && !loading && (
          <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-lg border border-border bg-surface shadow-xl">
            {filteredTags.map((tag) => (
              <button
                key={tag.id}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => addTag(tag)}
                className="flex w-full items-center justify-between px-4 py-3 text-left text-sm text-text-secondary transition hover:bg-surface-hover hover:text-text"
              >
                <span>{tag.name}</span>
                <span className="text-xs text-muted">Existing</span>
              </button>
            ))}

            {!exactMatch && (
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={handleCreateTag}
                disabled={creating}
                className="flex w-full items-center justify-between border-t border-border px-4 py-3 text-left text-sm text-blush transition hover:bg-surface-hover disabled:opacity-50"
              >
                <span>
                  {creating ? "Creating..." : `Create "${input.trim()}"`}
                </span>
                <span className="text-xs text-berry">New</span>
              </button>
            )}

            {filteredTags.length === 0 && exactMatch && (
              <p className="px-4 py-3 text-sm text-muted">
                This tag is already selected.
              </p>
            )}

            {filteredTags.length === 0 && !exactMatch && (
              <p className="px-4 py-3 text-xs text-muted">
                No matching tags found.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Helper text */}
      <p className="text-xs text-muted">
        Select existing tags or create your own. Press Enter to add a tag.
      </p>

      {loading && <p className="text-xs text-muted">Loading tags...</p>}

      {error && (
        <p role="alert" className="text-sm text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}
