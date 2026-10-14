/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["sharp"],
  poweredByHeader: false,
  // Workspace packages ship as TypeScript source; let Next transpile them.
  transpilePackages: [
    "@glowroot/auth",
    "@glowroot/db",
    "@glowroot/ui",
    "@glowroot/types",
    "@glowroot/data",
    "@glowroot/utils",
  ],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
