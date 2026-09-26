import { RoomView } from "@/components/RoomView";

export const metadata = { title: "Quiz Room" };

export default async function RoomPage({ params, searchParams }: { params: Promise<{ code: string }>; searchParams: Promise<{ created?: string }> }) {
  const [{ code }, sp] = await Promise.all([params, searchParams]);
  return <RoomView code={code.toUpperCase()} justCreated={sp.created === "1"} />;
}
