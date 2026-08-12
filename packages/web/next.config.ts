import type { NextConfig } from "next";

const backendUrl = process.env.BACKEND_URL ?? "http://localhost:4000";

const nextConfig: NextConfig = {
  // 프론트는 상대경로 /api/*로 호출(9장 API 계약), Next가 실제 백엔드(NestJS, packages/server)로 프록시한다.
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${backendUrl}/:path*` }];
  },
};

export default nextConfig;
