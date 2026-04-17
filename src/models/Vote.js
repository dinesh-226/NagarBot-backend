const mongoose = require('mongoose');

const voteSchema = new mongoose.Schema({
  issue: { type: mongoose.Schema.Types.ObjectId, ref: 'Issue', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

voteSchema.index({ issue: 1, user: 1 }, { unique: true });

module.exports = mongoose.model('Vote', voteSchema);
