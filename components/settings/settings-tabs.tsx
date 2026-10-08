"use client";

import { useCallback, useMemo, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabPanel } from "@/components/ui/tabs";

export const SETTINGS_TABS = [
  { id: "entreprise", label: "Entreprise" },
  { id: "banque", label: "Banque" },
  { id: "legal", label: "Légal" },
  { id: "fiscal", label: "Fiscal" },
] as const;

export type SettingsTabId = (typeof SETTINGS_TABS)[number]["id"];

interface SettingsTabsProps {
  defaultTab?: string;
  entreprise: ReactNode;
  banque: ReactNode;
  legal: ReactNode;
  fiscal: ReactNode;
}

function isValidTab(tab: string | null): tab is SettingsTabId {
  return SETTINGS_TABS.some((t) => t.id === tab);
}

export default function SettingsTabs({
  defaultTab,
  entreprise,
  banque,
  legal,
  fiscal,
}: SettingsTabsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const activeTab = useMemo(() => {
    const fromUrl = searchParams.get("tab");
    if (isValidTab(fromUrl)) return fromUrl;
    if (defaultTab && isValidTab(defaultTab)) return defaultTab;
    return "entreprise";
  }, [searchParams, defaultTab]);

  const handleChange = useCallback(
    (tabId: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (tabId === "entreprise") {
        params.delete("tab");
      } else {
        params.set("tab", tabId);
      }
      params.delete("status");
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    },
    [router, pathname, searchParams]
  );

  return (
    <div className="space-y-6">
      <Tabs tabs={[...SETTINGS_TABS]} activeTab={activeTab} onChange={handleChange} />

      <TabPanel id="entreprise" activeTab={activeTab}>
        {entreprise}
      </TabPanel>
      <TabPanel id="banque" activeTab={activeTab}>
        {banque}
      </TabPanel>
      <TabPanel id="legal" activeTab={activeTab}>
        {legal}
      </TabPanel>
      <TabPanel id="fiscal" activeTab={activeTab}>
        {fiscal}
      </TabPanel>
    </div>
  );
}
