// Choices for clothing item fields.
// These must match the CHECK constraints in init_data/create.sql.

const CATEGORIES = ['tops', 'bottoms', 'dresses', 'outerwear', 'shoes', 'accessories'];

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

module.exports = { CATEGORIES, COLORS, COLOR_VALUES, STYLES, optionLabel };
