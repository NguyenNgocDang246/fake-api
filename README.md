<p align="center">
  <img src="public/assets/logo_vs_name.png" width="320" alt="Fake API">
</p>

<p align="center">Mock REST endpoints you can call over HTTPS, without standing up a backend.</p>

<p align="center"><a href="https://fake-api.dev">fake-api.dev</a></p>

You define the path, the method, the JSON body, the status code and the delay. The endpoint answers exactly that, to anyone holding its URL. It is for building a frontend before the real API exists, reproducing a slow or failing response on demand, and demos that need believable data.

Every project gets a public `projectId`, and its endpoints live under it:

```bash
curl -X GET https://fake-api.dev/QGONEwKEqJg/api/users/1
```

## Features

- Organise mocks as projects, endpoint groups and endpoints
- Any status code, a delay in milliseconds, and a JSON body you write yourself
- AI response variants, so a list comes back with different names, dates and ids on every call
- Custom response headers, an allowed-origin list and a credentials switch for CORS
- A sandbox on the landing page, usable without an account
- Accounts with email verification, Google sign-in and password reset

## Tech stack

- [Next.js](https://nextjs.org) App Router and [React](https://react.dev)
- [TypeScript](https://www.typescriptlang.org) and [Tailwind CSS](https://tailwindcss.com)
- [PostgreSQL](https://www.postgresql.org) through [Prisma](https://www.prisma.io)
- [React Query](https://tanstack.com/query), [react-hook-form](https://react-hook-form.com) and [Zod](https://zod.dev)
- [Resend](https://resend.com) for transactional mail
- [Gemini](https://ai.google.dev) and [Claude](https://www.anthropic.com) for the response blueprints, [Faker](https://fakerjs.dev) for the values
- [Jest](https://jestjs.io) for the backend suite

## Getting started

Requires Node.js 20 or newer and a PostgreSQL database.

```bash
git clone https://github.com/NguyenNgocDang246/fake-api
cd fake-api
npm install
```

Copy `.env.example` to `.env` and fill it in. Every variable is documented there, including which ones the app refuses to boot without.

Apply the migrations, then start the dev server:

```bash
npm run prisma:deploy
npm run dev
```

The app runs on http://localhost:3000.

## Testing

```bash
npm run test:backend
```

The suite never reaches a real database or network. How the mocks are wired is in [test/backend/README.md](test/backend/README.md).

## Working on the code

Each directory carries an `AGENTS.md` describing what lives there and the rules that apply inside it. Start from the root [AGENTS.md](AGENTS.md).
