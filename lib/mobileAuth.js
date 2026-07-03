import jwt from "jsonwebtoken";

export function verifyMobileToken(req) {
  try {
    const auth = req.headers.get("authorization");

    if (!auth) return null;

    const token = auth.replace("Bearer ", "");

    return jwt.verify(token, process.env.NEXTAUTH_SECRET);
  } catch {
    return null;
  }
}