const jwt = require('jsonwebtoken');
const User = require('../models/User.model');
const { sendSMS } = require('../services/sms.service');
const { OAuth2Client } = require('google-auth-library');

const client = new OAuth2Client(process.env.CLIENT_ID);

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

// POST /api/auth/register
const register = async (req, res) => {
  console.log(`\n[Auth] Registration attempt for email: ${req.body.email}`);
  try {
    const { name, email, password, phone, role } = req.body;

    // 1. Check for existing user
    const exists = await User.findOne({ email });
    if (exists) {
      console.log(`[Auth] Registration failed: Email ${email} already exists.`);
      return res.status(400).json({ message: 'Email already registered.' });
    }

    // 2. Assign Role
    const assignedRole = role && ['technician', 'admin'].includes(role) ? role : 'customer';
    console.log(`[Auth] Assigning role: ${assignedRole}`);

    // 3. Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // 4. Create User in DB
    console.log(`[Auth] Creating user record...`);
    const user = await User.create({
      name, email, password, phone, role: assignedRole,
      verificationOTP: otp,
      otpExpiresAt
    });
    console.log(`[Auth] User created successfully. ID: ${user._id}`);

    // 5. Send OTP via SMS
    console.log(`[Auth] Attempting to send SMS OTP to: ${phone}`);
    try {
      await sendSMS(phone, `Your DriveStream verification code is: ${otp}.`);
      console.log(`[Auth] SMS sent successfully.`);
    } catch (smsErr) {
      console.error("[Auth] SMS Error (Non-blocking):", smsErr.message);
    }

    res.status(201).json({
      message: 'Registration successful. Please verify your phone number.',
      userId: user._id,
      phone: user.phone
    });
  } catch (err) {
    console.error(`\n❌ [Auth] CRITICAL ERROR during registration:`);
    console.error(`Path: ${req.path}`);
    console.error(`Message: ${err.message}`);
    console.error(`Stack: ${err.stack}\n`);
    res.status(500).json({ message: "Internal Server Error", detail: err.message });
  }
};

// POST /api/auth/login
const login = async (req, res) => {
  const { email, password } = req.body;
  console.log(`\n[Auth] Login attempt: ${email}`);

  try {
    // 1. Validation
    if (!email || !password) {
      console.log(`[Auth] Login failed: Missing credentials.`);
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    // 2. Find User
    const user = await User.findOne({ email });
    if (!user) {
      console.log(`[Auth] Login failed: User not found (${email}).`);
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    // 3. Check Password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      console.log(`[Auth] Login failed: Incorrect password for ${email}.`);
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    // 4. Check Verification Status
    if (!user.isVerified) {
      console.log(`[Auth] Login blocked: ${email} is not verified yet.`);
      return res.status(403).json({
        message: 'Your phone number is not verified.',
        needsVerification: true,
        userId: user._id,
        phone: user.phone
      });
    }

    // 5. Check if Active
    if (!user.isActive) {
      console.log(`[Auth] Login blocked: ${email} is deactivated.`);
      return res.status(403).json({ message: 'Your account has been deactivated. Please contact support.' });
    }

    // 6. Success - Generate Token
    const token = generateToken(user._id);
    console.log(`[Auth] Login SUCCESS: ${email} (Role: ${user.role})`);

    res.json({
      message: 'Login successful',
      token,
      user
    });

  } catch (err) {
    console.error(`\n❌ [Auth] CRITICAL ERROR during login:`);
    console.error(`Message: ${err.message}`);
    res.status(500).json({ message: "Internal server error during login" });
  }
};

// GET /api/auth/me
const getMe = async (req, res) => {
  res.json({ user: req.user });
};

// POST /api/auth/create-staff  (admin only)
const createStaff = async (req, res) => {
  console.log(`\n[Admin] Role Creation attempt by: ${req.user.email} (SuperAdmin: ${req.user.isSuperAdmin})`);
  try {
    const { name, email, phone, role } = req.body;
    
    // Tiered Hierarchy Check
    if (role === 'admin' && !req.user.isSuperAdmin) {
      console.log(`[Admin] Security Alert: Non-SuperAdmin tried to create an Admin.`);
      return res.status(403).json({ 
        message: 'Permission Denied: Only Senior Managers can onboard new Service Administrators.' 
      });
    }

    if (!['technician', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Role must be technician or admin.' });
    }

    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: 'Email already registered.' });

    // Generate a temporary setup token (different from OTP)
    const setupToken = Math.random().toString(36).substring(2, 10).toUpperCase();

    const user = await User.create({
      name,
      email,
      phone,
      role,
      isVerified: false,
      password: Math.random().toString(36), // Temp random password
      verificationOTP: setupToken, // We'll reuse this field for setup
      otpExpiresAt: Date.now() + 24 * 60 * 60 * 1000 // 24 hours to setup
    });

    console.log(`[Admin] Staff created. Setup Token: ${setupToken}`);

    // Send the Invitation SMS
    try {
      const msg = `DriveStream: You've been added as ${role.toUpperCase()}. Use code ${setupToken} to set up your account password.`;
      await sendSMS(phone, msg);
    } catch (_) { }

    res.status(201).json({ message: 'Staff account created and invitation sent.', user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/auth/setup-staff-password
const setupStaffPassword = async (req, res) => {
  const { setupToken, email, newPassword } = req.body;
  console.log(`\n[Auth] Staff setup attempt for: ${email}`);

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'Staff account not found.' });

    if (user.isVerified) return res.status(400).json({ message: 'Account is already set up.' });

    if (user.verificationOTP !== setupToken) {
      return res.status(400).json({ message: 'Invalid setup token.' });
    }

    if (Date.now() > user.otpExpiresAt) {
      return res.status(400).json({ message: 'Setup token has expired. Please contact your manager.' });
    }

    user.password = newPassword;
    user.isVerified = true;
    user.verificationOTP = undefined;
    user.otpExpiresAt = undefined;
    await user.save();

    console.log(`[Auth] Staff setup SUCCESS for: ${email}`);
    res.json({ message: 'Account set up successfully. You can now login.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/auth/verify-otp
const verifyOTP = async (req, res) => {
  try {
    const { userId, otp } = req.body;
    const user = await User.findById(userId);

    if (!user) return res.status(404).json({ message: 'User not found.' });
    if (user.isVerified) return res.status(400).json({ message: 'User is already verified.' });

    if (user.verificationOTP !== otp) {
      return res.status(400).json({ message: 'Invalid verification code.' });
    }

    if (new Date() > user.otpExpiresAt) {
      return res.status(400).json({ message: 'Verification code has expired.' });
    }

    user.isVerified = true;
    user.verificationOTP = undefined;
    user.otpExpiresAt = undefined;
    await user.save();

    const token = generateToken(user._id);
    res.json({ message: 'Phone number verified successfully!', token, user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/auth/forgot-password
const forgotPassword = async (req, res) => {
  const { email } = req.body;
  console.log(`\n[Auth] Password reset requested for: ${email}`);

  try {
    const user = await User.findOne({ email });
    if (!user) {
      console.log(`[Auth] Reset failed: Email not found.`);
      return res.status(404).json({ message: 'No account found with that email address.' });
    }

    const resetOtp = Math.floor(100000 + Math.random() * 900000).toString();
    user.resetPasswordOTP = resetOtp;
    user.resetPasswordExpires = Date.now() + 10 * 60 * 1000; // 10 mins
    await user.save();

    console.log(`[Auth] Reset OTP generated. Sending to: ${user.phone}`);
    try {
      await sendSMS(user.phone, `Your DriveStream password reset code is: ${resetOtp}`);
    } catch (_) { }

    res.json({ message: 'Reset code sent to your registered phone number.', userId: user._id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/auth/reset-password
const resetPassword = async (req, res) => {
  const { userId, otp, newPassword } = req.body;
  console.log(`\n[Auth] Attempting password reset for UserID: ${userId}`);

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found.' });

    if (!user.resetPasswordOTP || user.resetPasswordOTP !== otp) {
      return res.status(400).json({ message: 'Invalid reset code.' });
    }

    if (Date.now() > user.resetPasswordExpires) {
      return res.status(400).json({ message: 'Reset code has expired.' });
    }

    // Update password (will be hashed automatically by userSchema pre-save hook)
    user.password = newPassword;
    user.resetPasswordOTP = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    console.log(`[Auth] Password reset SUCCESS for: ${user.email}`);
    res.json({ message: 'Password has been reset successfully. You can now login.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/auth/google
const googleLogin = async (req, res) => {
  const { credential } = req.body;
  console.log(`\n[Auth] Google Login attempt...`);

  try {
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.CLIENT_ID,
    });
    const { sub, email, name, picture } = ticket.getPayload();
    console.log(`[Auth] Google Token Verified: ${email} (ID: ${sub})`);

    let user = await User.findOne({ $or: [{ googleId: sub }, { email }] });

    if (!user) {
      console.log(`[Auth] Creating new customer via Google: ${email}`);
      // Create new customer
      user = await User.create({
        name,
        email,
        googleId: sub,
        avatar: picture,
        role: 'customer',
        isVerified: true,
        password: Math.random().toString(36).substring(7), // Random password for schema requirement
      });
    } else {
      console.log(`[Auth] Existing user found: ${user.email}`);
      // Update googleId/avatar if missing
      let updated = false;
      if (!user.googleId)   { user.googleId = sub; updated = true; }
      if (!user.avatar)     { user.avatar = picture; updated = true; }
      if (!user.isVerified) { user.isVerified = true; updated = true; } // Google verified email
      
      if (updated) await user.save();
    }

    if (!user.isActive) {
      return res.status(403).json({ message: 'Your account has been deactivated.' });
    }

    const token = generateToken(user._id);
    const needsPhone = !user.phone;
    res.json({ message: 'Login successful', token, user, needsPhone });
  } catch (err) {
    console.error(`\n❌ [Auth] Google Auth Error:`, err.message);
    res.status(400).json({ message: "Google Authentication failed", detail: err.message });
  }
};

// POST /api/auth/complete-profile
const completeProfile = async (req, res) => {
  let { phone } = req.body;
  
  // Format phone for Sri Lanka (+94) if it starts with 0
  if (phone.startsWith('0')) {
    phone = '+94' + phone.substring(1);
  } else if (!phone.startsWith('+')) {
    phone = '+' + phone;
  }

  console.log(`\n[Auth] Profile completion for: ${req.user.email} (Formatted: ${phone})`);

  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found.' });

    // Generate OTP for phone verification
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    user.phone = phone;
    user.verificationOTP = otp;
    user.otpExpiresAt = otpExpiresAt;
    user.isVerified = false; // Require verification for the new phone
    await user.save();

    console.log(`[Auth] OTP generated for completion: ${otp}`);
    try {
      await sendSMS(phone, `Your DriveStream verification code is: ${otp}`);
    } catch (_) { }

    res.json({ message: 'Phone number updated. Please verify via OTP.', userId: user._id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/auth/resend-otp
const resendOTP = async (req, res) => {
  const { userId } = req.body;
  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found.' });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    user.verificationOTP = otp;
    user.otpExpiresAt = otpExpiresAt;
    await user.save();

    console.log(`[Auth] Resending OTP: ${otp} to ${user.phone}`);
    try {
      await sendSMS(user.phone, `Your DriveStream verification code is: ${otp}`);
    } catch (_) { }

    res.json({ message: 'Verification code resent successfully.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { 
  register, 
  login, 
  googleLogin,
  getMe, 
  createStaff, 
  verifyOTP, 
  forgotPassword, 
  resetPassword, 
  setupStaffPassword,
  completeProfile,
  resendOTP
};
