import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { getDb } from "@/db";
import * as schema from "@/db/schema";
import { slugify } from "@/lib/slug";

function createAuth() {
  return betterAuth({
    appName: "Sharefetch",
    database: drizzleAdapter(getDb(), {
      provider: "pg",
      schema: {
        user: schema.user,
        session: schema.session,
        account: schema.account,
        verification: schema.verification,
      },
    }),
    user: {
      additionalFields: {
        handle: {
          type: "string",
          required: true,
          input: true,
        },
        bioUrl: {
          type: "string",
          required: false,
          input: true,
        },
      },
    },
    databaseHooks: {
      user: {
        create: {
          before: async (u) => {
            const base = slugify(u.name || "user") || "user";
            const handle = `${base}-${crypto.randomUUID().slice(0, 4)}`;
            return { data: { ...u, handle } };
          },
        },
      },
    },
    socialProviders: process.env.GITHUB_CLIENT_ID
      ? {
          github: {
            clientId: process.env.GITHUB_CLIENT_ID,
            clientSecret: process.env.GITHUB_CLIENT_SECRET ?? "",
          },
        }
      : undefined,
    plugins: [nextCookies()],
  });
}

export const auth = createAuth();
