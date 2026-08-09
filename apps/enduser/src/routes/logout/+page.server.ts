import { redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
  throw redirect(307, '/login');
};

export const actions: Actions = {
  default: async (event) => {
    await event.locals.auth.api.signOut({
      headers: event.request.headers
    });
    throw redirect(303, '/login');
  }
};
