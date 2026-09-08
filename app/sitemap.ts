import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/config";
import { catalogue } from "@/lib/catalogue";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes = [
    "",
    "/tyres",
    "/commercial",
    "/delivery",
    "/about",
    "/contact",
    "/privacy",
    "/terms",
  ].map((path) => ({
    url: `${siteUrl}${path}`,
    changeFrequency: "weekly" as const,
    priority: path === "" ? 1 : 0.7,
  }));

  const productRoutes = catalogue.map((tyre) => ({
    url: `${siteUrl}/tyres/${tyre.slug}`,
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  return [...staticRoutes, ...productRoutes];
}
