// next.config.js
const nextConfig = {
  allowedDevOrigins: [
    "22f5-2405-201-5c05-9072-8cac-17ee-5b54-5fc6.ngrok-free.app", // Removed "https://"
  ],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "openshift.grras.com",
      },
    ],
  },
};

export default nextConfig;