import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, request, setHeaders }) => {
  const headers = request.headers;
  const auth = locals.auth;
  const data = await auth.api.generateOneTimeToken({
    headers
  });

  setHeaders({ 'cache-control': 'no-store, private' });
  return {
    token: data.token
  };
};
