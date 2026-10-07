const { randomBytes } = require("crypto");

const generateReference = (prefix) => {
    const timestamp = Date.now().toString(36).toUpperCase();
    const suffix = randomBytes(3).toString("hex").toUpperCase();

    return `${prefix}-${timestamp}-${suffix}`;
};

module.exports = generateReference;
