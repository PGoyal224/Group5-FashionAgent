# Feature Documentation

- [Accounts](accounts.md): registration, login, logout, dashboard, and account details
- [Clothing inventory](clothing-inventory.md): add, view, edit, and delete clothing
- [Saved outfits](outfits.md): build and manage outfits from owned clothing

## Run the website

Follow [Running Locally in the main README](../../README.md#running-locally).
Open http://localhost:3000, create an account, and log in. Use the local
website for the manual checks in these guides.

## Prepare automated tests

Open Docker Desktop. From `ProjectSourceCode`, run:

```sh
npm install
docker compose -f docker-compose.test.yaml up -d --wait
```

A new test database initializes from `src/init_data/create.sql`. Tests use
`fashion_agent_test` on localhost port 5433, configured in `test/setup.js`,
separate from the development database.

Run the commands in each feature guide, or run the full suite:

```sh
npm test
```

Expect passing results with no failures. Counts can change as tests are
added. These guides describe how to test; they do not record a new test run.

Stop the test database afterward:

```sh
docker compose -f docker-compose.test.yaml down
```

The test database uses temporary storage. Removing its container discards
its data. If an existing test container has an outdated schema, remove it
with the command above and start it again before testing.
