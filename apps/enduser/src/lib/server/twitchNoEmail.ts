import type { BetterAuthPlugin } from 'better-auth';
import type { OAuth2Tokens, OAuthProvider } from 'better-auth';
import {
  createAuthorizationURL,
  validateAuthorizationCode,
  refreshAccessToken
} from 'better-auth/oauth2';

export interface TwitchNoEmailOptions {
  clientId: string;
  clientSecret: string;
  redirectURI?: string;
}

const AUTHORIZATION_ENDPOINT = 'https://id.twitch.tv/oauth2/authorize';
const TOKEN_ENDPOINT = 'https://id.twitch.tv/oauth2/token';
const HELIX_USERS_URL = 'https://api.twitch.tv/helix/users';

interface HelixUser {
  id: string;
  login: string;
  display_name: string;
  profile_image_url: string;
}

function buildProvider(options: TwitchNoEmailOptions): OAuthProvider {
  return {
    id: 'twitch',
    name: 'Twitch',

    createAuthorizationURL({ state, scopes, redirectURI }) {
      const _scopes = [...(scopes ?? [])];
      return createAuthorizationURL({
        id: 'twitch',
        options,
        authorizationEndpoint: AUTHORIZATION_ENDPOINT,
        scopes: _scopes,
        state,
        redirectURI
      });
    },

    async validateAuthorizationCode({ code, redirectURI }) {
      return validateAuthorizationCode({
        code,
        redirectURI,
        options,
        tokenEndpoint: TOKEN_ENDPOINT
      });
    },

    async refreshAccessToken(refreshToken) {
      return refreshAccessToken({
        refreshToken,
        options: {
          clientId: options.clientId,
          clientSecret: options.clientSecret
        },
        tokenEndpoint: TOKEN_ENDPOINT
      });
    },

    async getUserInfo(token: OAuth2Tokens) {
      const accessToken = token.accessToken;
      if (!accessToken) {
        console.error('No access token found');
        return null;
      }

      const response = await fetch(HELIX_USERS_URL, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Client-Id': options.clientId
        }
      });

      if (!response.ok) {
        console.error('Helix users request failed', response.status);
        return null;
      }

      const json = (await response.json()) as { data: HelixUser[] };
      const user = json.data?.[0];
      if (!user) {
        console.error('No user returned from Helix API');
        return null;
      }

      return {
        user: {
          id: user.id,
          name: user.login.toLowerCase(),
          email: `${user.id}@placeholder.local`,
          image: user.profile_image_url,
          emailVerified: true
        },
        data: user
      };
    },

    options
  };
}

export const twitchNoEmail = (options: TwitchNoEmailOptions): BetterAuthPlugin => ({
  id: 'twitch-noemail',
  init: (ctx) => ({
    context: {
      socialProviders: [
        buildProvider(options),
        ...ctx.socialProviders.filter((p) => p.id !== 'twitch')
      ]
    }
  })
});
