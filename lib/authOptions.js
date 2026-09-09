import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import clientPromise from "@/lib/mongodb";
import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";
import { randomUUID } from "crypto";

export const authOptions = {
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24 * 30, // JWT = 30 days
    updateAge: 60 * 60 * 24,   // Update daily
  },

  jwt: {
    maxAge: 60 * 60 * 24 * 30,
  },

  providers: [
    CredentialsProvider({
      name: "Email Login",

      credentials: {
        email: {
          label: "Email",
          type: "text",
        },
        password: {
          label: "Password",
          type: "password",
        },
      },

      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          const client = await clientPromise;
          const db = client.db("internal");

          const user = await db.collection("users").findOne({
            email: credentials.email,
          });

          if (!user) {
            return null;
          }

          const isValid = await bcrypt.compare(
            credentials.password,
            user.password
          );

          if (!isValid) {
            return null;
          }

          if (user.isBlocked) {
            return null;
          }

          // =========================
          // UPDATE LAST LOGIN
          // =========================

          await db.collection("users").updateOne(
            { _id: user._id },
            {
              $set: {
                lastLogin: new Date(),
              },
            }
          );

          // =========================
          // DEVICE INFORMATION
          // =========================

          const ip =
            req?.headers?.["x-forwarded-for"] ||
            req?.headers?.["x-real-ip"] ||
            "unknown";

          const userAgent =
            req?.headers?.["user-agent"] ||
            "unknown";

          return {
            id: user._id.toString(),
            name: user.name,
            role: user.role,
            ipAddress: ip,
            userAgent,
          };
        } catch (error) {
          console.error("AUTHORIZE ERROR:", error);

          return null;
        }
      },
    }),
  ],

  callbacks: {
    // =========================================================
    // JWT
    // =========================================================

    async jwt({ token, user }) {

      // =======================================================
      // INITIAL LOGIN
      // =======================================================

      if (user) {
        token.id = user.id;
        token.name = user.name;
        token.role = user.role;

        token.sessionId = randomUUID();

        // Used only to throttle DB activity updates
        token.lastDbUpdate = Date.now();

        // =====================================================
        // CREATE DATABASE SESSION
        // =====================================================

        try {
          const client = await clientPromise;
          const db = client.db("internal");

          // Make sure user ID is valid
          if (!ObjectId.isValid(user.id)) {
            console.error(
              "Invalid user ID:",
              user.id
            );

            return token;
          }

          // ===================================================
          // GET ACTIVE SESSIONS
          // ===================================================

          const activeSessions =
            await db
              .collection("adminSessions2")
              .find({
                userId: new ObjectId(user.id),
                isActive: true,
              })
              .sort({
                createdAt: 1,
              })
              .toArray();

          // ===================================================
          // MAX 2 DEVICES
          // ===================================================

          if (activeSessions.length >= 2) {
            const oldestSession = activeSessions[0];

            await db
              .collection("adminSessions2")
              .updateOne(
                {
                  _id: oldestSession._id,
                },
                {
                  $set: {
                    isActive: false,
                  },
                }
              );
          }

          // ===================================================
          // CREATE NEW SESSION
          // ===================================================

          await db.collection("adminSessions2").insertOne({
            userId: new ObjectId(user.id),

            sessionId: token.sessionId,

            ipAddress:
              user.ipAddress || "unknown",

            userAgent:
              user.userAgent || "unknown",

            createdAt: new Date(),

            lastActivity: new Date(),

            // Your DB session expires after 30 minutes
            expiresAt: new Date(
              Date.now() + 30 * 60 * 1000
            ),

            isActive: true,
          });

        } catch (error) {

          // IMPORTANT:
          // Do NOT destroy JWT if DB session tracking fails.

          console.error(
            "JWT INITIAL SESSION DB ERROR:",
            error
          );
        }

        return token;
      }

      // =======================================================
      // EXISTING SESSION
      // =======================================================

      if (token?.sessionId) {

        const now = Date.now();

        const UPDATE_INTERVAL =
          5 * 60 * 1000;

        if (
          !token.lastDbUpdate ||
          now - token.lastDbUpdate > UPDATE_INTERVAL
        ) {

          try {

            const client = await clientPromise;
            const db = client.db("internal");

            await db
              .collection("adminSessions2")
              .updateOne(
                {
                  sessionId: token.sessionId,
                  isActive: true,
                },
                {
                  $set: {
                    lastActivity: new Date(),
                  },
                }
              );

            token.lastDbUpdate = now;

          } catch (error) {

            // VERY IMPORTANT:
            // MongoDB failure must NOT invalidate JWT.

            console.error(
              "JWT ACTIVITY UPDATE ERROR:",
              error
            );

            // Keep the token valid.
            return token;
          }
        }
      }

      return token;
    },

    // =========================================================
    // SESSION
    // =========================================================

    async session({ session, token }) {

      if (!token?.id) {
        return null;
      }

      // Make sure user object exists
      session.user = {
        id: token.id,
        name: token.name || "",
        role: token.role || "",
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

export {
  handler as GET,
  handler as POST,
};