import { betterAuth } from "better-auth";
import { mongodbAdapter } from "@better-auth/mongo-adapter";
import { createAuthMiddleware, APIError } from "better-auth/api";
import { jwt } from "better-auth/plugins";
import {
  validateProfileFields,
  validateSignupPassword,
} from "../utils/authValidation.js";

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
        const signup = ctx.path === "/sign-up/email";
        if (!signup && ctx.path !== "/update-user") return;
        const error =
          validateProfileFields(ctx.body, { required: signup }) ||
          (signup ? validateSignupPassword(ctx.body?.password) : null);
        if (error) throw new APIError("BAD_REQUEST", { message: error });
        const fields = {};
        if (typeof ctx.body.name === "string")
          fields.name = ctx.body.name.trim();
        if (typeof ctx.body.image === "string")
          fields.image = ctx.body.image.trim();
        return { context: { ...ctx, body: { ...ctx.body, ...fields } } };
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
