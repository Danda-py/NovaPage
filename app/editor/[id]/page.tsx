export const instant = false;
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { getChat, getSite } from "@/lib/store";
import { getCurrentUser } from "@/lib/auth";
import { Editor } from "@/components/Editor";

export default async function EditorPage({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const site = await getSite(id);
  if (!site || site.ownerId !== user.id) notFound();

  const messages = await getChat(site.id);

  return (
    <Editor
      siteId={site.id}
      initialSite={site.config}
      slug={site.slug}
      initialMessages={messages}
    />
  );
}
