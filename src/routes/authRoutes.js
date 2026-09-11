const express = require("express");

const {
    signup,
    verifyEmail,
    login
} = require("../controllers/authController");

const authRateLimiter = require("../middleware/rateLimiter");

const router = express.Router();

router.post("/signup", authRateLimiter, signup);
router.post("/verify-email", authRateLimiter, verifyEmail);
router.post("/login", authRateLimiter, login);

module.exports = router;