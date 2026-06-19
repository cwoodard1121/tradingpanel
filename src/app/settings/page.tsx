"use client";

import { useEffect, useState } from "react";

import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { AccountGroup } from "@/components/settings/AccountGroup";
import { DataBackupCard } from "@/components/settings/DataBackupCard";
import { FeesGroup } from "@/components/settings/FeesGroup";
import { PropFirmGroup } from "@/components/settings/PropFirmGroup";
import { RiskGroup } from "@/components/settings/RiskGroup";
import { SavingsGroup } from "@/components/settings/SavingsGroup";
import { useData } from "@/components/providers/DataProvider";

function GroupSkeleton() {
  return (
    <Card>
      <Skeleton className="h-4 w-32" />
      <Skeleton className="mt-2 h-3 w-48" />
      <Skeleton className="mt-5 h-10 w-full" />
      <Skeleton className="mt-3 h-10 w-2/3" />
      <Skeleton className="mt-5 h-8 w-28" />
    </Card>
  );
}

export default function SettingsPage() {
  const { settings, updateSettings, backend, initializing } = useData();

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const ready = mounted && !initializing;

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-brand">
          Configuration
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-content-primary sm:text-3xl">
          Settings
        </h1>
        <p className="max-w-2xl text-sm text-content-secondary">
          Defaults for the calculator, the rules your analytics measure against,
          and how your data is stored. Changes save per section.
        </p>
      </header>

      {!ready ? (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <GroupSkeleton />
          <GroupSkeleton />
          <GroupSkeleton />
          <GroupSkeleton />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <AccountGroup settings={settings} updateSettings={updateSettings} />
          <RiskGroup settings={settings} updateSettings={updateSettings} />
          <FeesGroup settings={settings} updateSettings={updateSettings} />
          <PropFirmGroup settings={settings} updateSettings={updateSettings} />
          <SavingsGroup settings={settings} updateSettings={updateSettings} />
          <DataBackupCard backend={backend} />
        </div>
      )}
    </div>
  );
}
