export const instant = false;
export const metadata = { title: "Conferma email", robots: { index: false, follow: false } };
import { ConfirmEmail } from "@/components/ConfirmEmail";

export default async function ConfirmEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return <ConfirmEmail token={typeof token === "string" ? token.slice(0, 200) : ""} />;
}
