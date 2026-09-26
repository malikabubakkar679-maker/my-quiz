"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Camera, Check, Loader2, X } from "lucide-react";
import { Button, Field, Input, Select, Textarea } from "@/components/ui";
import { InlineAlert } from "@/components/states";
import { UserAvatar } from "@/components/UserAvatar";
import { ApiError, api } from "@/lib/fetcher";
import type { Profile } from "@/lib/types";
import { cn } from "@/lib/utils";
import { profileSchema, usernameSchema } from "@/lib/validation";

type Availability = { state: "idle" | "checking" | "available" | "taken" | "invalid"; message?: string };

export function ProfileForm({ profile, mode }: { profile: Profile; mode: "onboarding" | "edit" }) {
  const router = useRouter();
  const [form, setForm] = useState({
    display_name: profile.display_name ?? "",
    username: profile.username ?? "",
    avatar_url: profile.avatar_url ?? "",
    institution_type: profile.institution_type ?? "",
    institution_name: profile.institution_name ?? "",
    city: profile.city ?? "",
    country: profile.country ?? "",
    bio: profile.bio ?? "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [avail, setAvail] = useState<Availability>({ state: "idle" });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: "danger" | "success"; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const set = (k: keyof typeof form, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: "" }));
  };

  useEffect(() => {
    const raw = form.username.trim().toLowerCase();
    if (!raw || raw === profile.username) {
      setAvail({ state: "idle" });
      return;
    }
    const parsed = usernameSchema.safeParse(raw);
    if (!parsed.success) {
      setAvail({ state: "invalid", message: parsed.error.issues[0]?.message });
      return;
    }
    setAvail({ state: "checking" });
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const r = await api<{ available: boolean; reason?: string }>(`/api/profile/username?u=${encodeURIComponent(raw)}`, { signal: ctrl.signal });
        setAvail(r.available ? { state: "available" } : { state: "taken", message: r.reason ?? "Username already taken" });
      } catch (e) {
        if ((e as Error).name !== "AbortError") setAvail({ state: "idle" });
      }
    }, 350);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [form.username, profile.username]);

  const upload = async (file: File) => {
    if (file.size > 2 * 1024 * 1024) return setErrors((e) => ({ ...e, avatar_url: "Images must be 2 MB or smaller." }));
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return setErrors((e) => ({ ...e, avatar_url: "Only JPEG, PNG or WebP images are supported." }));
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const { url } = await api<{ url: string }>("/api/profile/avatar", { method: "POST", body });
      set("avatar_url", url);
    } catch (e) {
      setErrors((x) => ({ ...x, avatar_url: (e as Error).message }));
    } finally {
      setUploading(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    const parsed = profileSchema.safeParse(form);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const i of parsed.error.issues) errs[String(i.path[0])] ??= i.path[0] === "avatar_url" ? "Profile photo is required" : i.path[0] === "institution_type" ? "Choose an institution type" : i.message;
      setErrors(errs);
      return;
    }
    if (avail.state === "taken") return setErrors((x) => ({ ...x, username: "Username already taken" }));
    setSaving(true);
    try {
      await api("/api/profile", { method: "PUT", json: parsed.data });
      if (mode === "onboarding") {
        router.refresh();
      } else {
        setMessage({ tone: "success", text: "Profile saved." });
        router.refresh();
      }
    } catch (err) {
      if (err instanceof ApiError && err.data?.field === "username") {
        setAvail({ state: "taken", message: err.message });
        setErrors((x) => ({ ...x, username: err.message }));
      } else setMessage({ tone: "danger", text: (err as Error).message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className={cn("group relative rounded-full focus-visible:outline-2 focus-visible:outline-brand", errors.avatar_url && "ring-2 ring-danger")}
          aria-label="Upload profile photo"
        >
          <UserAvatar src={form.avatar_url || null} name={form.username || form.display_name || "?"} size="xl" />
          <span className="absolute inset-0 grid place-items-center rounded-full bg-black/50 opacity-0 transition group-hover:opacity-100">
            {uploading ? <Loader2 className="size-6 animate-spin" /> : <Camera className="size-6" />}
          </span>
        </button>
        <div className="space-y-1">
          <p className="text-sm font-medium">Profile photo <span className="text-brand">*</span></p>
          <p className="text-xs text-muted">JPEG, PNG or WebP · up to 2 MB</p>
          <Button type="button" size="sm" variant="secondary" loading={uploading} onClick={() => fileRef.current?.click()}>
            {form.avatar_url ? "Change photo" : "Upload photo"}
          </Button>
          {errors.avatar_url && <p className="text-xs text-rose-400">{errors.avatar_url}</p>}
        </div>
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Display name" required error={errors.display_name} htmlFor="display_name">
          <Input id="display_name" value={form.display_name} maxLength={50} onChange={(e) => set("display_name", e.target.value)} placeholder="Ada Lovelace" />
        </Field>
        <Field
          label="Username"
          required
          htmlFor="username"
          error={errors.username || (avail.state === "taken" || avail.state === "invalid" ? avail.message : null)}
          hint={
            avail.state === "checking" ? <span className="flex items-center gap-1"><Loader2 className="size-3 animate-spin" /> Checking…</span>
            : avail.state === "available" ? <span className="flex items-center gap-1 text-emerald-400"><Check className="size-3" /> Available</span>
            : "Lowercase letters, numbers and underscores"
          }
        >
          <div className="relative">
            <span className="absolute top-1/2 left-3.5 -translate-y-1/2 text-sm text-muted">@</span>
            <Input id="username" value={form.username} maxLength={20} autoComplete="off" className="pl-8" onChange={(e) => set("username", e.target.value.toLowerCase().replace(/\s/g, ""))} placeholder="ada_l" />
            {avail.state === "available" && <Check className="absolute top-1/2 right-3 size-4 -translate-y-1/2 text-emerald-400" />}
            {avail.state === "taken" && <X className="absolute top-1/2 right-3 size-4 -translate-y-1/2 text-rose-400" />}
          </div>
        </Field>
        <Field label="Institution type" required error={errors.institution_type} htmlFor="institution_type">
          <Select id="institution_type" value={form.institution_type} onChange={(e) => set("institution_type", e.target.value)}>
            <option value="" disabled>Select…</option>
            <option value="school">School</option>
            <option value="college">College</option>
            <option value="university">University</option>
          </Select>
        </Field>
        <Field label="Institution name" required error={errors.institution_name} htmlFor="institution_name">
          <Input id="institution_name" value={form.institution_name} maxLength={120} onChange={(e) => set("institution_name", e.target.value)} placeholder="Springfield High" />
        </Field>
        <Field label="City" htmlFor="city" error={errors.city}>
          <Input id="city" value={form.city} maxLength={80} onChange={(e) => set("city", e.target.value)} placeholder="Optional" />
        </Field>
        <Field label="Country" htmlFor="country" error={errors.country}>
          <Input id="country" value={form.country} maxLength={80} onChange={(e) => set("country", e.target.value)} placeholder="Optional" />
        </Field>
      </div>
      <Field label="Bio" htmlFor="bio" error={errors.bio} hint={`${form.bio.length}/300`}>
        <Textarea id="bio" value={form.bio} maxLength={300} onChange={(e) => set("bio", e.target.value)} placeholder="Tell other players about yourself (optional)" />
      </Field>
      {message && <InlineAlert tone={message.tone}>{message.text}</InlineAlert>}
      <Button type="submit" size="lg" className="w-full sm:w-auto" loading={saving} disabled={uploading}>
        {mode === "onboarding" ? "Complete profile" : "Save changes"}
      </Button>
    </form>
  );
}
