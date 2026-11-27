/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    "@vendefacil/ai",
    "@vendefacil/business",
    "@vendefacil/config",
    "@vendefacil/database",
    "@vendefacil/media",
    "@vendefacil/types",
    "@vendefacil/ui-tokens",
    "@vendefacil/validation",
  ],
  serverExternalPackages: ["@prisma/client", "prisma", "sharp", "nodemailer"],
  poweredByHeader: false,
  async headers() {
    const security = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(self), microphone=(self), geolocation=()" },
    ];
    return [
      // Páginas públicas que a Meta abre na validação (privacidade / exclusão) — sem DENY no iframe
      {
        source: "/data-deletion",
        headers: [...security, { key: "Content-Security-Policy", value: "frame-ancestors *" }],
      },
      {
        source: "/exclusao-de-dados",
        headers: [...security, { key: "Content-Security-Policy", value: "frame-ancestors *" }],
      },
      {
        source: "/privacidade",
        headers: [...security, { key: "Content-Security-Policy", value: "frame-ancestors *" }],
      },
      {
        source: "/termos",
        headers: [...security, { key: "Content-Security-Policy", value: "frame-ancestors *" }],
      },
      {
        source: "/:path*",
        headers: [...security, { key: "X-Frame-Options", value: "DENY" }],
      },
    ];
  },
};

export default nextConfig;
