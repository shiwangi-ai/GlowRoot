import type { Metadata } from "next";
import { cookies } from "next/headers";
import "./globals.css";
import { getServiceConfig, getProducts, getProduce } from "@glowroot/data";
import { resolveSeasonalProduct } from "@glowroot/data/seasonal";
import { getSessionUser } from "@/lib/session";
import { AuthProvider } from "@/components/AuthProvider";
import { StoreProvider } from "@/components/StoreProvider";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { CartIsland } from "@/components/CartIsland";
import { SoftServiceBanner } from "@/components/SoftServiceBanner";
import { ThemeProvider } from "@/components/ThemeProvider";
import { parseTheme, THEME_COOKIE } from "@/lib/theme";

export const metadata: Metadata = {
  title: "GlowRoot — Cold-pressed, farm-fresh juices",
  description:
    "Cold-pressed juices from whole, seasonal fruit and vegetables — picked that morning, never heated, never from concentrate.",
  icons: { icon: "/assets/glowroot-logo-trim.png" },
};

/**
 * Reading the session cookie here opts every route out of static generation.
 * That's an accepted trade for a store with a cart and a checkout: the payoff is
 * that the header renders the right account state in the *first* HTML byte, so
 * there's no logged-out flash and no client-side hydration guard anywhere.
 */
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [session, service, products, produce] = await Promise.all([
    getSessionUser(),
    getServiceConfig(),
    getProducts(),
    getProduce(),
  ]);
  const initialTheme = parseTheme((await cookies()).get(THEME_COOKIE)?.value);

  return (
    <html lang="en" data-theme={initialTheme}>
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
        <ThemeProvider initialTheme={initialTheme}>
          <AuthProvider initialCustomer={session}>
            <StoreProvider
              service={service}
              catalogue={[
                ...products,
                ...produce.map((item) =>
                  resolveSeasonalProduct(item, products),
                ),
              ]}
            >
              <SiteHeader />
              <SoftServiceBanner />
              <main id="top">{children}</main>
              <SiteFooter />
              <CartIsland />
            </StoreProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
