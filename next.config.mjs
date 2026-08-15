/** @type {import('next').NextConfig} */
const nextConfig = {
  // Docker image uses standalone. Vercel uses its own bundler — skip standalone there.
  ...(process.env.VERCEL ? {} : { output: "standalone" }),
  experimental: {
    optimizePackageImports: ["d3", "lucide-react"],
  },
  compress: true,
};

export default nextConfig;
