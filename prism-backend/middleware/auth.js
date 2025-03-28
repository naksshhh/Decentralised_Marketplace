const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
    try {
        // For now, we'll skip authentication and just pass through
        // TODO: Implement proper JWT authentication
        next();
    } catch (error) {
        res.status(401).json({ message: 'Authentication failed' });
    }
};

module.exports = auth; 