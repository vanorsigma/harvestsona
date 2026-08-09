import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';

export const actions: Actions = {
  codelogin: async ({ request, locals }) => {
    const auth = locals.auth;
    const data = await request.formData();
    const code = data.get('code');

    if (!code) return fail(400, 'Invalid code');

    try {
      await auth.api.verifyOneTimeToken({
        body: {
          token: code.toString()
        }
      });
    } catch {
      return fail(401, 'Invalid / expired token');
    }

    // the cookies should have been set, we're good to go
    throw redirect(302, '/profile');
  }
};
