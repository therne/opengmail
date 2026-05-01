import { ThreadRoute } from "@/components/gmail-clone";

export default async function ThreadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <ThreadRoute messageId={decodeURIComponent(id)} />;
}
