const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name:     { type: String, required: true, trim: true },
    email:    { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6 },
    phone:    { type: String, trim: true },
    role:     { type: String, enum: ['customer', 'technician', 'admin'], default: 'customer' },
    isActive: { type: Boolean, default: true },
    isVerified:      { type: Boolean, default: false },
    verificationOTP: { type: String },
    otpExpiresAt:    { type: Date },
    resetPasswordOTP:     { type: String },
    resetPasswordExpires: { type: Date },
    isSuperAdmin:         { type: Boolean, default: false },
    googleId:             { type: String, unique: true, sparse: true },
    avatar:               { type: String },
  },
  { timestamps: true }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Remove password from JSON output
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
