import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import clientPromise from "@/lib/mongodb";
import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";
import { randomUUID } from "crypto";

export const authOptions = {
  session: {
  strategy: "jwt",
  maxAge: 60 * 60 * 24 * 30, // 30 days
  updateAge: 60 * 60 * 24,   // refresh daily
},

jwt: {
  maxAge: 60 * 60 * 24 * 30,
},

  providers: [
    CredentialsProvider({
      name: "Email Login",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },

      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const client = await clientPromise;
        const db = client.db("internal");

        const user = await db.collection("users").findOne({
          email: credentials.email,
        });

        if (!user) return null;

        const isValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isValid) return null;
        if (user.isBlocked) return null;

        // Update last login
        await db.collection("users").updateOne(
          { _id: user._id },
          { $set: { lastLogin: new Date() } }
        );

        // Capture device fingerprint
        const ip =
          req.headers["x-forwarded-for"] ||
          req.headers["x-real-ip"] ||
          "unknown";

        const userAgent = req.headers["user-agent"] || "unknown";

        return {
          id: user._id.toString(),
          name: user.name,
          role: user.role,
          ipAddress: ip,
          userAgent: userAgent,
        };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      const client = await clientPromise;
      const db = client.db("internal");

      // 🔥 On Login
      if (user) {
        token.id = user.id;
        token.name = user.name;
        token.role = user.role;
        token.sessionId = randomUUID();

        // 🔥 Get active sessions
        const activeSessions = await db.collection("adminSessions2")
          .find({ userId: new ObjectId(user.id), isActive: true })
          .sort({ createdAt: 1 })
          .toArray();

        // 🔥 Limit max 2 devices
        if (activeSessions.length >= 2) {
          const oldestSession = activeSessions[0];

          await db.collection("adminSessions2").updateOne(
            { _id: oldestSession._id },
            { $set: { isActive: false } }
          );
        }

        // 🔥 Insert new session
        await db.collection("adminSessions2").insertOne({
          userId: new ObjectId(user.id),
          sessionId: token.sessionId,
          ipAddress: user.ipAddress,
          userAgent: user.userAgent,
          createdAt: new Date(),
          lastActivity: new Date(),
          expiresAt: new Date(Date.now() + 30 * 60 * 1000),
          isActive: true,
        });
      }

      // 🔥 Update activity (no invalidation here to keep stable)
      if (token?.sessionId) {
        await db.collection("adminSessions2").updateOne(
          { sessionId: token.sessionId },
          { $set: { lastActivity: new Date() } }
        );
      }

      return token;
    },

    async session({ session, token }) {
      if (!token?.id) return null;

      session.user = {
        id: token.id,
        name: token.name,
        role: token.role,
      };

      return session;
    },
  },

  pages: {
    signIn: "/login",
  },

  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };