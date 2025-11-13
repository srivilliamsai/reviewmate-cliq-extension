import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    author: { type: String, required: true },
    filesChanged: { type: Number, required: true },
    linesChanged: { type: Number, required: true },
    prId: { type: String, required: true },
    prNumber: { type: Number, required: true },
    priority: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Low' },
    prUrl: { type: String, required: true },
    status: { type: String, enum: ['open', 'closed', 'merged'], required: true },
    repository: { type: String, required: true },
    title: { type: String, required: true },
    additions: { type: Number, default: 0 },
    deletions: { type: Number, default: 0 },
    description: { type: String },
    lastStatusNotified: { type: String },
    createdAt: { type: Date, default: Date.now }
  },
  {
    collection: 'reviews',
    timestamps: true
  }
);

reviewSchema.index({ prId: 1, user: 1 }, { unique: true });
reviewSchema.index({ user: 1, repository: 1 });

const Review = mongoose.models.Review || mongoose.model('Review', reviewSchema);

export default Review;
