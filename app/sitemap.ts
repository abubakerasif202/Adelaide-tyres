import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/config";
import { catalogue } from "@/lib/catalogue";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
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
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: path === "" ? 1 : 0.7,
  }));

  const productRoutes = catalogue.map((tyre) => ({
    url: `${siteUrl}/tyres/${tyre.slug}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  return [...staticRoutes, ...productRoutes];
}
