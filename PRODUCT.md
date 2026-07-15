# Rift Trust - Product and Development Plan

Last updated: 2026-07-15

## Project Overview

Rift Trust is a web application for the League of Legends JP community.

Main features:

- Custom match recruitment
- Malicious player reporting
- Trust score system
- Display recently matched teammates
- Display teammates' current trust scores

The goal is to provide a safer matchmaking environment while reducing false, malicious, and anonymous reports.

---

## Product Policy

- A user must sign in with a Rift Trust account before using protected APIs.
- Only users with a verified, linked LoL account can submit reports.
- Reporter identity is determined by the backend from the Cognito JWT. The frontend must not be allowed to specify another reporter.
- Cognito `sub`, email addresses, and other private identifiers must never be exposed publicly.
- A verified reporter may be displayed by their linked Riot ID (`gameName#tagLine`).
- Reports should initially have `PENDING` status. Only reviewed or verified reports should affect trust scores.
- A reporter and target should eventually be validated as participants in the same Riot match before a report is accepted.

---

## Tech Stack

### Frontend

- Next.js 16 App Router
- TypeScript
- Tailwind CSS
- AWS Amplify (`aws-amplify`)
- AWS Amplify Hosting (planned)

### Backend

- Amazon API Gateway (HTTP API)
- AWS Lambda (`lol-api-handler`, Node.js 24.x)
- Amazon DynamoDB
- Amazon Cognito
- Riot Games API

---

## Architecture

```text
Browser / Next.js
    │
    │ Cognito Access Token (JWT)
    ▼
API Gateway HTTP API
    │
    │ JWT Authorizer
    ▼
Lambda: lol-api-handler
    │
    ├── Riot Games API
    ├── DynamoDB: lol-players
    └── DynamoDB: rifttrust-users
```

The Riot API key is stored only in the Lambda environment variable `RIOT_API_KEY`. The browser must never receive or call Riot APIs with this key.

---

## AWS Configuration

- Region: `ap-northeast-1`
- API Gateway: `lol-api` (HTTP API)
- Lambda: `lol-api-handler`
- Lambda timeout: 10 seconds
- Cognito JWT Authorizer: attached to all protected routes
- `GET /health`: intentionally public for health checks, including when Cognito is unavailable
- CORS: configured for the local frontend, including `Authorization` and `Content-Type`

Lambda environment variables:

```text
RIOT_API_KEY=<server-side Riot API key>
PLAYERS_TABLE_NAME=lol-players
USERS_TABLE_NAME=rifttrust-users
```

Frontend environment variables:

```text
NEXT_PUBLIC_COGNITO_USER_POOL_ID=<Cognito User Pool ID>
NEXT_PUBLIC_COGNITO_CLIENT_ID=<Cognito App Client ID>
NEXT_PUBLIC_API_BASE_URL=<API Gateway Invoke URL>
```

Do not store the Riot API key in a `NEXT_PUBLIC_` environment variable.

---

## Backend Design

One Lambda function currently handles all API routes. API Gateway performs routing and JWT validation, while Lambda contains business logic.

Backend source:

```text
backend/lambda/lol-api-handler/index.mjs
```

### Current routes

```text
GET  /health
GET  /players/{gameName}/{tagLine}

GET  /account-links/me
POST /account-links/start
POST /account-links/verify
```

Route protection:

```text
GET /health                              Public
GET /players/{gameName}/{tagLine}        JWT required
GET /account-links/me                    JWT required
POST /account-links/start                JWT required
POST /account-links/verify               JWT required
```

### Planned report routes

```text
POST  /reports
GET   /players/{puuid}/reports
GET   /reports/mine
GET   /admin/reports
PATCH /admin/reports/{reportId}
```

Possible future player routes:

```text
GET /players/{puuid}
GET /players/{puuid}/matches
```

---

## Authentication

Authentication is handled by Amazon Cognito and AWS Amplify.

Implemented frontend functions:

- Signup
- Email confirmation
- Resend confirmation code
- Login
- Logout
- Restore the current authenticated session
- Attach the Cognito Access Token to protected API requests

Password UI includes:

- Show/hide password controls
- Password requirements displayed before submission
- Client-side requirement validation

Password requirements currently shown by the app:

- At least 8 characters
- Uppercase letter
- Lowercase letter
- Number
- Symbol

API Gateway validates the JWT before invoking Lambda. Lambda then reads the Cognito `sub` from:

```text
event.requestContext.authorizer.jwt.claims.sub
```

---

## LoL Account Linking

### Purpose

Rift Trust users must link a LoL account before they can submit reports. This reduces anonymous and irresponsible reporting and provides a verified Riot ID for the reporter.

### Current development verification flow

```text
1. User signs in with Cognito
2. User enters their Riot ID (gameName + tagLine)
3. Lambda resolves the Riot ID to a stable PUUID
4. Lambda reads the current LoL profile icon ID
5. A five-minute verification challenge is stored
6. User changes their LoL profile icon
7. Frontend calls the verification API every 10 seconds
8. Lambda detects the changed profile icon
9. Cognito sub and Riot PUUID are linked atomically
```

While verification is running, the UI displays:

```text
変更の反映には最大2分ほどかかる場合があります。少々お待ちください。
```

Riot profile icon changes were observed to take roughly one minute to appear through the Riot API. The challenge itself expires after five minutes. An unchanged icon returns HTTP `202` with `PENDING`; an expired challenge returns HTTP `410`; a successful verification returns HTTP `200` with `VERIFIED`.

### Known limitation

The profile-icon flow proves that the public profile state changed during the challenge window, but it cannot prove which person caused the change. An unrelated icon change during the same window could theoretically produce a false verification. The five-minute window is an accepted development-stage usability/security tradeoff.

For production, Riot Sign On (RSO/OAuth) should replace this mechanism after the application receives the required Riot production approval.

### One-to-one linking

The backend writes two DynamoDB items when verification succeeds:

```text
USER#<Cognito sub>   -> linked user information
RIOT#<Riot PUUID>    -> unique ownership/link record
```

Both items are written in a DynamoDB transaction. The `RIOT#<PUUID>` item prevents one LoL account from being linked to multiple Rift Trust accounts.

---

## DynamoDB

### `lol-players`

Purpose: Riot player cache and trust information.

Partition key:

```text
puuid (String)
```

Example item:

```json
{
  "puuid": "...",
  "gameName": "...",
  "tagLine": "...",
  "trustScore": 100,
  "createdAt": "...",
  "updatedAt": "..."
}
```

The player search route refreshes Riot account information and uses `100` as the initial trust score.

### `rifttrust-users`

Purpose: Rift Trust user state and verified LoL account links.

Partition key:

```text
pk (String)
```

No sort key or secondary index is currently required.

Verified user item:

```json
{
  "pk": "USER#<Cognito sub>",
  "entityType": "USER",
  "userSub": "<Cognito sub>",
  "puuid": "<Riot PUUID>",
  "gameName": "...",
  "tagLine": "...",
  "riotAccountStatus": "VERIFIED",
  "verificationType": "PROFILE_ICON",
  "verifiedAt": "...",
  "createdAt": "...",
  "updatedAt": "..."
}
```

Unique Riot link item:

```json
{
  "pk": "RIOT#<Riot PUUID>",
  "entityType": "RIOT_LINK",
  "userSub": "<Cognito sub>",
  "puuid": "<Riot PUUID>",
  "gameName": "...",
  "tagLine": "...",
  "verificationType": "PROFILE_ICON",
  "verifiedAt": "..."
}
```

Expired `PENDING` user items may currently remain in the table and can be overwritten by a new challenge. Automatic TTL cleanup or an unlink/reset API can be added later.

### Planned tables

```text
rifttrust-reports
lol-matches (if a separate match cache is needed)
```

---

## Frontend Structure

Current pages:

```text
src/app/page.tsx                  Landing page
src/app/signup/page.tsx           Signup and email confirmation
src/app/login/page.tsx            Login
src/app/players/page.tsx          Authenticated player search
src/app/account-link/page.tsx     LoL account linking
```

Important modules:

```text
src/lib/amplify.ts
src/lib/api.ts

src/services/auth.service.ts
src/services/player.service.ts
src/services/account-link.service.ts

src/components/auth/*
src/components/player/player-search.tsx
src/components/account-link/account-link-panel.tsx
```

The account-link page supports:

- Restoring `UNLINKED`, `PENDING`, or `VERIFIED` status
- Starting a profile-icon challenge
- Loading state while Riot data is being checked
- Automatic verification polling every 10 seconds
- Five-minute expiration handling
- Verified account display

---

## Riot API Handling

The frontend must never call the Riot API directly.

```text
Frontend -> API Gateway -> Lambda -> Riot API
```

Implemented Riot API handling includes:

- Riot ID to PUUID lookup
- PUUID to LoL summoner/profile icon lookup
- Player-not-found handling
- Development key expiration/invalid-key handling
- Riot rate-limit handling
- Safe CloudWatch logging without API keys or JWT values

The Riot Development API key expires regularly and currently must be updated in the Lambda environment variable.

---

## Coding Policy

- Keep UI and business logic separated.
- API calls should be implemented in `services/`.
- React components should focus on UI and interaction state.
- Shared client API authentication belongs in `src/lib/api.ts`.
- AWS configuration should remain inside `lib/` or Lambda environment variables.
- Use TypeScript strictly.
- Never expose the Riot API key to the client.
- Read the bundled Next.js documentation under `node_modules/next/dist/docs/` before changing Next.js-specific code.

---

## AWS Resource Naming

Current resources:

```text
API Gateway: lol-api
Lambda:      lol-api-handler
Cognito App: lol-web
DynamoDB:    lol-players
DynamoDB:    rifttrust-users
```

Use `lol-` for Riot/game data resources and `rifttrust-` for Rift Trust application data where the distinction is useful.

---

## Current Progress

Completed:

- Next.js landing page and Rift Trust visual design
- Cognito signup, confirmation, login, logout, and session restoration
- Password visibility controls and requirement guidance
- API Gateway HTTP API and Lambda integration
- Public `GET /health`
- JWT Authorizer attached to protected routes
- CORS configuration
- Authenticated frontend API client
- Authenticated player search screen
- Riot ID lookup through Lambda
- `lol-players` persistence with an initial trust score
- `rifttrust-users` table and Lambda IAM permissions
- LoL account-link start, status, and verification APIs
- Five-minute profile-icon verification challenge
- Unique Cognito-to-PUUID linking
- Account-link frontend page
- Ten-second automatic verification polling
- Successful end-to-end account linking test
- ESLint, Lambda syntax check, and Next.js production build passing

---

## Next Steps

1. Design and create the `rifttrust-reports` DynamoDB table.
2. Require `riotAccountStatus = VERIFIED` in the report creation API.
3. Implement `POST /reports` with controlled categories and server-derived reporter identity.
4. Require a Riot `matchId` and validate that reporter and target participated in the same match.
5. Prevent duplicate reports for the same reporter, target, and match.
6. Implement player report history with public-safe reporter information.
7. Implement reporter history (`GET /reports/mine`).
8. Implement admin moderation and `PENDING` / `VERIFIED` / `DISMISSED` states.
9. Apply trust score changes only after a report is verified.
10. Add an account unlink/reset API and stale challenge cleanup.
11. Prepare production hosting, Terms of Service, Privacy Policy, Riot production key, and RSO application.
