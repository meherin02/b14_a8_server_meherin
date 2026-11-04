import { createRemoteJWKSet, jwtVerify } from "jose";
import { fromNodeHeaders } from "better-auth/node";

export function createRequireAuth(auth) {
  const baseURL = process.env.BETTER_AUTH_URL;
  const keys = createRemoteJWKSet(new URL(`${baseURL}/api/auth/jwks`));
  return async (req, res, next) => {
    const token = req.headers.authorization?.match(/^Bearer (.+)$/i)?.[1];
    if (!token)
      return res.status(401).json({ message: "Please log in first." });
    try {
      const { payload } = await jwtVerify(token, keys, {
        issuer: baseURL,
        audience: baseURL,
      });
      const session = await auth.api.getSession({
        headers: fromNodeHeaders(req.headers),
      });
      if (!session || session.user.id !== payload.sub) {
        return res
          .status(401)
          .json({ message: "Your session has ended. Please log in again." });
      }
      req.user = session.user;
      next();
    } catch (error) {
      if (process.env.DEBUG_AUTH === "true") console.error(error);
      return res
        .status(401)
        .json({ message: "Invalid or expired authentication." });
    }
  };
}
