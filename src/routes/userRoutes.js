const express = require("express");
const authenticateUser = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/profile", authenticateUser, (req, res) => {
    res.json({
        message: "You can access this protected route",
        user: req.user
    });
});

module.exports = router;