const mongoose = require('mongoose');

const reminderSchema = new mongoose.Schema({
  task: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  remindAt: {
    type: Date,
    required: [true, 'Reminder trigger time is required']
  },
  sent: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index to quickly search for unsent, expired reminders
reminderSchema.index({ sent: 1, remindAt: 1 });

module.exports = mongoose.model('Reminder', reminderSchema);
