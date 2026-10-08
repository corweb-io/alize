"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { LEGAL_FORMS } from "@/lib/finance/legal-forms";
import type { LegalForm } from "@/lib/types/database";

export interface SwitcherBusiness {
  id: string;
  name: string;
  legalForm?: LegalForm;
}

interface BusinessSwitcherProps {
  businesses: SwitcherBusiness[];
  activeBusinessId: string;
  /** Navigates to the given business; wrapped in a transition for feedback. */
  onSelect: (businessId: string) => void;
  settingsHref: string;
  onNavigate?: () => void;
}

// Brand-toned badge colors, picked deterministically per business.
const BADGE_COLORS = [
  "from-teal-700 to-teal-900",
  "from-[#d4846a] to-[#a85d45]",
  "from-sky-700 to-sky-900",
  "from-amber-600 to-amber-800",
  "from-emerald-700 to-emerald-900",
  "from-indigo-600 to-indigo-800",
];

function badgeColor(id: string) {
  let hash = 0;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  return BADGE_COLORS[Math.abs(hash) % BADGE_COLORS.length];
}

function initials(name: string) {
  const words = name
    .replace(/[—–-]/g, " ")
    .split(/\s+/)
    .filter((word) => /^[\p{L}\p{N}]/u.test(word));
  const letters = words.length > 1 ? [words[0], words[1]] : [name];
  return letters
    .map((word) => word.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function BusinessBadge({
  business,
  size = "md",
}: {
  business: SwitcherBusiness;
  size?: "sm" | "md";
}) {
  return (
    <span
      aria-hidden
      className={`flex shrink-0 items-center justify-center rounded-lg bg-gradient-to-br font-semibold text-white shadow-sm ${badgeColor(
        business.id
      )} ${size === "md" ? "h-9 w-9 text-xs" : "h-7 w-7 text-[10px]"}`}
    >
      {initials(business.name)}
    </span>
  );
}

function legalFormLabel(business: SwitcherBusiness) {
  return business.legalForm ? LEGAL_FORMS[business.legalForm].label : null;
}

const itemClass =
  "flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-sm outline-none transition-colors hover:bg-teal-50 focus-visible:bg-teal-50 dark:hover:bg-stone-800 dark:focus-visible:bg-stone-800";

export default function BusinessSwitcher({
  businesses,
  activeBusinessId,
  onSelect,
  settingsHref,
  onNavigate,
}: BusinessSwitcherProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const activeBusiness =
    businesses.find((b) => b.id === activeBusinessId) ?? businesses[0];

  const menuItems = () =>
    Array.from(
      menuRef.current?.querySelectorAll<HTMLElement>("[role^='menuitem']") ??
        []
    );

  const close = (restoreFocus = true) => {
    setOpen(false);
    if (restoreFocus) triggerRef.current?.focus();
  };

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  // Focus the active business when the menu opens.
  useEffect(() => {
    if (!open) return;
    const items = menuItems();
    const checked = items.find(
      (item) => item.getAttribute("aria-checked") === "true"
    );
    (checked ?? items[0])?.focus();
  }, [open]);

  const handleMenuKeyDown = (event: React.KeyboardEvent) => {
    const items = menuItems();
    const index = items.indexOf(document.activeElement as HTMLElement);
    const focusAt = (i: number) =>
      items[(i + items.length) % items.length]?.focus();

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        focusAt(index + 1);
        break;
      case "ArrowUp":
        event.preventDefault();
        focusAt(index - 1);
        break;
      case "Home":
        event.preventDefault();
        focusAt(0);
        break;
      case "End":
        event.preventDefault();
        focusAt(items.length - 1);
        break;
      case "Escape":
        event.preventDefault();
        close();
        break;
      case "Tab":
        setOpen(false);
        break;
    }
  };

  const selectBusiness = (businessId: string) => {
    close();
    if (businessId === activeBusiness.id) return;
    onNavigate?.();
    startTransition(() => onSelect(businessId));
  };

  const activeLegalForm = legalFormLabel(activeBusiness);

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={`Entreprise active : ${activeBusiness.name}. Changer d'entreprise`}
        onClick={() => setOpen((value) => !value)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            setOpen(true);
          }
        }}
        className={`flex w-full items-center gap-2.5 rounded-xl border px-2.5 py-2 text-left shadow-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 ${
          open
            ? "border-teal-700/30 bg-teal-50/80 dark:border-teal-500/30 dark:bg-stone-800"
            : "border-teal-900/10 bg-white hover:border-teal-700/25 hover:bg-teal-50/50 dark:border-teal-500/15 dark:bg-stone-900 dark:hover:bg-stone-800/70"
        }`}
      >
        <BusinessBadge business={activeBusiness} />
        <span className="min-w-0 flex-1">
          <span
            title={activeBusiness.name}
            className="block truncate text-sm font-semibold text-[#1a454f] dark:text-teal-50"
          >
            {activeBusiness.name}
          </span>
          {activeLegalForm && (
            <span className="block truncate text-[11px] text-teal-800/70 dark:text-teal-400/80">
              {activeLegalForm}
            </span>
          )}
        </span>
        {isPending ? (
          <svg
            aria-label="Chargement"
            className="h-4 w-4 shrink-0 animate-spin text-teal-700 dark:text-teal-400"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
            />
          </svg>
        ) : (
          <svg
            aria-hidden
            className="h-4 w-4 shrink-0 text-stone-400"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M10 3a.75.75 0 01.55.24l3.25 3.5a.75.75 0 11-1.1 1.02L10 4.852 7.3 7.76a.75.75 0 01-1.1-1.02l3.25-3.5A.75.75 0 0110 3zm-3.76 9.2a.75.75 0 011.06.04l2.7 2.908 2.7-2.908a.75.75 0 111.1 1.02l-3.25 3.5a.75.75 0 01-1.1 0l-3.25-3.5a.75.75 0 01.04-1.06z"
              clipRule="evenodd"
            />
          </svg>
        )}
      </button>

      {open && (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label="Changer d'entreprise"
          onKeyDown={handleMenuKeyDown}
          className="absolute inset-x-0 top-full z-50 mt-1.5 overflow-hidden rounded-xl border border-teal-900/10 bg-white p-1.5 shadow-xl shadow-teal-900/10 ring-1 ring-teal-900/5 dark:border-teal-500/15 dark:bg-stone-900 dark:ring-teal-500/10"
        >
          <p className="px-2 pb-1 pt-1.5 text-[10px] font-medium uppercase tracking-wide text-stone-500 dark:text-stone-400">
            Vos entreprises
          </p>
          <div className="max-h-72 overflow-y-auto">
            {businesses.map((business) => {
              const isActive = business.id === activeBusiness.id;
              const legalForm = legalFormLabel(business);
              return (
                <button
                  key={business.id}
                  type="button"
                  role="menuitemradio"
                  aria-checked={isActive}
                  tabIndex={-1}
                  onClick={() => selectBusiness(business.id)}
                  className={itemClass}
                >
                  <BusinessBadge business={business} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span
                      title={business.name}
                      className={`block truncate ${
                        isActive
                          ? "font-semibold text-[#1a454f] dark:text-teal-50"
                          : "text-stone-700 dark:text-stone-200"
                      }`}
                    >
                      {business.name}
                    </span>
                    {legalForm && (
                      <span className="block truncate text-[11px] text-stone-500 dark:text-stone-400">
                        {legalForm}
                      </span>
                    )}
                  </span>
                  {isActive && (
                    <svg
                      aria-hidden
                      className="h-4 w-4 shrink-0 text-teal-700 dark:text-teal-400"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>

          <div className="my-1.5 border-t border-teal-900/8 dark:border-teal-500/10" />

          <Link
            href="/onboarding"
            role="menuitem"
            tabIndex={-1}
            onClick={() => {
              close(false);
              onNavigate?.();
            }}
            className={`${itemClass} text-stone-700 dark:text-stone-200`}
          >
            <span
              aria-hidden
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-dashed border-teal-700/40 text-teal-700 dark:border-teal-400/40 dark:text-teal-400"
            >
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
              </svg>
            </span>
            Nouvelle entreprise
          </Link>
          <Link
            href={settingsHref}
            role="menuitem"
            tabIndex={-1}
            onClick={() => {
              close(false);
              onNavigate?.();
            }}
            className={`${itemClass} text-stone-700 dark:text-stone-200`}
          >
            <span
              aria-hidden
              className="flex h-7 w-7 shrink-0 items-center justify-center text-stone-500 dark:text-stone-400"
            >
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M7.84 1.804A1 1 0 018.82 1h2.36a1 1 0 01.98.804l.331 1.652a6.993 6.993 0 011.929 1.115l1.598-.54a1 1 0 011.186.447l1.18 2.044a1 1 0 01-.205 1.251l-1.267 1.113a7.047 7.047 0 010 2.228l1.267 1.113a1 1 0 01.206 1.25l-1.18 2.045a1 1 0 01-1.187.447l-1.598-.54a6.993 6.993 0 01-1.929 1.115l-.33 1.652a1 1 0 01-.98.804H8.82a1 1 0 01-.98-.804l-.331-1.652a6.993 6.993 0 01-1.929-1.115l-1.598.54a1 1 0 01-1.186-.447l-1.18-2.044a1 1 0 01.205-1.251l1.267-1.114a7.05 7.05 0 010-2.227L1.821 7.773a1 1 0 01-.206-1.25l1.18-2.045a1 1 0 011.187-.447l1.598.54A6.993 6.993 0 017.51 3.456l.33-1.652zM10 13a3 3 0 100-6 3 3 0 000 6z"
                  clipRule="evenodd"
                />
              </svg>
            </span>
            Paramètres
          </Link>
        </div>
      )}
    </div>
  );
}
