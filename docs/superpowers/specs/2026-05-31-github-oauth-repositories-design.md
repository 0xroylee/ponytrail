# GitHub OAuth Repository Listing Design

## Goal

Let the local web app connect a GitHub account through OAuth so the Projects
create/edit dialog can list repositories without depending on `gh auth login`.

## Scope

This feature covers local app OAuth for repository discovery only. It does not
replace workflow GitHub operations that already use authenticated `gh`, and it
does not add hosted accounts, organizations, multi-user sessions, webhooks, or
GitHub App installation flows.

The manual `owner/repo` entry path remains available at all times.

## Architecture

The server owns GitHub OAuth and token storage. The web app only asks the server
for connection status, starts the OAuth flow, and lists repositories through the
existing API client layer.

OAuth uses a GitHub OAuth App configured with:

- `GITHUB_OAUTH_CLIENT_ID`
- `GITHUB_OAUTH_CLIENT_SECRET`

The server derives the callback URL from the request origin plus
`/api/github/oauth/callback`. The first version intentionally has no redirect
override so configuration stays small.

## Server API

Add these routes under the existing GitHub HTTP surface:

- `GET /api/github/connection`
  - Returns whether OAuth is configured and whether a token is connected.
  - Response shape:
    - `isConfigured: boolean`
    - `isConnected: boolean`
    - `login: string | null`
    - `unavailableReason: string | null`
- `GET /api/github/oauth/start`
  - Requires OAuth client id/secret.
  - Generates a random state value.
  - Sets an HttpOnly, SameSite=Lax state cookie with a short lifetime.
  - Redirects to GitHub authorize with `repo` scope and the derived callback URL.
- `GET /api/github/oauth/callback`
  - Validates the callback state against the state cookie.
  - Exchanges the code for an access token.
  - Stores the token in local devos secret storage as `GITHUB_OAUTH_ACCESS_TOKEN`.
  - Fetches `/user` once and stores the login as `GITHUB_OAUTH_LOGIN`.
  - Clears the state cookie.
  - Redirects back to `/projects?github=connected`.
- `DELETE /api/github/connection`
  - Removes the stored token and login.
  - Does not revoke the token at GitHub in the first version.

The token is stored in the same local secret mechanism already documented for
devos: `~/.devos/config/env.sqlite`. The repository never writes OAuth tokens to
tracked files.

## Repository Listing

`GET /api/github/repositories` changes from shelling out to `gh repo list` to
using the connected OAuth token.

When connected, the server calls:

`GET https://api.github.com/user/repos?per_page=100&sort=updated&affiliation=owner,collaborator,organization_member`

The server maps each GitHub repo to the existing repository response shape:

- `id`
- `owner`
- `name`
- `nameWithOwner`
- `defaultBranch`
- `isPrivate`

When OAuth is not configured or no token is connected, the route returns the
existing unavailable response shape with a specific reason. The Projects dialog
can then show a connect action and keep manual entry available.

## Web UI

The Projects dialog keeps the current Select/Manual repository segmented
control.

In Select mode:

- If connected and repos load, show the repository select as today.
- If OAuth is not configured, show a concise unavailable state and keep Manual
  selectable.
- If OAuth is configured but disconnected, show a `Connect GitHub` button.
- If repo listing fails after connection, show a retry affordance and keep
  Manual selectable.

Clicking `Connect GitHub` navigates the current tab to
`/api/github/oauth/start`. The callback returns to `/projects`, where opening
the dialog again or refetching connection state lists repositories.

## Error Handling

Missing OAuth config returns a non-throwing disconnected response. Invalid state
or missing code returns a stable JSON error from the callback. Token exchange
failure redirects back to `/projects?github=error` without storing anything.

Repository listing failures do not break project creation or editing. They only
disable Select mode and keep Manual mode available.

## Security

The OAuth state value is random and bound to an HttpOnly cookie. The access
token is only stored in local devos secret storage. Server responses never
include the access token. Logs and error messages must not include OAuth codes,
tokens, or raw GitHub response bodies.

The first version requests `repo` scope so private repositories can appear in
the selector. A narrower public-only mode is intentionally not included because
the Projects page must support private work repos.

## Testing

Server tests cover:

- connection status when OAuth is unconfigured, disconnected, and connected
- start route redirect URL and state cookie
- callback state validation
- callback token exchange and token/login storage
- repository listing with the stored OAuth token
- unavailable repository response when disconnected or GitHub API fails
- disconnect route clearing stored credentials

Web API tests cover:

- parsing connection status
- starting OAuth through the API path or exposed URL helper
- parsing connected and unavailable repository listing responses

Project dialog utility tests cover:

- connected repository select state
- disconnected connect action state
- manual fallback state when unavailable

Package and repo verification use Bun:

- `rtk bun test packages/server/tests/github-repositories-routes.test.ts`
- `rtk bun test packages/web/tests/github-repositories-client.test.ts`
- `rtk bun test packages/web/tests/projects-panel-utils.test.ts`
- `rtk bun run --filter devos-server typecheck`
- `rtk bun run --filter web typecheck`
- `rtk bun run check`
- `rtk bun run typecheck`
- `rtk bun test`
