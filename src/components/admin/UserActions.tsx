"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui";
import { api } from "@/lib/fetcher";

export function UserActions({ id, role, banned, self }: { id: string; role: string; banned: boolean; self: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  if (self) return <span className="text-xs text-muted">You</span>;
  const patch = async (name: string, body: Record<string, unknown>) => {
    setBusy(name);
    try {
      await api(`/api/admin/users/${id}`, { method: "PATCH", json: body });
      router.refresh();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setBusy(null);
    }
  };
  return (
    <div className="flex justify-end gap-2">
      <Button size="sm" variant="secondary" loading={busy === "role"} onClick={() => patch("role", { role: role === "admin" ? "user" : "admin" })}>{role === "admin" ? "Revoke admin" : "Make admin"}</Button>
      <Button size="sm" variant={banned ? "secondary" : "danger"} loading={busy === "ban"} onClick={() => patch("ban", { is_banned: !banned })}>{banned ? "Unban" : "Ban"}</Button>
    </div>
  );
}

export function ReportActions({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const set = async (s: string) => {
    setBusy(s);
    try {
      await api(`/api/admin/reports/${id}`, { method: "PATCH", json: { status: s } });
      router.refresh();
    } finally {
      setBusy(null);
    }
  };
  return status === "open" ? (
    <div className="flex justify-end gap-2">
      <Button size="sm" loading={busy === "resolved"} onClick={() => set("resolved")}>Resolve</Button>
      <Button size="sm" variant="secondary" loading={busy === "dismissed"} onClick={() => set("dismissed")}>Dismiss</Button>
    </div>
  ) : (
    <Button size="sm" variant="ghost" loading={busy === "open"} onClick={() => set("open")}>Reopen</Button>
  );
}
