import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/privacidade", "/termos", "/data-deletion", "/exclusao-de-dados"],
    },
  };
}
