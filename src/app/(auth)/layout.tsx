import { ClerkLoaded, ClerkLoading } from "@clerk/nextjs";
import { Logo } from "@/components/Logo";
import { Skeleton } from "@/components/ui";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <section className="relative hidden overflow-hidden border-r border-line lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="absolute -top-40 -left-40 size-[520px] rounded-full bg-brand/25 blur-[120px]" />
        <div className="absolute -right-40 -bottom-40 size-[520px] rounded-full bg-brand-2/20 blur-[120px]" />
        <Logo className="relative" />
        <div className="relative max-w-md">
          <h1 className="font-display text-4xl leading-tight font-bold">
            Test Your Knowledge. <span className="text-gradient">Compete. Win.</span>
          </h1>
          <p className="mt-4 text-muted">Take quizzes, host live multiplayer rooms, challenge friends and climb the international leaderboard.</p>
        </div>
        <p className="relative text-xs text-muted">© {new Date().getFullYear()} My Quiz</p>
      </section>
      <section className="flex flex-col items-center justify-center gap-8 p-4 sm:p-8">
        <Logo className="lg:hidden" />
        <ClerkLoading>
          <div className="w-full max-w-sm space-y-3">
            <Skeleton className="h-10" />
            <Skeleton className="h-11" />
            <Skeleton className="h-11" />
            <Skeleton className="h-11" />
          </div>
        </ClerkLoading>
        <ClerkLoaded>{children}</ClerkLoaded>
      </section>
    </div>
  );
}
