import { Crown, Globe2, Home, Layers, PlusSquare, Swords, Trophy, User, Zap, type LucideIcon } from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon; match?: string[] };

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Home", icon: Home },
  { href: "/courses", label: "Courses", icon: Layers },
  { href: "/quiz", label: "Single Quiz", icon: Zap, match: ["/quiz", "/results"] },
  { href: "/rooms/create", label: "Create Quiz", icon: PlusSquare, match: ["/rooms"] },
  { href: "/challenge", label: "Challenge Quiz", icon: Swords },
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { href: "/international", label: "International", icon: Globe2 },
  { href: "/profile", label: "Profile", icon: User, match: ["/profile", "/u/"] },
];

export const MOBILE_TABS: NavItem[] = [
  NAV_ITEMS[0],
  NAV_ITEMS[1],
  NAV_ITEMS[2],
  NAV_ITEMS[4],
  { href: "/leaderboard", label: "Ranks", icon: Crown, match: ["/leaderboard", "/international"] },
];

export function isActive(pathname: string, item: NavItem) {
  if (item.href === "/") return pathname === "/";
  return (item.match ?? [item.href]).some((m) => pathname === m || pathname.startsWith(m.endsWith("/") ? m : `${m}/`) || pathname === m);
}
