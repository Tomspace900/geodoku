import {
  type AuthFunctions,
  createClient,
  type GenericCtx,
} from "@convex-dev/better-auth";
import { convex, crossDomain } from "@convex-dev/better-auth/plugins";
import { APIError } from "better-auth/api";
import { type BetterAuthOptions, betterAuth } from "better-auth/minimal";
import { emailOTP } from "better-auth/plugins";
import { components, internal } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import { forgetAccount } from "./accountErasure";
import authConfig from "./auth.config";
import { deliverCodeEmail } from "./authEmail";
import {
  buildCodeEmail,
  type CodeEmailLocale,
  type CodeEmailPurpose,
} from "./lib/codeEmail";

/**
 * Compte facultatif (#155) : Better Auth dans un composant Convex, code par
 * e-mail et Google. Réglages par défaut, sauf ce que la décision fixe : un
 * code de 6 chiffres, valable 5 minutes, 5 essais ; aucune donnée de profil
 * Google reprise (ni nom, ni photo) ; suppression en libre-service.
 */

/**
 * La page envoie sa langue et l'objet du code dans deux en-têtes : la seule
 * entrée de Better Auth vers l'envoi est `sendVerificationOTP`, sans champ
 * libre. Ils sont autorisés par le CORS des routes (`http.ts`).
 */
export const LOCALE_HEADER = "x-geodoku-locale";
export const PURPOSE_HEADER = "x-geodoku-purpose";

const authFunctions: AuthFunctions = internal.auth;

export const authComponent = createClient<DataModel>(components.betterAuth, {
  authFunctions,
  triggers: {
    user: {
      // Même transaction que la suppression : le profil part avec le compte,
      // les parties sont détachées juste après (`account.detachGames`).
      onDelete: async (ctx, doc) => {
        await forgetAccount(ctx, doc._id);
      },
    },
  },
});

export const { onCreate, onUpdate, onDelete } = authComponent.triggersApi();

/** Origines de la page (`SITE_URL`) et, en dev, d'autres ports ou un téléphone. */
function siteOrigins(): string[] {
  return [
    process.env.SITE_URL,
    ...(process.env.EXTRA_TRUSTED_ORIGINS ?? "").split(","),
  ]
    .map((origin) => origin?.trim())
    .filter((origin): origin is string => Boolean(origin));
}

function headerOf(
  endpointCtx: { headers?: Headers; request?: Request } | undefined,
  name: string,
): string | null {
  return (
    endpointCtx?.headers?.get(name) ??
    endpointCtx?.request?.headers.get(name) ??
    null
  );
}

export const createAuth = (ctx: GenericCtx<DataModel>) => {
  const siteUrl = process.env.SITE_URL ?? "http://localhost:5173";
  const googleId = process.env.GOOGLE_CLIENT_ID;
  const googleSecret = process.env.GOOGLE_CLIENT_SECRET;

  return betterAuth({
    baseURL: process.env.CONVEX_SITE_URL,
    secret: process.env.BETTER_AUTH_SECRET,
    trustedOrigins: siteOrigins(),
    database: authComponent.adapter(ctx),
    user: { deleteUser: { enabled: true } },
    account: {
      // Un même e-mail par code puis par Google : un seul compte.
      accountLinking: { enabled: true, trustedProviders: ["google"] },
    },
    // Le limiteur de Better Auth garde ses compteurs en mémoire, que les
    // fonctions Convex ne partagent pas : les envois sont limités par
    // `authEmail.reserveCodeSend`, les essais par code par `allowedAttempts`.
    rateLimit: { enabled: false },
    databaseHooks: {
      user: {
        create: {
          // Rien du profil Google : le nom est tiré au rattachement
          // (`account.syncAccount`), la photo n'est jamais gardée.
          before: async (user) => ({
            data: { ...user, name: "", image: null },
          }),
        },
      },
    },
    ...(googleId && googleSecret
      ? {
          socialProviders: {
            google: {
              clientId: googleId,
              clientSecret: googleSecret,
              // Google ne renvoie que vers un domaine qu'on possède : le site,
              // qui relaie vers Convex (`src/lib/convexSite.ts`). La même
              // adresse sert à l'échange du code.
              redirectURI: `${siteUrl}/api/auth/callback/google`,
            },
          },
        }
      : {}),
    plugins: [
      crossDomain({ siteUrl }),
      convex({ authConfig }),
      emailOTP({
        otpLength: 6,
        expiresIn: 300,
        allowedAttempts: 5,
        // Un code renvoyé reste le même tant qu'il vaut : un renvoi refusé
        // par la limite n'invalide pas celui déjà reçu.
        storeOTP: "encrypted",
        resendStrategy: "reuse",
        // Changer d'e-mail : un seul code, envoyé à la nouvelle adresse. Une
        // adresse qui a déjà un compte ne reçoit rien et l'écran ne le dit
        // pas : seul le propriétaire de la boîte voit que rien n'arrive.
        changeEmail: { enabled: true, verifyCurrentEmail: false },
        sendVerificationOTP: async ({ email, otp, type }, endpointCtx) => {
          if (type !== "sign-in" && type !== "change-email") return;
          if (!("runMutation" in ctx)) {
            throw new Error("Codes are sent from an HTTP action only");
          }
          const allowed = await ctx.runMutation(
            internal.authEmail.reserveCodeSend,
            { email },
          );
          if (!allowed) {
            throw new APIError("TOO_MANY_REQUESTS", {
              code: "TOO_MANY_CODES",
              message: "Too many codes requested",
            });
          }
          const locale: CodeEmailLocale =
            headerOf(endpointCtx, LOCALE_HEADER) === "en" ? "en" : "fr";
          const purpose: CodeEmailPurpose =
            type === "change-email"
              ? "change-email"
              : headerOf(endpointCtx, PURPOSE_HEADER) === "delete-account"
                ? "delete-account"
                : "sign-in";
          await deliverCodeEmail(
            email,
            buildCodeEmail({ otp, locale, purpose }),
          );
        },
      }),
    ],
  } satisfies BetterAuthOptions);
};
