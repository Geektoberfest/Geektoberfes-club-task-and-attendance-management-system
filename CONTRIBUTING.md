# Contributing

Thanks for your interest in contributing to the Club Task & Attendance Management System! Contributions are welcome, including bug fixes, usability improvements, new features, tests, and documentation.

Please follow these guidelines so changes are easier to review and maintain.

## Before You Start

- Check existing issues and pull requests to avoid duplicate work.
- For substantial changes, open an issue first and discuss the proposed solution.
- If an issue is assigned to someone else, coordinate with the maintainers before starting.
- Keep each pull request focused on one issue or a closely related set of changes.

## Development Setup

This repository contains a Next.js application in the `clubtask/` directory. It uses Next.js App Router, React, Tailwind CSS, MongoDB, Mongoose, JWT, and bcryptjs.

### Prerequisites

- Node.js and npm
- MongoDB locally or through MongoDB Atlas
- Git

### 1. Fork and clone the repository

Fork the repository on GitHub, then clone your fork:

```bash
git clone <your-fork-url>
cd club-task-and-attendance-management-system-project
```

### 2. Install dependencies

```bash
cd clubtask
npm install
```

### 3. Configure environment variables

Create `clubtask/.env.local`:

```env
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_long_random_secret
```

`NEXT_PUBLIC_API_URL` is optional and is used as the API base URL by the client fetch helper. For the same-origin Next.js API routes, it can remain unset.

Never commit `.env.local`, database credentials, JWT secrets, or other private configuration.

### 4. Run the app

From `clubtask/`:

```bash
npm run dev
```

Open `http://localhost:3000`. The application UI and API routes run within the same Next.js app.

## Branching Guidelines

Create a separate branch for each contribution:

```bash
git checkout -b fix/attendance-validation
git checkout -b feat/attendance-export
git checkout -b docs/setup-guide
```

Recommended prefixes:

- `feat/` — new features
- `fix/` — bug fixes
- `docs/` — documentation
- `refactor/` — code improvements without intended behavior changes
- `test/` — tests

Avoid mixing unrelated changes in one branch.

## Making Changes

- Follow the existing project structure and naming conventions.
- Keep API handlers, models, and UI components focused on their responsibilities.
- Validate and normalize user input on the server, not only in the browser.
- Preserve authentication, role checks, and resource-ownership checks.
- Handle loading, empty, success, and error states in the UI.
- Do not expose credentials, tokens, password hashes, or private member data.
- Avoid adding dependencies unless they are needed.
- Update documentation when environment variables, routes, or behavior change.
- Avoid unrelated formatting changes.

## Testing Your Changes

Before opening a pull request:

- Run a production build from `clubtask/`:

  ```bash
  npm run build
  ```

- Run the configured lint command:

  ```bash
  npm run lint
  ```

- Manually test the affected pages and API routes.
- Check the browser console and server logs for errors.
- Verify access control with both lead and member accounts where relevant.
- Verify existing functionality still works after the change.

The current `package.json` does not define an automated test script. Do not claim automated tests passed unless you add and run a test suite. If a command fails because of existing configuration or tooling, include that detail in your pull request.

## Commit Messages

Use short, descriptive commit messages:

```text
feat: add attendance CSV export
fix: validate attendance status
docs: clarify environment setup
refactor: centralize API error handling
test: cover login validation
```

## Pull Request Process

1. Commit your changes on your branch.
2. Push the branch to your fork.
3. Open a pull request against the repository's designated base branch.
4. Link the related issue with `Closes #<issue-number>` when appropriate.
5. Explain what changed, why it was needed, and how you tested it.
6. Include screenshots or recordings for UI changes.
7. Respond to review feedback and update the branch as needed.

A pull request should not contain unrelated changes, generated build output, dependency directories, or secrets.

## Issue Guidelines

When reporting a bug, include:

- A clear title and description
- Steps to reproduce
- Expected and actual behavior
- Relevant error messages or screenshots with sensitive details removed
- Browser, operating system, and environment details when useful

For feature requests, explain the problem, intended behavior, and a reasonable acceptance criterion.

## Security

Never commit `.env.local`, database credentials, JWT secrets, or tokens. If you discover a security vulnerability, do not publish exploit details in a public issue. Report it privately to the repository owner or maintainers.

## Questions

If you are unsure about an implementation, open an issue or ask the maintainers before making a large change.
Thanks for helping improve the project!
