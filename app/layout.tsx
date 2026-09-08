import type { Metadata, Viewport } from "next";
import { Barlow, Barlow_Condensed } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/lib/cart-context";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { MobileCartBar } from "@/components/MobileCartBar";
import { business, siteUrl } from "@/lib/config";
import { organizationJsonLd, websiteJsonLd } from "@/lib/seo";

const barlow = Barlow({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-barlow",
  display: "swap",
});

const barlowCondensed = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-barlow-condensed",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default:
      "Wholesale Tyres Adelaide | Bulk Tyres & Free Delivery | Adelaide Wholesale Tyres",
    template: "%s | Adelaide Wholesale Tyres",
  },
  description:
    "Buy wholesale truck and commercial tyres in Adelaide with no minimum order. $50 Adelaide-wide delivery under 8 tyres, free from 8 tyres up, from Regency Park.",
  applicationName: business.name,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: business.name,
    locale: "en_AU",
    url: siteUrl,
    title: "Wholesale Tyres Adelaide | Bulk Tyres & Free Delivery",
    description:
      "Bulk tyre supply for Adelaide workshops, fleets and transport operators. No minimum order, $50 Adelaide-wide delivery under 8 tyres, free for 8+.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Wholesale Tyres Adelaide | Adelaide Wholesale Tyres",
    description:
      "Bulk tyre supply for Adelaide workshops, fleets and transport operators. No minimum order, $50 Adelaide-wide delivery under 8 tyres, free for 8+.",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#063b2c",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-AU" className={`${barlow.variable} ${barlowCondensed.variable}`}>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd()) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd()) }}
        />
        <a href="#main" className="skip-link btn btn--dark sr-only focus:not-sr-only fixed left-4 top-2 z-[100]">
          Skip to content
        </a>
        <CartProvider>
          <Header />
          <main id="main">{children}</main>
          <Footer />
          <MobileCartBar />
        </CartProvider>
      </body>
    </html>
  );
}
