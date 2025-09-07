import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 성능 최적화 설정
  experimental: {
    optimizePackageImports: ['@radix-ui', 'lucide-react'],
  },
  
  // 워크스페이스 루트 설정 (경고 해결)
  outputFileTracingRoot: process.cwd(),
  
  // 이미지 최적화
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  
  // 개발 환경 최적화
  ...(process.env.NODE_ENV === 'development' && {
    webpack: (config: any) => {
      // 개발 환경에서 빌드 속도 향상
      config.optimization.minimize = false;
      return config;
    },
  }),
};

export default nextConfig;
