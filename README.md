# Harvestsona

Harvestsona is a system that allows Twitch viewers to manage their own Harvestsona.
Viewers submit their Harvestsona, moderators review and approve it, and the streamer's desktop app receives approved Harvestsonas over a WebSocket to display them as an overlay on stream.

---

## Streamer Setup

Follow these steps to set up Harvestsona on your streaming machine.

### 1. Install the Windows app

Download and install the Harvestsona Streamer app for Windows.

### 2. Launch the app

Start the app from the Start menu (or wherever you installed it).

### 3. Insert the base URL

On first launch the app prompts for the Harvestsona instance URL (the "base URL") - the address of the end-user instance you are using, e.g. `https://harvestsona.example.com`.
Enter it and continue.

### 4. Get a one-time login token

Open the token URL in your browser:

```
{base}/api/streamer/sync/token
```

Copy the one-time token it shows (it expires in 3 minutes).
The app opens its login window at `{base}/login/streamer` - paste the token there (or sign in with Twitch) to log in.

### 5. Perform an initial local sync

From the sync panel in the app (or the tray **Sync...** menu), pick the folder that contains your viewers' harvestsona images.
File names become Twitch usernames (e.g. `streamer_name.png`).

Initial sync only **reads** from this folder: the app maintains its own copy of the images in its own folder elsewhere and will never modify your original folder.
If the sync is stopped halfway, you can remove the items that were already synced and run the initial sync again to continue.

### 6. Connect Streamer.bot

In Streamer.bot, add a WebSocket client pointing to:

```
ws://localhost:8987/ws
```

This becomes **Client Connection 0** (the index used in the snippet below).
Then create a C# action - e.g. triggered by a channel point redemption or a chat command - using the following code:

```csharp
using System;

public class CPHInline
{
    public bool Execute()
    {
        // Get the viewer who triggered this action (e.g., the user who redeemed a reward)
        string user = CPH.Get<string>("user");

        // Build the payload the overlay expects: show this viewer's harvestsona on the left slot
        string jsonPayload = $"{{\"side\":\"left\", \"username\":\"{user}\", \"show\":true}}";

        // Send it to the overlay through the WebSocket client on Client Connection 0
        CPH.WebsocketSend(jsonPayload, 0);

        return true;
    }
}
```

The payload above shows the triggering viewer's harvestsona on the left side of the overlay.
Use `"side": "right"` for the right slot, and send a second message with `"show": false` to hide it again.

### 7. Add an OBS browser source

In OBS, add a **Browser** source with the URL:

```
http://localhost:8987/obs.html
```

### 8. Test it

Trigger the action from Streamer.bot (e.g. with a chat message) - the viewer's harvestsona should slide up on the overlay.

### Approving, denying and banning users

Streamers and admins can moderate submissions directly in the end-user portal:

- `{base}/admin/pending` - review submitted harvestsonas and approve or deny them.
- `{base}/admin/users` - ban or unban users (and manage admins).

Approved harvestsonas sync down to the desktop app automatically and can then be triggered on the overlay.

---

## Developer Setup

The repository is structured as a [Bun](https://bun.sh/) workspace managed with [Turborepo](https://turbo.build/).
It consists of two primary applications and a collection of shared packages:

| Path | Description |
| :--- | :--- |
| `apps/enduser` | SvelteKit web application deployed to Cloudflare Workers. Handles the end-user portal, moderator/admin portal, gallery, and Twitch authentication via `better-auth`. Uses Cloudflare D1 (SQLite), R2 (object storage), and Durable Objects (WebSocket synchronization). |
| `apps/streamer` | Tauri 2 desktop application using a SvelteKit frontend and a Rust backend. Manages the onboarding flow, connects to the end-user instance via WebSocket, and renders the stream overlay window. |
| `pkgs/domain` | Core domain interfaces, including `HarvestsonaRepository`, moderation/admin repositories, and `InitialSync`. |
| `pkgs/database` | Shared Drizzle ORM schema utilized by both applications. |
| `pkgs/shared` | Common types and constant definitions. |
| `pkgs/storage` | Abstracted storage layer interfaces and implementations. |
| `scripts/` | Development and testing utility scripts. |
---

## Prerequisites

Before setting up the project, ensure you have the following installed and configured:

- **[Bun](https://bun.sh/):** JavaScript runtime and package manager.
- **[Twitch Developer Application](https://dev.twitch.tv/console/apps):** Required to acquire a `TWITCH_CLIENT_ID` and `TWITCH_CLIENT_SECRET` for authentication.
- **Twitch User ID:** The Twitch ID of the streamer, used for setting `STREAMER_ADMIN_ID`.
- **Rust Toolchain & Tauri Setup:** Required only for the streamer app. Install the [Rust toolchain](https://rustup.rs/) and follow the [Tauri system dependencies guide](https://v2.tauri.app/start/prerequisites/) for Linux.
- **Cloudflare Account:** Required only for deploying services to Cloudflare.
---

## Environment Setup

### 1. Install Dependencies

From the repository root, run:

```bash
bun install
```

### 2. Configure Enduser Environment

Copy the example environment file to create your local `.env` configuration:

```bash
cp apps/enduser/.env.example apps/enduser/.env
```

Set the environment variables as follows:

| Variable | Required in Dev | Purpose |
| --- | --- | --- |
| `ORIGIN` | Yes | Local or production web origin (e.g., `http://localhost:5173`). |
| `BETTER_AUTH_SECRET` | Yes | Session secret key for `better-auth` (must be at least 32 high-entropy characters). |
| `TWITCH_CLIENT_ID` | Yes | OAuth Client ID from your Twitch Developer Application. |
| `TWITCH_CLIENT_SECRET` | Yes | OAuth Client Secret from your Twitch Developer Application. |
| `STREAMER_ADMIN_ID` | Yes | Twitch User ID for the streamer receiving admin and moderation permissions. |
| `CLOUDFLARE_ACCOUNT_ID` | No | Cloudflare Account ID used by Drizzle Kit (`bun run db:*`) to target remote D1 instances. |
| `CLOUDFLARE_DATABASE_ID` | No | Cloudflare D1 Database ID used by Drizzle Kit. |
| `CLOUDFLARE_D1_TOKEN` | No | API Token with access permissions for Cloudflare D1. |
| `MAINTENANCE_MODE` | No | Set to `true` to block incoming traffic with a maintenance banner. |

### 3. Initialize Local Database

The web app uses Cloudflare D1.
For local development, emulate D1 by generating a local SQLite instance and applying migrations:

```bash
cd apps/enduser
bunx wrangler d1 execute harvestsona-db --local --file=./drizzle/0000_dry_talisman.sql
```

---

## Running Locally

### All Applications

To run all applications concurrently via Turborepo, execute from the repository root:

```bash
bun run dev
```

### Enduser App Only

```bash
cd apps/enduser
bun run dev
```

This starts the SvelteKit development server at `http://localhost:5173`.
The Vite configuration (`apps/enduser/vite.config.ts`) mocks Cloudflare Durable Objects and directly exposes the `/api/streamer/sync` WebSocket route so local desktop builds can establish connections.

### Streamer App Only

To run the SvelteKit frontend UI in a web browser:

```bash
cd apps/streamer
bun run dev
```

To run the full Tauri desktop client:

```bash
cd apps/streamer
bunx tauri dev
```

The desktop app prompts for the end-user origin URL on first launch (defaulting to `http://localhost:5173`) and initiates the Twitch OAuth workflow.
Streamer authentication tokens are sourced from `/api/streamer/sync/token` on the end-user instance.

### Workspace Helper Commands

Run these commands from the repository root to manage the workspace:

```bash
bun run build   # Compile all workspace applications and packages
bun run check   # Execute TypeScript type checking across all projects
bun run lint    # Run code linters across all packages
bun run test    # Execute unit and integration tests
```

---

## Deployment

### Deploying Enduser App (Cloudflare Workers)

1. Build the workspace from the repository root:
```bash
bun run build
```


2. Log into your Cloudflare account and set up infrastructure:
```bash
cd apps/enduser
bunx wrangler login

# Create the production D1 database (update wrangler.jsonc with the returned database_id)
bunx wrangler d1 create harvestsona-db

# Create the target R2 storage bucket
bunx wrangler r2 bucket create harvestsona-uploads-na

# Export your account ID
export CLOUDFLARE_ACCOUNT_ID="<your-cloudflare-account-id>"

# Apply D1 migrations to the remote database
bunx wrangler d1 migrations apply harvestsona-db --remote
```


3. Configure remote production secrets:
```bash
bunx wrangler secret put BETTER_AUTH_SECRET
bunx wrangler secret put TWITCH_CLIENT_ID
bunx wrangler secret put TWITCH_CLIENT_SECRET
bunx wrangler secret put STREAMER_ADMIN_ID
bunx wrangler secret put ORIGIN
```


4. Deploy the application:
```bash
bunx wrangler deploy
```



To target the staging environment defined in `wrangler.jsonc` (`enduser-stg` / `harvestsona-db-stg`):

```bash
bunx wrangler deploy --env staging
```

### Building Streamer App (Tauri)

Compile the production binary and packaging artifacts:

```bash
cd apps/streamer
bunx tauri build
```

Compiled binaries and distribution installers are saved to:
`apps/streamer/src-tauri/target/release/bundle/`

*Note: Cross-compilation is not natively supported by Tauri. Binaries must be built directly on the target operating system.*

---

## Streamer App HTTP API

While running, the Tauri app exposes a small [Axum](https://github.com/tokio-rs/axum) HTTP server bound to `127.0.0.1:8987` (see `apps/streamer/src-tauri/src/overlay.rs`):

| Endpoint | Description |
| :--- | :--- |
| `GET /obs.html` | OBS overlay page. |
| `GET /obs.js` | Overlay script consumed by `/obs.html`. |
| `GET /ws` | WebSocket endpoint that relays messages to every connected client. |
| `GET /harvestsona/{username}` | Serves the stored harvestsona image for a Twitch `username` (falls back to the default image if none exists). |
| `GET /harvestsona.png`, `GET /expression.gif` | Default overlay assets. |

### Fetching a harvestsona by Twitch username

While the app is running, any process on the same machine can fetch a viewer's harvestsona:

```bash
curl http://localhost:8987/harvestsona/<twitch-username> -o harvestsona.png
```

### Triggering a harvestsona on screen

Connect a WebSocket client to `ws://localhost:8987/ws` and send a JSON message.
Every message received by the server is re-broadcast to all connected clients, so any client (including the OBS overlay) can trigger the display:

```json
{ "side": "left", "username": "<twitch-username>", "show": true }
```

- `side` - which overlay slot to use, `"left"` or `"right"`.
- `username` - the Twitch username whose harvestsona to display.
- `show` - `true` to reveal the harvestsona, `false` to hide it.

The overlay loads the image from `GET /harvestsona/{username}`.
See `scripts/pretend-chat.ts` for a minimal working example.

---

## Utility Scripts

Local testing scripts require both the end-user and streamer applications to be running.
Fetch a valid streamer token from `/api/streamer/sync/token` before running integration tests.

### Database Seeding (`insert-db.ts`)

Copies an existing Harvestsona entry directly into the local SQLite database instance:

```bash
bun run scripts/insert-db.ts [path/to/db.sqlite]
```

### Chat Emulation (`pretend-chat.ts`)

Simulates a chat action by connecting directly to the Tauri WebSocket server to trigger display and hide actions:

```bash
bun run scripts/pretend-chat.ts <username> [left|right]
```
