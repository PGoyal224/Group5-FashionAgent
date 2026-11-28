# Clothing Inventory

## Goal

Let users organize their own clothing, details, and optional photos.

## How to use

Start the website and sign in using the [shared setup guide](README.md#run-the-website).

1. Open `/inventory` to browse clothing and filter by category.
2. Choose Add Clothing Item and select a category.
3. Optionally choose a type, colors, style, details, brand, price, and photo.
4. Save and check the gallery.
5. Use Edit to change details, replace or remove a photo, or delete the item.

Categories are tops, bottoms, dresses, outerwear, shoes, and accessories.
Names are generated from colors and type or category. Details can provide
a custom description on the gallery card. Type choices depend on category.

Photos are optional: PNG, JPEG, WebP, or HEIC, up to 5 MB. HEIC is converted
to JPEG before storage. Details allow up to 200 characters and brand up to
100. Prices must be nonnegative, at most 999999.99, with no more than two
decimal places.

## Routes and database

| Route | Purpose |
| --- | --- |
| `GET /inventory` | List owned clothing; accepts a category filter |
| `GET /inventory/add`, `POST /inventory/add` | Show the form and save clothing |
| `GET /inventory/:id/edit`, `POST /inventory/:id/edit` | Load and update owned clothing |
| `POST /inventory/:id/delete` | Delete owned clothing |
| `GET /inventory/:id/image` | Serve a photo to its owner |

`clothing_items` stores the owner, generated name, details, and photo bytes
and type. `clothing_item_colors` stores each selected color. Photos are
stored in PostgreSQL rather than a local upload folder.

Deleting clothing removes its colors and outfit links, but keeps the saved
outfits. Viewing photos, editing, and deleting are restricted to the owner.

## Manual checks

- Add clothing without a photo; it should save with a placeholder.
- Add clothing with a supported photo and several colors; check the gallery.
- Filter by its category and verify it appears.
- Edit details and colors, then check the saved changes.
- Replace a photo, then try removing it on another edit.
- Try an invalid price or unsupported file; an error should appear.
- Put clothing in an outfit, delete the clothing, and check the outfit remains.
- Sign in as another user and check the first user's clothing is hidden.

## Automated tests

Complete the [test setup](README.md#prepare-automated-tests), then run from
`ProjectSourceCode`:

```sh
npx mocha --require ./test/setup.js --timeout 10000 test/clothingValidation.spec.js test/itemName.spec.js test/addItem.spec.js test/inventory.spec.js test/editItem.spec.js test/deleteItem.spec.js
```

These tests cover validation, generated names, uploads, category filters,
ownership, editing, photo replacement, and deletion behavior.

## Implementation

- [Routes](../../ProjectSourceCode/src/app.js)
- [Choices and names](../../ProjectSourceCode/src/clothingOptions.js)
- [Validation](../../ProjectSourceCode/src/validateClothingItem.js)
- [Photo conversion](../../ProjectSourceCode/src/preparePhoto.js)
- [Database schema](../../ProjectSourceCode/src/init_data/create.sql)
