export const getUserAgentName = (userAgent = "") => {
  if (!userAgent) return "Unknown device";

  const ua = userAgent.toLowerCase();

  if (ua.includes("instagram")) {
    const version = userAgent.match(/Instagram ([\d.]+)/)?.[1];
    const android = userAgent.match(/Android (\d+(?:\.\d+)?)/)?.[1];
    const device = userAgent.match(/;\s*([^;]+);\s*[^;]+;\s*[^;]+;\s*[^;]+;\s*[^;]+;\s*[^;]+;\s*[^;]+;\s*[^;]+;\s*IABMV/i)?.[1];

    return `Instagram${version ? ` ${version}` : ""} · Android ${android || ""}${device ? ` · ${device}` : ""}`.trim();
  }

  if (ua.includes("android")) {
    const version = userAgent.match(/Android (\d+(?:\.\d+)?)/)?.[1];
    return `Android ${version || "device"}`;
  }

  if (ua.includes("iphone") || ua.includes("ipad")) {
    return "Safari · iOS";
  }

  if (ua.includes("windows")) return "Windows · Desktop";
  if (ua.includes("macintosh")) return "Mac · Desktop";

  return "Unknown browser";
};