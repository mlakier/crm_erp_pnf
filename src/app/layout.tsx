import type { Metadata } from "next";
import "./globals.css";
import AppShell from "@/components/AppShell";
import { SeededDimensionLabelsProvider } from "@/components/SeededDimensionLabelsProvider";
import { loadCompanyPreferencesSettings } from "@/lib/company-preferences-store";
import { loadCompanyPageLogo } from "@/lib/company-page-logo";
import { loadSeededDimensionDisplayLabels } from "@/lib/seeded-dimension-labels";

export const metadata: Metadata = {
  title: "CRM/ERP System",
  description: "Custom CRM, ERP, and Planning Platform",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [companyPreferences, companyPageLogo, seededDimensionLabels] = await Promise.all([
    loadCompanyPreferencesSettings(),
    loadCompanyPageLogo(),
    loadSeededDimensionDisplayLabels(),
  ])

  return (
    <html
      lang="en"
      className="h-full antialiased"
      data-company-money-settings={encodeURIComponent(JSON.stringify(companyPreferences.moneySettings))}
    >
      <body className="min-h-full flex flex-col">
        <SeededDimensionLabelsProvider labels={seededDimensionLabels}>
          <AppShell companyLogoUrl={companyPageLogo?.url ?? null}>{children}</AppShell>
        </SeededDimensionLabelsProvider>
      </body>
    </html>
  );
}
