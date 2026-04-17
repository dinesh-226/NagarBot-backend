const mongoose = require('mongoose');

const issueSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  category: { type: String, enum: ['Pothole', 'Streetlight', 'Garbage', 'Water', 'Construction', 'Other'], default: 'Other' },
  urgency: { type: Number, min: 1, max: 10, default: 5 },
  department: { type: String, default: 'General' },
  status: { type: String, enum: ['reported', 'in-progress', 'resolved'], default: 'reported' },
  location: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    address: { type: String },
  },
  imageUrl: { type: String },
  complainantLetter: { type: String },
  resolutionNote: { type: String },
  resolutionImageUrl: { type: String },
  refNumber: { type: String, unique: true },
  slaDeadline: { type: Date },
  estimatedDays: { type: Number, default: 7 },
  actionRequired: { type: String },
  aiSummary: { type: String },
  upvotes: { type: Number, default: 0 },
  reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  timeline: [{
    event: { type: String, required: true },
    note: { type: String },
    by: { type: String },
    at: { type: Date, default: Date.now },
  }],
}, { timestamps: true });

module.exports = mongoose.model('Issue', issueSchema);
