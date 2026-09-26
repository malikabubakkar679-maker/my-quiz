import { randomUUID } from "crypto";
import { requireProfile } from "@/lib/auth";
import { fail, limit, ok, route } from "@/lib/api";
import { db } from "@/lib/supabase/admin";

const MAX_BYTES = 2 * 1024 * 1024;

function sniff(buf: Uint8Array): { ext: string; mime: string } | null {
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { ext: "jpg", mime: "image/jpeg" };
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return { ext: "png", mime: "image/png" };
  if (
    buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
    buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50
  )
    return { ext: "webp", mime: "image/webp" };
  return null;
}

export const POST = route(async (req) => {
  const profile = await requireProfile({ onboarded: false });
  limit(`avatar:${profile.id}`, 10);
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return fail(400, "Please choose an image.");
  if (file.size > MAX_BYTES) return fail(400, "Images must be 2 MB or smaller.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const kind = sniff(bytes);
  if (!kind) return fail(400, "Only JPEG, PNG or WebP images are supported.");

  const path = `${profile.id}/${randomUUID()}.${kind.ext}`;
  const storage = db().storage.from("avatars");
  const { error } = await storage.upload(path, bytes, { contentType: kind.mime, upsert: false, cacheControl: "31536000" });
  if (error) throw error;
  const { data } = storage.getPublicUrl(path);

  if (profile.onboarding_completed) {
    const old = profile.avatar_url?.split("/avatars/")[1];
    await db().from("profiles").update({ avatar_url: data.publicUrl }).eq("id", profile.id);
    if (old && old.startsWith(`${profile.id}/`)) await storage.remove([old]);
  }
  return ok({ url: data.publicUrl });
});
