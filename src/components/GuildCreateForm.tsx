"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createGuild } from "@/app/actions/guilds";

/**
 * Inline create-form rendered on /guilds when the viewer has no guild.
 * Submitting calls createGuild and redirects to the new /g/{slug}.
 */
export default function GuildCreateForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      const { slug } = await createGuild({ name, description });
      router.push(`/g/${slug}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create guild");
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="relative bg-slate-950/80 border border-cyan-400/40 shadow-[0_0_30px_rgba(34,211,238,0.2),inset_0_0_20px_rgba(34,211,238,0.05)] p-6 space-y-4"
    >
      <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-cyan-300 pointer-events-none" />
      <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-cyan-300 pointer-events-none" />
      <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-cyan-300 pointer-events-none" />
      <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-cyan-300 pointer-events-none" />

      <div>
        <p className="text-[10px] tracking-[0.4em] uppercase text-cyan-400/70 mb-1">
          Forge a Guild
        </p>
        <p className="text-xs text-slate-400 leading-relaxed">
          Name your band of hunters. You'll be the owner — accept new members
          one request at a time.
        </p>
      </div>

      <div>
        <label
          htmlFor="guild-name"
          className="block text-[10px] tracking-[0.3em] uppercase text-slate-400 mb-1"
        >
          Name
        </label>
        <input
          id="guild-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={32}
          placeholder="Dawn Walkers"
          required
          className="w-full bg-slate-950/80 border border-slate-700 focus:border-cyan-400/60 focus:outline-none text-sm text-slate-200 px-3 py-2 placeholder:text-slate-600 tracking-wide"
        />
        <p className="text-[9px] text-slate-600 mt-1">
          3–32 characters. URL becomes /g/{slugify(name) || "your-guild"}.
        </p>
      </div>

      <div>
        <label
          htmlFor="guild-description"
          className="block text-[10px] tracking-[0.3em] uppercase text-slate-400 mb-1"
        >
          Description (optional)
        </label>
        <textarea
          id="guild-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={280}
          rows={3}
          placeholder="What's your guild about?"
          className="w-full bg-slate-950/80 border border-slate-700 focus:border-cyan-400/60 focus:outline-none text-sm text-slate-200 px-3 py-2 placeholder:text-slate-600 tracking-wide leading-relaxed resize-none"
        />
      </div>

      {error && (
        <p className="text-xs text-red-400 leading-relaxed">{error}</p>
      )}

      <button
        type="submit"
        disabled={submitting || name.trim().length < 3}
        className="w-full px-6 py-3 bg-cyan-500/20 border border-cyan-400 text-cyan-100 text-xs uppercase tracking-[0.4em] hover:bg-cyan-500/40 transition-all shadow-[0_0_20px_rgba(34,211,238,0.4)] disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {submitting ? "Forging…" : "Create Guild"}
      </button>
    </form>
  );
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}
