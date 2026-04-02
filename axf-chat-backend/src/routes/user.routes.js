// src/routes/user.routes.js
const router = require("express").Router();
const { getOnlineUsers, searchUsers } = require("../controllers/user.controller");
const { authMiddleware } = require("../middleware/auth.middleware");

router.use(authMiddleware);

router.get("/online", getOnlineUsers);
router.get("/search", searchUsers);

module.exports = router;
