import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { env } from '$env/dynamic/private';
import { getRequestEvent } from '$app/server';
import { getDb, user, harvestsonas } from '@harvestsona/database';
import { oneTimeToken } from 'better-auth/plugins';
import { eq, ne, and } from 'drizzle-orm';
import { betterAuth } from 'better-auth';
import { twitchNoEmail } from '$lib/server/twitchNoEmail';

const authConfig = {
  baseURL: env.ORIGIN,
  secret: env.BETTER_AUTH_SECRET,
  emailAndPassword: { enabled: false },
  plugins: [
    oneTimeToken(),
    twitchNoEmail({
      clientId: env.TWITCH_CLIENT_ID,
      clientSecret: env.TWITCH_CLIENT_SECRET
    }),
    sveltekitCookies(getRequestEvent) // make sure this is the last plugin in the array
  ]
} satisfies Omit<Parameters<typeof betterAuth>[0], 'database'>;

export const createAuth = (d1: D1Database) => {
  const db = getDb(d1);
  return betterAuth({
    ...authConfig,
    database: drizzleAdapter(db, { provider: 'sqlite' }),
    databaseHooks: {
      account: {
        create: {
          before: async (accountData) => {
            const newUserId = accountData.userId as string;
            const newUser = await db
              .select({ name: user.name })
              .from(user)
              .where(eq(user.id, newUserId))
              .get();
            if (!newUser) return;

            const existing = await db
              .select({ id: user.id })
              .from(user)
              .where(and(eq(user.name, newUser.name), ne(user.id, newUserId)))
              .get();
            if (!existing) return;

            // deliberate approach. if an existing user exists, we copy over the
            // harvestsona data, and delete the old user.
            const oldH = await db
              .select()
              .from(harvestsonas)
              .where(eq(harvestsonas.userId, existing.id))
              .get();

            if (oldH) {
              await db.insert(harvestsonas).values({
                userId: newUserId,
                username: oldH.username,
                currentFilename: oldH.currentFilename,
                currentHash: oldH.currentHash,
                currentFileTimestamp: oldH.currentFileTimestamp
              });
            }

            await db.delete(user).where(eq(user.id, existing.id));
          }
        }
      }
    }
  });
};

/**
 * DO NOT USE!
 *
 * This instance is used by the `better-auth` CLI for schema generation ONLY.
 * To access `auth` at runtime, use `event.locals.auth`.
 */
export const auth = createAuth(null!);
