import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Fotos ficam em public/ (mesmo domínio) e no Vercel Blob. Manter a
    // otimização ligada é o que gera o srcset — sem ela o celular baixa a
    // versão de 1000px para exibir num card de 180px.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.public.blob.vercel-storage.com",
      },
    ],
  },
};

export default nextConfig;
