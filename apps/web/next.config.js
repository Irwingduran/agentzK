/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@open402/agents'],
  serverExternalPackages: [
    '@coinbase/agentkit',
    '@privy-io/server-auth',
    '@hpke/chacha20poly1305',
  ],
};

export default nextConfig;
