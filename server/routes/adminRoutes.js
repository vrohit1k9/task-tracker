const express = require('express');
const { getAllUsers, updateUserRole, deleteUser, getSystemStats } = require('../controllers/adminController');
const { getSystemAuditLogs } = require('../controllers/auditController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);
router.use(authorize('admin')); // Secure all routes to Admin role only

router.route('/users')
  .get(getAllUsers);

router.route('/users/:id')
  .delete(deleteUser);

router.put('/users/:id/role', updateUserRole);
router.get('/stats', getSystemStats);
router.get('/audit-logs', getSystemAuditLogs);

module.exports = router;
