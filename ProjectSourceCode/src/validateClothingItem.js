const { CATEGORIES, COLOR_VALUES, STYLES } = require('./clothingOptions');

// Largest photo a user can upload: 5 MB
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

// HEIF/HEIC files (the iPhone camera default) name their format in bytes 8-11
const HEIF_BRANDS = ['heic', 'heix', 'hevc', 'hevx', 'heim', 'heis', 'mif1', 'msf1'];

// Work out a photo's format from its first bytes, instead of trusting the
// filename or the type the browser reports (both can be faked).
// Returns 'image/png', 'image/jpeg', 'image/webp', 'image/heic', or null for anything else.
function detectImageType(buffer) {
    if (!buffer) {
        return null;
    }
    if (buffer.length >= 8 && buffer.subarray(0, 8).equals(PNG_SIGNATURE)) {
        return 'image/png';
    }
    if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
        return 'image/jpeg';
    }
    // WebP: "RIFF", 4 bytes of file size, then "WEBP"
    if (buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' &&
        buffer.toString('ascii', 8, 12) === 'WEBP') {
        return 'image/webp';
    }
    // HEIF/HEIC: 4 bytes of box size, "ftyp", then the format's brand
    if (buffer.length >= 12 && buffer.toString('ascii', 4, 8) === 'ftyp' &&
        HEIF_BRANDS.includes(buffer.toString('ascii', 8, 12))) {
        return 'image/heic';
    }
    return null;
}

// Browsers send an empty file when the photo input is left blank,
// so treat a missing or empty file the same: no photo.
const hasPhoto = image => Boolean(image && image.size > 0);

// Prices like "25", "19.99" or "$19.99", up to 999999.99 (NUMERIC(8, 2) in create.sql)
const PRICE_PATTERN = /^\$?\s*(\d{1,6})(\.\d{1,2})?$/;

// Turn what the user typed for price into text PostgreSQL can store exactly
// ("$19.99" -> "19.99"). Returns null when left blank, undefined when invalid.
function parsePrice(price) {
    if (!price || !price.trim()) {
        return null;
    }
    const match = price.trim().match(PRICE_PATTERN);
    if (!match) {
        return undefined;
    }
    return match[1] + (match[2] || '');
}

// A form sends nothing, one value, or a list of values for checkboxes
// that share a name. Always return a list without duplicates.
function toList(value) {
    if (value === undefined || value === null || value === '') {
        return [];
    }
    return [...new Set([].concat(value))];
}

// fields are the form's inputs (req.body);
// image is the file object from multer (req.file), or undefined if none was sent.
// The photo is optional so items can be added quickly.
function validateClothingItem(fields, image) {
    const { name, category, style, brand, price_paid } = fields;
    const colors = toList(fields.colors);

    // Check required fields
    if (!name || !name.trim()) {
        return 'Please enter a name for the item.';
    }
    if (!CATEGORIES.includes(category)) {
        return 'Please choose a category.';
    }

    // Check lengths (must match the column sizes in create.sql)
    if (name.trim().length > 100) {
        return 'Name must be 100 characters or fewer.';
    }
    if (brand && brand.trim().length > 100) {
        return 'Brand must be 100 characters or fewer.';
    }

    // Check choices come from the lists in clothingOptions.js
    if (!colors.every(c => COLOR_VALUES.includes(c))) {
        return 'Please choose colors from the list.';
    }
    if (style && !STYLES.includes(style)) {
        return 'Please choose a style from the list.';
    }

    // Check price format
    if (parsePrice(price_paid) === undefined) {
        return 'Price paid must be a number like 25 or 19.99.';
    }

    // Check the photo, if there is one
    if (hasPhoto(image)) {
        if (image.size > MAX_IMAGE_BYTES) {
            return 'Photo must be 5 MB or smaller.';
        }
        if (!detectImageType(image.buffer)) {
            return 'Photo must be a PNG, JPEG, WebP, or HEIC file.';
        }
    }

    // No validation errors
    return null;
}

module.exports = { validateClothingItem, detectImageType, hasPhoto, parsePrice, toList, MAX_IMAGE_BYTES };
