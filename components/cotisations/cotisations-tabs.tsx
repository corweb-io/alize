"use client";

import { useCallback, useMemo, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabPanel } from "@/components/ui/tabs";

export const COTISATIONS_TABS = [
  { id: "overview", label: "Vue d'ensemble" },
  { id: "cps", label: "Déclaration CPS" },
  { id: "obligations", label: "Obligations" },
] as const;

export type CotisationsTabId = (typeof COTISATIONS_TABS)[number]["id"];

interface CotisationsTabsProps {
  defaultTab?: string;
  overview: ReactNode;
  cps: ReactNode;
  obligations: ReactNode;
  cpsBadge?: ReactNode;
  obligationsBadge?: ReactNode;
}

function isValidTab(tab: string | null): tab is CotisationsTabId {
  return COTISATIONS_TABS.some((t) => t.id === tab);
}

export default function CotisationsTabs({
  defaultTab,
  overview,
  cps,
  obligations,
  cpsBadge,
  obligationsBadge,
}: CotisationsTabsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const activeTab = useMemo(() => {
    const fromUrl = searchParams.get("tab");
    if (isValidTab(fromUrl)) return fromUrl;
    if (defaultTab && isValidTab(defaultTab)) return defaultTab;
    return "overview";
  }, [searchParams, defaultTab]);

  const handleChange = useCallback(
    (tabId: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (tabId === "overview") {
        params.delete("tab");
      } else {
        params.set("tab", tabId);
      }
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    },
    [router, pathname, searchParams]
  );

  const tabs = COTISATIONS_TABS.map((tab) => ({
    ...tab,
    badge:
      tab.id === "cps"
        ? cpsBadge
        : tab.id === "obligations"
          ? obligationsBadge
          : undefined,
  }));

  return (
    <div className="space-y-6">
      <Tabs tabs={tabs} activeTab={activeTab} onChange={handleChange} />

      <TabPanel id="overview" activeTab={activeTab}>
        {overview}
      </TabPanel>
      <TabPanel id="cps" activeTab={activeTab}>
        {cps}
      </TabPanel>
      <TabPanel id="obligations" activeTab={activeTab}>
        {obligations}
      </TabPanel>
    </div>
  );
}
