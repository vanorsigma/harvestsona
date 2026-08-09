import { createAuthClient } from 'better-auth/client';
const authClient = createAuthClient();

export const signIn = async () => {
  const data = await authClient.signIn.social({
    provider: 'twitch',
    callbackURL: '/profile'
  });

  if (data.error) throw new Error(`Cannot make sign in object due to ${data.error}`);

  return data.data;
};
