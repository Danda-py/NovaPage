export const metadata = {
  title: "Recupera la password",
  robots: { index: false, follow: false },
};

/** Layout necessario perché la pagina di recupero è un client component. */
export default function ForgotLayout({ children }: { children: React.ReactNode }) {
  return children;
}
