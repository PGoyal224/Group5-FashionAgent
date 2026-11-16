const convertHeic = require('heic-convert');
const { detectImageType } = require('./validateClothingItem');

// Get an uploaded photo ready to save in clothing_items.
// Only Safari can show HEIC photos (the iPhone camera default), so they are
// converted to JPEG; PNG, JPEG, and WebP work in every browser and are kept as is.
// Returns { data, type }, or throws if the photo can't be read.
async function preparePhoto(buffer) {
    const type = detectImageType(buffer);

    if (type !== 'image/heic') {
        return { data: buffer, type };
    }

    const jpeg = await convertHeic({ buffer, format: 'JPEG', quality: 0.85 });
    return { data: Buffer.from(jpeg), type: 'image/jpeg' };
}

module.exports = preparePhoto;
