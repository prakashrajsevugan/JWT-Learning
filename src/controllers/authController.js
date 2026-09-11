const pool = require("../config/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const { sendOTPEmail } = require("../services/emailService");

// =====================================================
// SIGNUP
// =====================================================

const signup = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Check required fields
        if (!email || !password) {
            return res.status(400).json({
                message: "Email and password are required"
            });
        }

        // Normalize email
        const normalizedEmail = email.trim().toLowerCase();

        // Validate email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(normalizedEmail)) {
            return res.status(400).json({
                message: "Invalid email format"
            });
        }

        // Password policy
        if (
            password.length < 8 ||
            !/[A-Z]/.test(password) ||
            !/[a-z]/.test(password) ||
            !/[0-9]/.test(password)
        ) {
            return res.status(400).json({
                message:
                    "Password must contain at least 8 characters, one uppercase letter, one lowercase letter, and one number"
            });
        }

        // Check if user already exists
        const existingUser = await pool.query(
            "SELECT id FROM users WHERE email = $1",
            [normalizedEmail]
        );

        if (existingUser.rows.length > 0) {
            return res.status(409).json({
                message: "User already exists"
            });
        }

        // Check existing OTP verification
        const existingVerification = await pool.query(
            `SELECT request_count, first_request_at, last_sent_at
             FROM email_verifications
             WHERE email = $1`,
            [normalizedEmail]
        );

        if (existingVerification.rows.length > 0) {
            const verification = existingVerification.rows[0];

            const now = Date.now();

            const firstRequestTime =
                new Date(verification.first_request_at).getTime();

            const lastSentTime =
                new Date(verification.last_sent_at).getTime();

            const minutesSinceFirstRequest =
                (now - firstRequestTime) / (60 * 1000);

            const secondsSinceLastRequest =
                (now - lastSentTime) / 1000;

            // Reset request window after 15 minutes
            if (minutesSinceFirstRequest >= 15) {
                await pool.query(
                    `UPDATE email_verifications
                     SET request_count = 1,
                         first_request_at = CURRENT_TIMESTAMP,
                         last_sent_at = CURRENT_TIMESTAMP,
                         attempts = 0
                     WHERE email = $1`,
                    [normalizedEmail]
                );
            } else {
                // 60-second cooldown
                if (secondsSinceLastRequest < 60) {
                    const remainingSeconds = Math.ceil(
                        60 - secondsSinceLastRequest
                    );

                    return res.status(429).json({
                        message: `Please wait ${remainingSeconds} seconds before requesting another OTP`
                    });
                }

                // Maximum 5 OTP requests in 15 minutes
                if (verification.request_count >= 5) {
                    return res.status(429).json({
                        message:
                            "Too many OTP requests. Please try again after 15 minutes."
                    });
                }
            }
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);

        // Generate secure 6-digit OTP
        const otp = crypto
            .randomInt(100000, 1000000)
            .toString();

        // Hash OTP
        const otpHash = await bcrypt.hash(otp, 10);

        // OTP expires after 10 minutes
        const expiresAt = new Date(
            Date.now() + 10 * 60 * 1000
        );

        // Store verification information
        if (existingVerification.rows.length === 0) {
            // First OTP request
            await pool.query(
                `INSERT INTO email_verifications
                (
                    email,
                    password_hash,
                    otp_hash,
                    expires_at,
                    attempts,
                    request_count,
                    first_request_at,
                    last_sent_at
                )
                VALUES
                (
                    $1,
                    $2,
                    $3,
                    $4,
                    0,
                    1,
                    CURRENT_TIMESTAMP,
                    CURRENT_TIMESTAMP
                )`,
                [
                    normalizedEmail,
                    passwordHash,
                    otpHash,
                    expiresAt
                ]
            );
        } else {
            // New OTP request
            await pool.query(
                `UPDATE email_verifications
                 SET password_hash = $1,
                     otp_hash = $2,
                     expires_at = $3,
                     attempts = 0,
                     request_count = request_count + 1,
                     last_sent_at = CURRENT_TIMESTAMP
                 WHERE email = $4`,
                [
                    passwordHash,
                    otpHash,
                    expiresAt,
                    normalizedEmail
                ]
            );
        }

        // Send OTP using Resend
        await sendOTPEmail(normalizedEmail, otp);

        return res.status(200).json({
            message: "OTP sent to your email"
        });

    } catch (error) {
        console.error("Signup error:", error);

        return res.status(500).json({
            message: "Server error"
        });
    }
};


// =====================================================
// VERIFY EMAIL
// =====================================================

const verifyEmail = async (req, res) => {
    try {
        const { email, otp } = req.body;

        // Check required fields
        if (!email || !otp) {
            return res.status(400).json({
                message: "Email and OTP are required"
            });
        }

        // Normalize email
        const normalizedEmail = email
            .trim()
            .toLowerCase();

        // Validate OTP format
        if (!/^\d{6}$/.test(otp)) {
            return res.status(400).json({
                message: "OTP must be a 6-digit number"
            });
        }

        // Find verification record
        const result = await pool.query(
            `SELECT *
             FROM email_verifications
             WHERE email = $1`,
            [normalizedEmail]
        );

        if (result.rows.length === 0) {
            return res.status(400).json({
                message: "No OTP request found"
            });
        }

        const verification = result.rows[0];

        // Check OTP expiration
        if (
            new Date() >
            new Date(verification.expires_at)
        ) {
            await pool.query(
                "DELETE FROM email_verifications WHERE email = $1",
                [normalizedEmail]
            );

            return res.status(400).json({
                message:
                    "OTP expired. Please request a new OTP."
            });
        }

        // Check maximum attempts
        if (verification.attempts >= 5) {
            return res.status(429).json({
                message:
                    "Too many incorrect attempts. Please request a new OTP."
            });
        }

        // Compare OTP
        const isValid = await bcrypt.compare(
            otp,
            verification.otp_hash
        );

        // Invalid OTP
        if (!isValid) {
            await pool.query(
                `UPDATE email_verifications
                 SET attempts = attempts + 1
                 WHERE email = $1`,
                [normalizedEmail]
            );

            return res.status(400).json({
                message: "Invalid OTP"
            });
        }

        // Create user
        const userResult = await pool.query(
            `INSERT INTO users
            (email, password)
            VALUES ($1, $2)
            RETURNING id, email, created_at`,
            [
                verification.email,
                verification.password_hash
            ]
        );

        // Delete temporary verification record
        await pool.query(
            "DELETE FROM email_verifications WHERE email = $1",
            [normalizedEmail]
        );

        return res.status(201).json({
            message:
                "Email verified and user created successfully",
            user: userResult.rows[0]
        });

    } catch (error) {
        console.error("Verify email error:", error);

        return res.status(500).json({
            message: "Server error"
        });
    }
};


// =====================================================
// LOGIN
// =====================================================

const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Check required fields
        if (!email || !password) {
            return res.status(400).json({
                message: "Email and password are required"
            });
        }

        // Normalize email
        const normalizedEmail = email
            .trim()
            .toLowerCase();

        // Find user
        const result = await pool.query(
            "SELECT * FROM users WHERE email = $1",
            [normalizedEmail]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        const user = result.rows[0];

        // Compare password
        const isPasswordCorrect = await bcrypt.compare(
            password,
            user.password
        );

        if (!isPasswordCorrect) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        // Generate JWT
        const token = jwt.sign(
            {
                userId: user.id,
                email: user.email
            },
            process.env.JWT_SECRET,
            {
                expiresIn: process.env.JWT_EXPIRES_IN
            }
        );

        return res.json({
            message: "Login successful",
            token
        });

    } catch (error) {
        console.error("Login error:", error);

        return res.status(500).json({
            message: "Server error"
        });
    }
};


// =====================================================
// EXPORT
// =====================================================

module.exports = {
    signup,
    verifyEmail,
    login
};