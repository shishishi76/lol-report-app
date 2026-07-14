# LoL Report App - Development Plan

## Project Overview

This project is a web application for the League of Legends JP server.

Main features:

- Custom match recruitment
- Malicious player reporting
- Trust score system
- Display recently matched teammates
- Display teammates' current trust scores

The goal is to provide a safer matchmaking environment while reducing false or malicious reports.

---

# Tech Stack

## Frontend

- Next.js (App Router)
- TypeScript
- Tailwind CSS
- AWS Amplify Hosting

## Backend

- Amazon API Gateway (HTTP API)
- AWS Lambda (Node.js 24.x)
- Amazon DynamoDB
- Amazon Cognito
- Riot Games API

---

# Architecture

```text
Next.js
    │
    │ JWT Token
    ▼
Amazon Cognito
    │
    ▼
API Gateway (HTTP API)
    │
    ▼
Lambda (lol-api-handler)
    │
    ├── Riot API
    └── DynamoDB
```

---

# Backend Design

Use **one Lambda function** for all API endpoints.

Lambda name:

```
lol-api-handler
```

API Gateway routes are responsible only for routing requests.

Lambda contains all business logic.

Current routes:

```
GET /health

GET /players/{gameName}/{tagLine}
```

Future routes:

```
GET /players/{puuid}

GET /players/{puuid}/matches

POST /reports

GET /users/me

GET /reports

DELETE /reports/{id}
```

Inside Lambda:

```
switch (event.routeKey)

GET /health

GET /players/{gameName}/{tagLine}

POST /reports

...
```

---

# Authentication

Authentication is handled by Amazon Cognito.

Frontend:

- User signup
- Login
- Logout

using

```
aws-amplify
```

API Gateway validates JWT tokens before invoking Lambda.

Public endpoint:

```
GET /health
```

Authenticated endpoints:

```
GET /players/{gameName}/{tagLine}

POST /reports

GET /users/me

...
```

---

# Riot API Policy

The frontend **must never** call Riot API directly.

Correct flow:

```
Frontend

↓

API Gateway

↓

Lambda

↓

Riot API
```

Reasons:

- Hide Riot API key
- Prevent abuse
- Allow caching
- Allow business logic
- Future extensibility

---

# DynamoDB

First table:

```
lol-players
```

Partition key:

```
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

Additional tables may include:

```
lol-users

lol-reports

lol-matches
```

---

# Frontend Directory Structure

```
src
├── app
│   ├── (public)
│   │   ├── login
│   │   ├── signup
│   │   └── players
│   │
│   ├── (protected)
│   │   ├── profile
│   │   ├── reports
│   │   └── settings
│   │
│   ├── layout.tsx
│   └── globals.css
│
├── components
│
├── hooks
│
├── lib
│   ├── amplify.ts
│   └── api.ts
│
├── services
│   ├── auth.service.ts
│   ├── player.service.ts
│   ├── report.service.ts
│   └── match.service.ts
│
├── types
│
└── utils
```

---

# Coding Policy

- Keep UI and business logic separated.
- API calls should be implemented in `services/`.
- React components should focus on UI.
- Shared logic should be placed in hooks.
- AWS configuration should remain inside `lib/`.
- Use TypeScript strictly.

---

# Naming Convention

AWS Resources

```
API Gateway
lol-api

Lambda
lol-api-handler

Cognito App
lol-web

DynamoDB
lol-players
```

Future resources should follow the same prefix.

---

# Current Progress

Completed:

- HTTP API created
- Lambda created
- API Gateway connected
- GET /health working
- GET /players/{gameName}/{tagLine} working
- Cognito User Pool created
- Amplify configured in Next.js

Next steps:

1. Build signup page
2. Build login page
3. Authenticate using Cognito
4. Protect API Gateway using JWT Authorizer
5. Create DynamoDB tables
6. Save player information
7. Implement report feature
8. Implement trust score algorithm