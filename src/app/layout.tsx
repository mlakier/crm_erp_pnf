import type { Metadata } from "next";
import "./globals.css";
import SessionProvider from "@/components/SessionProvider";
import AppShell from "@/components/AppShell";
import { loadCompanyPreferencesSettings } from "@/lib/company-preferences-store";

export const metadata: Metadata = {
  title: "CRM/ERP System",
  description: "Custom CRM, ERP, and Planning Platform",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const companyPreferences = await loadCompanyPreferencesSettings()

  return (
    <html
      lang="en"
      className="h-full antialiased"
      data-company-money-settings={encodeURIComponent(JSON.stringify(companyPreferences.moneySettings))}
    >
      <body className="min-h-full flex flex-col">
        <SessionProvider>
          <AppShell>{children}</AppShell>
        </SessionProvider>
      </body>
    </html>
  );
}
