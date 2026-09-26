import { Logo } from "@/components/Logo";
import { ButtonLink } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="grid min-h-dvh place-items-center p-6 text-center">
      <div>
        <Logo className="mb-8 justify-center" />
        <p className="text-gradient font-display text-6xl font-bold">404</p>
        <p className="mt-2 text-muted">We couldn’t find that page.</p>
        <ButtonLink href="/" className="mt-6">Back to Home</ButtonLink>
      </div>
    </div>
  );
}
