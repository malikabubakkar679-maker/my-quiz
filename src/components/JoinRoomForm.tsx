"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, QrCode, X } from "lucide-react";
import { Button } from "@/components/ui";
import { InlineAlert } from "@/components/states";
import { api } from "@/lib/fetcher";
import { cn } from "@/lib/utils";

const CODE_RE = /^[A-Z0-9]{8}$/;

type Detector = { detect: (src: HTMLVideoElement) => Promise<{ rawValue: string }[]> };

export function JoinRoomForm({ initialCode = "", autoJoin = false, large = false }: { initialCode?: string; autoJoin?: boolean; large?: boolean }) {
  const router = useRouter();
  const [code, setCode] = useState(initialCode.toUpperCase().slice(0, 8));
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [canScan, setCanScan] = useState(false);
  const auto = useRef(false);

  const join = useCallback(
    async (value: string) => {
      const c = value.trim().toUpperCase();
      if (!CODE_RE.test(c)) return setError("Invalid room code. Codes are 8 letters or numbers.");
      setError(null);
      setLoading(true);
      try {
        await api(`/api/rooms/${c}/join`, { method: "POST" });
        router.push(`/rooms/${c}`);
      } catch (e) {
        setError((e as Error).message);
        setLoading(false);
      }
    },
    [router],
  );

  useEffect(() => {
    setCanScan(typeof window !== "undefined" && "BarcodeDetector" in window && !!navigator.mediaDevices);
    if (autoJoin && initialCode && !auto.current) {
      auto.current = true;
      join(initialCode);
    }
  }, [autoJoin, initialCode, join]);

  return (
    <div className="space-y-3">
      <form
        className="flex flex-col gap-2 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          join(code);
        }}
      >
        <input
          value={code}
          onChange={(e) => {
            setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8));
            setError(null);
          }}
          placeholder="Enter room code"
          aria-label="Room code"
          autoCapitalize="characters"
          autoComplete="off"
          className={cn(
            "w-full flex-1 rounded-xl border border-line bg-white/[0.05] px-4 font-mono tracking-[0.25em] uppercase outline-none placeholder:font-sans placeholder:tracking-normal placeholder:normal-case placeholder:text-muted focus:border-brand/60 focus:ring-4 focus:ring-brand/15",
            large ? "h-14 text-lg" : "h-12",
          )}
        />
        <div className="flex gap-2">
          <Button type="submit" size="lg" loading={loading} className={cn("flex-1 sm:flex-none", large && "h-14")}>
            Join Room <ArrowRight className="size-4" />
          </Button>
          {canScan && (
            <Button type="button" variant="secondary" size="lg" className={cn(large && "h-14")} aria-label="Scan QR code" onClick={() => setScanning(true)}>
              <QrCode className="size-5" />
            </Button>
          )}
        </div>
      </form>
      {error && <InlineAlert>{error}</InlineAlert>}
      {scanning && (
        <QrScanner
          onClose={() => setScanning(false)}
          onCode={(raw) => {
            setScanning(false);
            const match = raw.match(/code=([A-Z0-9]{8})/i) ?? raw.match(/\/rooms\/([A-Z0-9]{8})/i) ?? raw.match(/^([A-Z0-9]{8})$/i);
            if (match) {
              setCode(match[1].toUpperCase());
              join(match[1]);
            } else setError("That QR code isn't a My Quiz room.");
          }}
        />
      )}
    </div>
  );
}

function QrScanner({ onCode, onClose }: { onCode: (v: string) => void; onClose: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    let stream: MediaStream | null = null;
    let raf = 0;
    let stopped = false;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (!video.current) return;
        video.current.srcObject = stream;
        await video.current.play();
        const Ctor = (window as unknown as { BarcodeDetector: new (o: { formats: string[] }) => Detector }).BarcodeDetector;
        const detector = new Ctor({ formats: ["qr_code"] });
        const tick = async () => {
          if (stopped || !video.current) return;
          const found = await detector.detect(video.current).catch(() => []);
          if (found[0]) return onCode(found[0].rawValue);
          raf = requestAnimationFrame(tick);
        };
        tick();
      } catch {
        setErr("Camera access was denied or is unavailable.");
      }
    })();
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [onCode]);
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4" role="dialog" aria-label="Scan QR code">
      <div className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-line bg-surface">
        <button onClick={onClose} aria-label="Close scanner" className="absolute top-3 right-3 z-10 grid size-9 place-items-center rounded-full bg-black/60">
          <X className="size-5" />
        </button>
        {err ? <p className="p-8 text-center text-sm text-rose-300">{err}</p> : <video ref={video} className="aspect-square w-full object-cover" muted playsInline />}
        <p className="p-3 text-center text-xs text-muted">Point your camera at a My Quiz room QR code</p>
      </div>
    </div>
  );
}
