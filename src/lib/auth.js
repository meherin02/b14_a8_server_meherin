import { betterAuth } from "better-auth";
import { mongodbAdapter } from "@better-auth/mongo-adapter";
import { createAuthMiddleware, APIError } from "better-auth/api";
import { jwt } from "better-auth/plugins";

export function createAuth(db, client) {
  if (
    !process.env.BETTER_AUTH_SECRET ||
    process.env.BETTER_AUTH_SECRET.length < 32
  ) {
    throw new Error("BETTER_AUTH_SECRET must contain at least 32 characters.");
  }
  const googleEnabled = Boolean(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
  );
  return betterAuth({
    appName: "Community Events",
    baseURL: process.env.BETTER_AUTH_URL,
    secret: process.env.BETTER_AUTH_SECRET,
    trustedOrigins: [process.env.CLIENT_URL],
    database: mongodbAdapter(db, { client }),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 6,
      requireEmailVerification: false,
    },
    socialProviders: googleEnabled
      ? {
          google: {
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          },
        }
      : {},
    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        if (ctx.path !== "/sign-up/email") return;
        const { password, name, image } = ctx.body || {};
        if (
          typeof password !== "string" ||
          !/(?=.*[a-z])(?=.*[A-Z]).{6,}/.test(password)
        ) {
          throw new APIError("BAD_REQUEST", {
            message:
              "Use at least 6 characters with uppercase and lowercase letters.",
          });
        }
        if (typeof name !== "string" || !name.trim()) {
          throw new APIError("BAD_REQUEST", { message: "Enter your name." });
        }
        if (image) {
          try {
            if (!["https:", "http:"].includes(new URL(image).protocol))
              throw new Error();
          } catch {
            throw new APIError("BAD_REQUEST", {
              message: "Enter a valid photo URL.",
            });
          }
        }
      }),
    },
    plugins: [
      jwt({
        jwt: {
          issuer: process.env.BETTER_AUTH_URL,
          audience: process.env.BETTER_AUTH_URL,
        },
      }),
    ],
  });
}
