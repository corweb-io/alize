"use client";

import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { businessPath } from "@/lib/business-path";
import { LEGAL_FORMS } from "@/lib/finance/legal-forms";
import type { LegalForm } from "@/lib/types/database";

const navigation = [
  { name: "Tableau de bord", href: "/dashboard", icon: "📊" },
  { name: "Factures", href: "/invoices", icon: "📄" },
  { name: "Devis", href: "/quotes", icon: "📝" },
  { name: "Clients", href: "/clients", icon: "👥" },
  { name: "Cotisations", href: "/cotisations", icon: "🏦" },
  { name: "Paramètres", href: "/settings", icon: "⚙️" },
];

function isNavItemActive(pathname: string, href: string) {
  if (pathname === href) return true;
  if (href === "/dashboard" || !pathname.startsWith(`${href}/`)) return false;

  // Don't highlight a parent route when a more specific nav item matches.
  return !navigation.some(
    (item) =>
      item.href !== href &&
      item.href.startsWith(`${href}/`) &&
      (pathname === item.href || pathname.startsWith(`${item.href}/`))
  );
}

export interface SidebarBusiness {
  id: string;
  name: string;
  legalForm?: LegalForm;
}

interface SidebarProps {
  businesses: SidebarBusiness[];
  /** Business used for links on pages outside /b/[businessId]. */
  fallbackBusinessId: string;
}

const NEW_BUSINESS_VALUE = "__new__";

export default function Sidebar({
  businesses,
  fallbackBusinessId,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const params = useParams<{ businessId?: string }>();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const businessId = params.businessId ?? fallbackBusinessId;
  const activeBusiness =
    businesses.find((b) => b.id === businessId) ?? businesses[0];
  const basePath = businessPath(businessId, "");
  // Nav matching works on the path relative to the business.
  const sectionPath = pathname.startsWith(`${basePath}/`)
    ? pathname.slice(basePath.length)
    : pathname;

  const switchBusiness = (value: string) => {
    if (value === NEW_BUSINESS_VALUE) {
      router.push("/onboarding");
      return;
    }
    // Ids of the current page (invoice, client…) don't exist in the other
    // business, so land on the same section's root.
    const section =
      navigation.find((item) => isNavItemActive(sectionPath, item.href))
        ?.href ?? "/dashboard";
    setMobileMenuOpen(false);
    router.push(businessPath(value, section));
  };

  return (
    <>
      <button
        className="fixed left-4 top-4 z-50 rounded-lg border border-teal-900/10 bg-white/90 p-2 shadow-sm backdrop-blur-sm dark:border-teal-500/20 dark:bg-stone-900/90 lg:hidden"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        aria-label={mobileMenuOpen ? "Fermer le menu" : "Ouvrir le menu"}
      >
        <svg
          className="h-6 w-6 text-teal-900 dark:text-teal-200"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          {mobileMenuOpen ? (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          ) : (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          )}
        </svg>
      </button>

      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 transform border-r border-teal-900/8 bg-white/85 backdrop-blur-md transition-transform duration-200 ease-in-out dark:border-teal-500/10 dark:bg-stone-950/90 lg:static ${
          mobileMenuOpen
            ? "translate-x-0"
            : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="hidden border-b border-teal-900/8 px-5 py-5 dark:border-teal-500/10 lg:block">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-teal-700 to-teal-900 text-sm font-semibold text-white shadow-sm">
              A
            </div>
            <div>
              <p className="text-sm font-semibold leading-tight text-[#1a454f] dark:text-teal-50">
                Alizé
              </p>
              <p className="text-[10px] text-teal-800/70 dark:text-teal-400/80">
                Facturation · Saint-Barth
              </p>
            </div>
          </div>
        </div>

        <div className="mt-16 border-b border-teal-900/8 px-3 pb-3 dark:border-teal-500/10 lg:mt-0 lg:px-4 lg:pt-4">
          <label
            htmlFor="business-switcher"
            className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-stone-500 dark:text-stone-400"
          >
            Entreprise
          </label>
          <select
            id="business-switcher"
            value={activeBusiness.id}
            onChange={(e) => switchBusiness(e.target.value)}
            className="w-full truncate rounded-lg border border-teal-900/10 bg-white px-3 py-2 text-sm font-medium text-[#1a454f] shadow-sm focus:border-teal-600 focus:ring-teal-600 dark:border-teal-500/20 dark:bg-stone-900 dark:text-teal-50"
          >
            {businesses.map((business) => (
              <option key={business.id} value={business.id}>
                {business.name}
              </option>
            ))}
            <option value={NEW_BUSINESS_VALUE}>+ Nouvelle entreprise</option>
          </select>
          {activeBusiness.legalForm && (
            <p className="mt-1 text-[11px] text-teal-800/70 dark:text-teal-400/80">
              {LEGAL_FORMS[activeBusiness.legalForm].label}
            </p>
          )}
        </div>

        <nav className="space-y-1 p-3 lg:p-4">
          {navigation.map((item) => {
            const isActive = isNavItemActive(sectionPath, item.href);
            return (
              <Link
                key={item.name}
                href={businessPath(businessId, item.href)}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-teal-800 text-white shadow-sm shadow-teal-900/20 dark:bg-teal-700"
                    : "text-stone-600 hover:bg-teal-50/80 hover:text-teal-900 dark:text-stone-400 dark:hover:bg-stone-800/60 dark:hover:text-teal-100"
                }`}
              >
                <span className="text-base">{item.icon}</span>
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-30 bg-stone-900/40 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
    </>
  );
}
