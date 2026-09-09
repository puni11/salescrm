import jwt from "jsonwebtoken";
import clientPromise from "@/lib/mongodb";

export async function getUserFromToken(req) {
  try {
    const authHeader = req.headers.get("authorization");

    if (!authHeader) {
      return {
        success: false,
        status: 401,
        message: "Authorization token is required",
      };
    }

    if (!authHeader.startsWith("Bearer ")) {
      return {
        success: false,
        status: 401,
        message: "Invalid authorization format",
      };
    }

    const token = authHeader.substring(7);

    if (!token) {
      return {
        success: false,
        status: 401,
        message: "Token is required",
      };
    }

    // Verify JWT
    const decoded = jwt.verify(
      token,
      process.env.NEXTAUTH_SECRET
    );

    /*
      Depending on your NextAuth JWT,
      the user ID may be stored as:
      
      decoded.id
      decoded.sub
      decoded.userId
    */

    const userId =
      decoded.id ||
      decoded.userId ||
      decoded.sub;

    if (!userId) {
      return {
        success: false,
        status: 401,
        message: "User ID not found in token",
      };
    }

    const client = await clientPromise;
    const db = client.db("internal");

    let user = null;

    // If Mongo ObjectId
    if (/^[a-f\d]{24}$/i.test(userId)) {
      user = await db.collection("users").findOne({
        _id: new (await import("mongodb")).ObjectId(userId),
      });
    }

    // If your users collection stores ID as string
    if (!user) {
      user = await db.collection("users").findOne({
        id: userId,
      });
    }

    if (!user) {
      return {
        success: false,
        status: 401,
        message: "User not found",
      };
    }

    return {
      success: true,
      user,
      token: decoded,
    };

  } catch (error) {
    console.error("TOKEN AUTH ERROR:", error);

    if (
      error.name === "TokenExpiredError"
    ) {
      return {
        success: false,
        status: 401,
        message: "Token expired",
      };
    }

    if (
      error.name === "JsonWebTokenError"
    ) {
      return {
        success: false,
        status: 401,
        message: "Invalid token",
      };
    }

    return {
      success: false,
      status: 500,
      message: "Authentication failed",
    };
  }
}