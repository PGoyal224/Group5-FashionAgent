CREATE TABLE IF NOT EXISTS users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL
);

-- Clothing items in a user's wardrobe. Items are deleted along with their owner.
-- Uploaded photos are stored in the database (image_data) so they survive
-- redeploys on hosts whose disk is wiped on every deploy, like Render.
-- Allowed categories and styles must match src/clothingOptions.js.
CREATE TABLE IF NOT EXISTS clothing_items (
    item_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(20) NOT NULL
        CHECK (category IN ('tops', 'bottoms', 'dresses', 'outerwear', 'shoes', 'accessories')),
    style VARCHAR(20)
        CHECK (style IN ('casual', 'formal', 'business', 'athletic', 'going out')),
    brand VARCHAR(100),
    -- what the user paid; exact decimal (not a float) so money adds up correctly
    price_paid NUMERIC(8, 2) CHECK (price_paid >= 0),
    image_data BYTEA,
    image_type VARCHAR(20)
        CHECK (image_type IN ('image/png', 'image/jpeg')),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    -- an image and its type are always saved together
    CHECK ((image_data IS NULL) = (image_type IS NULL))
);

-- Colors of each clothing item, one row per color, so an item can have several
-- (a white shirt with red flowers is both white and red).
-- Allowed colors must match src/clothingOptions.js.
CREATE TABLE IF NOT EXISTS clothing_item_colors (
    item_id INT NOT NULL REFERENCES clothing_items(item_id) ON DELETE CASCADE,
    color VARCHAR(20) NOT NULL
        CHECK (color IN ('black', 'white', 'gray', 'beige', 'brown', 'red', 'orange', 'yellow',
                         'green', 'blue', 'navy', 'purple', 'pink', 'gold', 'silver')),
    PRIMARY KEY (item_id, color)
);
