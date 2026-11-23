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
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(self), microphone=(self), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
