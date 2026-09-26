"use client";

import { usePathname } from "next/navigation";
import { TabLinks } from "@/components/ui";

const items = [
  { value: "/admin", label: "Analytics", href: "/admin" },
  { value: "/admin/content", label: "Content", href: "/admin/content" },
  { value: "/admin/users", label: "Users", href: "/admin/users" },
  { value: "/admin/rooms", label: "Rooms", href: "/admin/rooms" },
  { value: "/admin/results", label: "Results", href: "/admin/results" },
  { value: "/admin/reports", label: "Reports", href: "/admin/reports" },
];

export function TabLinksNav() {
  const pathname = usePathname();
  return <TabLinks value={pathname} options={items} />;
}
