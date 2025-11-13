import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    githubToken: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
  },
  {
    collection: 'users'
  }
);

userSchema.methods.toSafeObject = function toSafeObject() {
  return {
    id: this._id.toString(),
    email: this.email,
    createdAt: this.createdAt
  };
};

const User = mongoose.models.User || mongoose.model('User', userSchema);

export default User;
