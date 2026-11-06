import betterAuth from "@convex-dev/better-auth/convex.config";
import rateLimiter from "@convex-dev/rate-limiter/convex.config.js";
import { defineApp } from "convex/server";

const app = defineApp();
app.use(rateLimiter);
// Comptes (#155) : utilisateurs, sessions et codes vivent dans le composant.
app.use(betterAuth);

export default app;
