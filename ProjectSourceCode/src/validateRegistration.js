function validateRegistration(username, password, confirmPassword) {
    // Check for missing fields
    if (!username || !password || !username.trim() || !password.trim()) {
        return 'Please fill out all fields.';
    }

    // Check username length
    if (username.trim().length > 100) {
        return 'Username must be 100 characters or fewer.';
    }

    // Check password length
    if (password.length < 8) {
        return 'Password must be at least 8 characters long';
    }

    // Check that passwords match
    if (password !== confirmPassword) {
        return 'Passwords do not match';
    }

    // No validation errors
    return null;
}

module.exports = validateRegistration;