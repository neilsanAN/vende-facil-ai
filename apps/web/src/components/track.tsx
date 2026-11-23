"use client";

import { useEffect } from "react";

export function Track({ slug, type, productSlug }: { slug: string; type: "store_view" | "product_view"; productSlug?: string }) {
  useEffect(() => {
    void fetch(`/api/public/${slug}/events`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ type, slug, productSlug }) });
  }, [slug, type, productSlug]);
  return null;
}
