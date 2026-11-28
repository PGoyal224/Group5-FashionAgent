# Saved Outfits

## Goal

Let users combine their own clothing into named outfits and return later
to view, edit, or delete them.

## How to use

Start the website and sign in using the [shared setup guide](README.md#run-the-website).
Add clothing to your inventory first so there are items to choose from.

1. Open `/outfits` and choose to build an outfit.
2. Enter a name and choose clothing from your inventory.
3. Optionally enter a description, weather, and occasion.
4. Save and open the outfit from the saved outfits list.
5. Edit its details or selected clothing, or delete it.

The name is required and limited to 100 characters. Description allows up
to 2000 characters, weather 50, and occasion 100. Weather and occasion are
saved labels; they do not fetch forecasts or automatically choose clothing.
This guide describes manual outfit building.

## Routes and database

| Route | Purpose |
| --- | --- |
| `GET /outfits` | List owned outfits |
| `GET /outfits/new` | Show the outfit builder |
| `POST /outfits` | Save an outfit |
| `GET /outfits/:id` | Show an owned outfit and its clothing |
| `GET /outfits/:id/edit` | Show the edit form |
| `POST /outfits/:id` | Update details and selected clothing |
| `POST /outfits/:id/delete` | Delete an owned outfit |

`outfits` stores the owner, name, description, weather, occasion, and
creation time. `outfit_items` connects outfits to clothing. An outfit can
have several items, and clothing can be reused in different outfits.

The app checks ownership before saving. Composite foreign keys also
require the outfit and clothing to have the same owner. The primary key
blocks duplicate links. Saving and editing use transactions so the outfit
and its item links are saved together.

Deleting an outfit removes its links but keeps the clothing. Deleting
clothing removes its links but keeps the outfits. Deleting a user removes
their clothing, outfits, and related links.

## Manual checks

- Save an outfit with two owned items and check both appear in its details.
- Save weather and occasion, then reopen Edit to check the saved labels.
- Edit the name and clothing and check the changes persist.
- Submit a blank name; an error should appear.
- Sign in as another user; the first user's outfits should be hidden.
- Delete an outfit and check its clothing remains in the inventory.

## Automated tests

Complete the [test setup](README.md#prepare-automated-tests), then run from
`ProjectSourceCode`:

```sh
npx mocha --require ./test/setup.js --timeout 10000 test/outfits.spec.js test/database.spec.js
```

These tests cover outfit requests, creation, editing, deletion, ownership,
duplicate links, and database deletion behavior.

## Implementation

- [Routes](../../ProjectSourceCode/src/app.js)
- [Database schema](../../ProjectSourceCode/src/init_data/create.sql)
- [Outfit tests](../../ProjectSourceCode/test/outfits.spec.js)
- [Relationship tests](../../ProjectSourceCode/test/database.spec.js)
