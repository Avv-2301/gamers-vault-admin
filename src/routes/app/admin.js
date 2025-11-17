const express = require("express");
const { login, logout, getLoginHistory, updatePassword } = require("../../controllers/app/auth");
const { getDashboardStats } = require("../../controllers/app/dashboard");
const { createAuditLog, getAuditLogs, getAuditLogStats } = require("../../controllers/app/auditLog");
const { internalAuth } = require('../../middleware/internalAuth');
const { userAuth } = require('../../middleware/userAuth');

const router = express.Router();

router.post("/login", login);
router.post("/logout", logout);
router.get("/login-history/:userId", getLoginHistory);
router.put("/change-password/:userId", updatePassword);

//dashboard routes
router.get("/dashboard/stats", userAuth, getDashboardStats);

// Audit log routes
router.post("/audit-logs", internalAuth, createAuditLog);
router.get("/audit-logs", userAuth, getAuditLogs);
router.get("/audit-logs/stats", userAuth, getAuditLogStats);

module.exports = router;

