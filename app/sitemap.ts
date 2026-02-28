import type { MetadataRoute } from "next";
import seo from "@/data/seo.en.json";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  const slugs = Object.keys(seo as Record<string, any>);

  const urls: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/en`, lastModified: new Date() },
    { url: `${baseUrl}/tool`, lastModified: new Date() },
  ];

  for (const slug of slugs) {
    urls.push({
      url: `${baseUrl}/en/${slug}`,
      lastModified: new Date(),
    });
  }

  return urls;
}
