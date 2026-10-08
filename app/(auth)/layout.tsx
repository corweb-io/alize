import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Connexion",
  description:
    "Facturation, suivi du chiffre d'affaires, cotisations CPS et obligations territoriales pour les entrepreneurs de Saint-Barthélemy.",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="h-dvh overflow-hidden">{children}</div>;
}
