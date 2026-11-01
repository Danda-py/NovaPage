export const instant = false;
export const metadata = { title: "Editor", robots: { index: false, follow: false } };
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { getChat, getSite, listRestorableMessages } from "@/lib/store";
import { getCurrentUser } from "@/lib/auth";
import { Editor } from "@/components/Editor";

export default async function EditorPage({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const site = await getSite(id);
  if (!site || site.ownerId !== user.id) notFound();

  const [messages, restorableMessageIds] = await Promise.all([
    getChat(site.id),
    listRestorableMessages(site.id, 5),
  ]);

  return (
    <Editor
      siteId={site.id}
      initialSite={site.config}
      slug={site.slug}
      initialMessages={messages}
      restorableMessageIds={restorableMessageIds}
    />
  );
}
