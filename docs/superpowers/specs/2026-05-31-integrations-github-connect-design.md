# GitHub Integrations Page Design

## Goal

Add an operator Integrations page where users can connect or disconnect GitHub and see whether repository access is ready.

## Decisions

- The web UI uses GitHub device flow as the primary local connection flow.
- Device flow requires a GitHub OAuth app client ID, but it does not require a client secret.
- The existing web OAuth routes stay available as a fallback for environments that already have a full client ID/secret pair.
- Local browser origins that use `localhost` are still normalized to `127.0.0.1` for the fallback OAuth route.

## UI

- Add `/integrations` to the operator navigation.
- Render a GitHub integration card with connection state, account login, repository availability, and actions.
- Actions:
  - Connect GitHub starts device flow. If no client ID is configured, the page asks for the client ID first.
  - The active device flow shows the GitHub verification code and a link to GitHub's verification page.
  - Disconnect GitHub clears the stored token/login and refreshes cached connection state.
  - Refresh reloads connection and repository state.

## Server

- Keep the existing GitHub OAuth endpoints.
- Add device flow start and poll endpoints.
- Store the temporary `device_code` in an HTTP-only cookie scoped to `/api/github/device`.
- Save the provided client ID to the workspace environment store. Never ask for or send a client secret during device flow.
- On a successful poll, save the GitHub access token and validated login, then clear the device-code cookie.
- Add sanitized `returnTo` and loopback `origin` handling to `/api/github/oauth/start`.
- Store OAuth state, return path, and normalized origin in HTTP-only cookies scoped to `/api/github/oauth`.
- Use the stored origin to exchange the callback code with the same redirect URI GitHub issued.

## Tests

- Server OAuth route tests cover normalized loopback redirect URI, return path cookies, callback redirect target, and unsafe return fallback.
- Server device route tests cover client-ID-only start, pending poll, connected poll, token/login persistence, and cookie clearing.
- Web utility tests cover OAuth start URL normalization from `localhost` to `127.0.0.1`.
- Web API tests cover device flow start/poll parsing.
- Web integration utility tests cover GitHub card state labels, client-ID prompting, and action availability.
