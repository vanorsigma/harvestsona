import type { User, Session } from 'better-auth';
import { createAuth } from '$lib/server/auth';
import type { Scope } from '@harvestsona/shared';
import type { Harvestsonas } from '@harvestsona/database';
import type {
  AdminRepository,
  HarvestsonaModerationRepository,
  HarvestsonaRepository,
  UserManagementRepository
} from '@harvestsona/domain';
import type { SyncDatabase } from '$lib/server/SyncDatabase';
import type { WebSocketServer } from 'ws';

// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
  namespace App {
    interface Locals {
      user?: User;
      scopes: Scope[];
      session?: Session;
      auth: ReturnType<typeof createAuth>;
      repositories?: {
        harvestsonas?: Harvestsonas;
        harvestsona?: HarvestsonaRepository;
        moderation?: HarvestsonaModerationRepository;
        admins?: AdminRepository;
        users?: UserManagementRepository<any>;
      };
      sync?: {
        db?: SyncDatabase;
      };
    }

    interface Platform {
      env: Env;
      ctx: ExecutionContext;
      caches: CacheStorage;
      cf?: IncomingRequestCfProperties;
    }

    // interface Error {}
    // interface PageData {}
    // interface PageState {}
  }

  var __wss: WebSocketServer | undefined;
}

export {};
