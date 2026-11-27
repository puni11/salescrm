
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import clientPromise from "@/lib/mongodb";
import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";
import { randomUUID } from "crypto";

export const authOptions = {
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
  },

  jwt: {
    maxAge: 60 * 60 * 24 * 30,
  },

  providers: [
    CredentialsProvider({
      name: "Credentials",

      credentials: {
        email: {
          label: "Email",
          type: "text",
        },

        username: {
          label: "Username",
          type: "text",
        },

        password: {
          label: "Password",
          type: "password",
        },

        role: {
          label: "Role",
          type: "text",
        },
      },

      async authorize(credentials, req) {
        if (!credentials?.password || !credentials?.role) {
          return null;
        }

        try {
          const client = await clientPromise;

          const ip =
            req?.headers?.["x-forwarded-for"] ||
            req?.headers?.["x-real-ip"] ||
            "unknown";

          const userAgent =
            req?.headers?.["user-agent"] || "unknown";

          // =====================================================
          // TRAINER LOGIN
          // =====================================================

          if (credentials.role === "trainer") {
            if (!credentials.username) {
              return null;
            }

            const db = client.db("sales");

            const username = String(
              credentials.username
            )
              .trim()
              .toLowerCase();

            const trainer = await db
              .collection("trainers")
              .findOne({
                username,
              });
console.log(trainer)
            if (!trainer) {
              return null;
            }

            // Only active trainers can login
            if (trainer.status !== "active") {
              return null;
            }

            // New password authentication
            if (!trainer.passwordHash) {
              console.error(
                "Trainer password hash not found:",
                trainer._id.toString()
              );

              return null;
            }

            const isValidPassword = await bcrypt.compare(
              credentials.password,
              trainer.passwordHash
            );
            console.log("Password valid:", isValidPassword);

            if (!isValidPassword) {
              return null;
            }

            // Update trainer last login
            await db.collection("trainers").updateOne(
              {
                _id: trainer._id,
              },
              {
                $set: {
                  lastLogin: new Date(),
                  updatedAt: new Date(),
                },
              }
            );

            return {
              id: trainer._id.toString(),
              name: trainer.name || "Trainer",
              username: trainer.username,
              role: "trainer",
              trainerId: trainer._id.toString(),
              ipAddress: ip,
              userAgent,
            };
          }

          // =====================================================
          // ADMIN LOGIN
          // =====================================================

          if (credentials.role === "admin") {
            if (!credentials.email) {
              return null;
            }

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

            // Update admin last login
            await db.collection("users").updateOne(
              {
                _id: user._id,
              },
              {
                $set: {
                  lastLogin: new Date(),
                },
              }
            );

            return {
              id: user._id.toString(),
              name: user.name,
              role: user.role || "admin",
              ipAddress: ip,
              userAgent,
            };
          }

          return null;
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

        token.username = user.username || null;
        token.trainerId = user.trainerId || null;

        token.sessionId = randomUUID();
        token.lastDbUpdate = Date.now();

        // =====================================================
        // TRAINER SESSION
        // =====================================================

        if (user.role === "trainer") {
          // Trainers do not use adminSessions2
          return token;
        }

        // =====================================================
        // ADMIN SESSION DATABASE TRACKING
        // =====================================================

        try {
          const client = await clientPromise;
          const db = client.db("internal");

          if (!ObjectId.isValid(user.id)) {
            console.error("Invalid user ID:", user.id);
            return token;
          }

          const activeSessions = await db
            .collection("adminSessions2")
            .find({
              userId: new ObjectId(user.id),
              isActive: true,
            })
            .sort({
              createdAt: 1,
            })
            .toArray();

          // Max 2 devices
          if (activeSessions.length >= 2) {
            const oldestSession = activeSessions[0];

            await db.collection("adminSessions2").updateOne(
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

          // Create new admin session
          await db.collection("adminSessions2").insertOne({
            userId: new ObjectId(user.id),

            sessionId: token.sessionId,

            ipAddress: user.ipAddress || "unknown",
            userAgent: user.userAgent || "unknown",

            createdAt: new Date(),
            lastActivity: new Date(),

            expiresAt: new Date(
              Date.now() + 30 * 60 * 1000
            ),

            isActive: true,
          });
        } catch (error) {
          console.error(
            "JWT INITIAL SESSION DB ERROR:",
            error
          );
        }

        return token;
      }

      // =======================================================
      // EXISTING ADMIN SESSION
      // =======================================================

      if (token?.sessionId && token?.role === "admin") {
        const now = Date.now();

        const UPDATE_INTERVAL = 5 * 60 * 1000;

        if (
          !token.lastDbUpdate ||
          now - token.lastDbUpdate > UPDATE_INTERVAL
        ) {
          try {
            const client = await clientPromise;
            const db = client.db("internal");

            await db.collection("adminSessions2").updateOne(
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
            console.error(
              "JWT ACTIVITY UPDATE ERROR:",
              error
            );

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

      session.user = {
        id: token.id,
        name: token.name || "",
        username: token.username || null,
        role: token.role || "",
        trainerId: token.trainerId || null,
      };

      session.sessionId = token.sessionId || null;

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
