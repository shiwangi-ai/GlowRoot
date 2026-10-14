import type { Metadata } from "next";
import "./globals.css";
import { AdminFrame } from "@/components/AdminFrame";
import { getAdminIdentity, canViewCustomers } from "@/lib/access";

export const metadata: Metadata = {
  title: "GlowRoot Admin",
  description: "Internal panel — orders, products and materials.",
  icons: { icon: "/assets/glowroot-logo-trim.png" },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Resolved once per request and handed down, so the nav can hide what the
  // signed-in user cannot reach. Hiding is courtesy; the pages still enforce.
  const identity = await getAdminIdentity();

  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin=""
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,600;12..96,700;12..96,800&family=Hanken+Grotesque:wght@400;500;600;700&family=Caveat:wght@600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <AdminFrame
          identity={
            identity && {
              canViewCustomers: canViewCustomers(identity),
              name: identity.name,
              email: identity.email,
              roleNames: identity.roleNames,
              permissions: [...identity.permissions],
              mfaOutstanding: identity.mfaOutstanding,
            }
          }
        >
          {children}
        </AdminFrame>
      </body>
    </html>
  );
}
