# Accounts

## Goal

Let users register, sign in, and access their own wardrobe and outfits.
Show their username and saved clothing and outfit counts.

## How to use

Start the website using the [shared setup guide](README.md#run-the-website).

1. Open `/register` and enter a username, password, and matching confirmation.
2. After registration succeeds, open `/login` and sign in.
3. Open `/dashboard` for your greeting and clothing and outfit counts.
4. Open `/account` for your username and counts.
5. Use Logout and confirm to end your session.

Registration requires a nonblank username of at most 100 characters and a
password of at least eight characters. Confirmation must match. Duplicate
usernames are rejected. Passwords are hashed using bcrypt before storage.

## Routes and database

| Route | Purpose |
| --- | --- |
| `GET /register`, `POST /register` | Show registration and create a user |
| `GET /login`, `POST /login` | Show login and start a session |
| `GET /dashboard` | Show the signed-in user's dashboard |
| `GET /account` | Show account details and counts |
| `POST /logout` | Destroy the session |

The `users` table stores the user ID, username, and password hash.
Dashboard and account counts use `clothing_items` and `outfits`, filtered
by the signed-in user's ID. Protected pages require a session.

## Manual checks

- Register with a new username, log in, and check the greeting.
- Try mismatched passwords, a short password, and an existing username;
  registration should show an error.
- Try a wrong login password; an error should appear.
- Add clothing and an outfit, then check the account counts.
- Log out and visit `/dashboard` or `/account`; you should be sent to login.

## Automated tests

Complete the [test setup](README.md#prepare-automated-tests), then run from
`ProjectSourceCode`:

```sh
npx mocha --require ./test/setup.js --timeout 10000 test/validation.spec.js test/server.spec.js test/auth.spec.js
```

These tests cover registration validation and requests, login, protected
dashboard access, and logout. Account counts are a manual check above;
this command does not add automated coverage for them.

## Implementation

- [Routes and sessions](../../ProjectSourceCode/src/app.js)
- [Registration validation](../../ProjectSourceCode/src/validateRegistration.js)
- [Database schema](../../ProjectSourceCode/src/init_data/create.sql)
