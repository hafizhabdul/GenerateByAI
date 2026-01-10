import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
    const baseUrl = "https://squirrai.cronicle.my.id";

    return {
        rules: {
            userAgent: "*",
            allow: "/",
            disallow: [
                "/api/",
                "/dashboard/",
                "/gallery/",
                "/settings/",
                "/profile/",
            ],
        },
        sitemap: `${baseUrl}/sitemap.xml`,
    };
}
