CREATE TABLE IF NOT EXISTS users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL
);

-- Clothing items in a user's wardrobe. Items are deleted along with their owner.
CREATE TABLE IF NOT EXISTS clothing_items (
    item_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(20) NOT NULL
        CHECK (category IN ('tops', 'bottoms', 'dresses', 'shoes', 'accessories')),
    style VARCHAR(50),
    image_url VARCHAR(500),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
