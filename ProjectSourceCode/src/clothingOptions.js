// Choices for clothing item fields.
// These must match the CHECK constraints in init_data/create.sql.

const CATEGORIES = ['tops', 'bottoms', 'dresses', 'outerwear', 'shoes', 'accessories'];

// Optional, more specific types within each category. When chosen, the type
// names the item ("Gray Blouse") instead of the category ("Gray Top").
// Not checked by the database; validateClothingItem checks it matches the category.
const TYPES = {
    tops: ['t-shirt', 'tank top', 'blouse', 'button-down', 'polo', 'sweater', 'sweatshirt', 'hoodie', 'bodysuit'],
    bottoms: ['jeans', 'pants', 'shorts', 'skirt', 'leggings', 'sweatpants'],
    dresses: ['mini dress', 'midi dress', 'maxi dress', 'jumpsuit', 'romper'],
    outerwear: ['jacket', 'coat', 'blazer', 'cardigan', 'vest', 'raincoat'],
    shoes: ['sneakers', 'boots', 'sandals', 'heels', 'flats', 'loafers', 'slippers', 'socks'],
    accessories: ['bag', 'belt', 'hat', 'scarf', 'jewelry', 'sunglasses', 'watch', 'gloves']
};

// What one item in each category is called, for generated item names
const CATEGORY_NOUNS = {
    tops: 'Top',
    bottoms: 'Bottoms',
    dresses: 'Dress',
    outerwear: 'Outerwear',
    shoes: 'Shoes',
    accessories: 'Accessory'
};

// An item can have several colors, e.g. a white shirt with red flowers is
// both white and red, so it can be matched with either in outfit planning.
// hex is only used to draw the color swatches.
const COLORS = [
    { value: 'black', hex: '#000000' },
    { value: 'white', hex: '#ffffff' },
    { value: 'gray', hex: '#9e9e9e' },
    { value: 'beige', hex: '#e8d8b9' },
    { value: 'brown', hex: '#7b4a2a' },
    { value: 'red', hex: '#d32f2f' },
    { value: 'orange', hex: '#f57c00' },
    { value: 'yellow', hex: '#fbc02d' },
    { value: 'green', hex: '#388e3c' },
    { value: 'blue', hex: '#1e88e5' },
    { value: 'navy', hex: '#1a237e' },
    { value: 'purple', hex: '#7b1fa2' },
    { value: 'pink', hex: '#f48fb1' },
    { value: 'gold', hex: '#d4af37' },
    { value: 'silver', hex: '#c0c0c0' }
];

const COLOR_VALUES = COLORS.map(c => c.value);

const STYLES = ['casual', 'formal', 'business', 'athletic', 'going out'];

// "going out" -> "Going out"
const optionLabel = value => value.charAt(0).toUpperCase() + value.slice(1);

// "tank top" -> "Tank Top", "t-shirt" -> "T-shirt"
const titleCase = value => value.split(' ').map(optionLabel).join(' ');

// Item names are generated from the colors and the type (or the category when
// there's no type), so users don't have to type one:
// "Top", "Navy Socks", "Black & White Dress", "Multicolor Tank Top".
// Colors are named in the same order as COLORS, whatever order they were chosen in.
function generateItemName(category, colors, itemType) {
    const noun = itemType ? titleCase(itemType) : CATEGORY_NOUNS[category];
    const chosen = COLOR_VALUES.filter(c => colors.includes(c)).map(optionLabel);

    if (chosen.length === 0) {
        return noun;
    }
    if (chosen.length > 2) {
        return `Multicolor ${noun}`;
    }
    return `${chosen.join(' & ')} ${noun}`;
}

module.exports = { CATEGORIES, TYPES, COLORS, COLOR_VALUES, STYLES, optionLabel, generateItemName };
