/** @type {import('next').NextConfig} */
const nextConfig = {
  // Docker image uses standalone. Vercel uses its own bundler — skip standalone there.
  ...(process.env.VERCEL ? {} : { output: "standalone" }),
};

export default nextConfig;
