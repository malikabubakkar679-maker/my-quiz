"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui";

export const LazyActivityChart = dynamic(() => import("@/components/admin/ActivityChart"), { ssr: false, loading: () => <Skeleton className="h-[260px]" /> });
