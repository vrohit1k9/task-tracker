const express = require('express');
const { getTasks, createTask, updateTask, deleteTask, markComplete, bulkUpdate, bulkDelete } = require('../controllers/taskController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect); // Secure all task routes

router.route('/')
  .get(getTasks)
  .post(createTask);

router.post('/bulk-update', bulkUpdate);
router.post('/bulk-delete', bulkDelete);

router.route('/:id')
  .put(updateTask)
  .delete(deleteTask);

router.patch('/:id/complete', markComplete);

module.exports = router;
