// dev only durable object shim
export class DurableObject {
  ctx: DurableObjectState;
  env: unknown;

  constructor(ctx: DurableObjectState, env: unknown) {
    this.ctx = ctx;
    this.env = env;
  }

  async fetch(_request: Request): Promise<Response> {
    return new Response('DurableObject not available in dev', { status: 501 });
  }
}
