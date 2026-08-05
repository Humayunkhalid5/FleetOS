const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Generate JWT for a user
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

// Helper to build the public user object returned to the client
const toPublicUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  address: user.address,
  role: user.role,
  plan: user.plan,
  avatar: user.avatar,
});

// @desc   Register a new user
// @route  POST /api/auth/register
exports.register = async (req, res) => {
  try {
    const { name, email, password, phone, address, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Please provide name, email and password' });
    }

    const userExists = await User.findOne({ email: email.toLowerCase() });
    if (userExists) {
      return res.status(400).json({ message: 'An account with that email already exists' });
    }

    const user = await User.create({ name, email, password, phone, address, role: role || 'customer' });

    const token = generateToken(user._id);
    return res.status(201).json({
      token,
      user: toPublicUser(user),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// @desc   Login user
// @route  POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    const user = await User._findWithPassword({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = generateToken(user._id);
    return res.json({
      token,
      user: toPublicUser(user),
      verified: Boolean(user.verified),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// @desc   Get current user (protected)
// @route  GET /api/auth/me
exports.getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    return res.json({ user });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// @desc   Update current user profile (protected)
// @route  PUT /api/auth/profile
exports.updateProfile = async (req, res) => {
  try {
    const { name, phone, address, plan, avatar, email } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Only apply fields that were actually sent (allows clearing a field to '')
    if (name !== undefined && name !== '') user.name = name;
    if (phone !== undefined) user.phone = phone;
    if (address !== undefined) user.address = address;
    if (plan !== undefined) user.plan = plan;
    if (avatar !== undefined && avatar !== '') user.avatar = avatar;

    // Email change — check uniqueness first
    if (email !== undefined && email && email !== user.email) {
      const exists = await User.findOne({ email: email.toLowerCase() });
      if (exists && exists._id !== user._id) {
        return res.status(400).json({ message: 'An account with that email already exists' });
      }
      user.email = email.toLowerCase();
    }

    const saved = await User.save(user);

    return res.json({
      user: toPublicUser(saved),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// @desc   Change current user password (protected)
// @route  POST /api/auth/change-password
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Please provide current and new password' });
    }
    if (String(newPassword).length < 8) {
      return res.status(400).json({ message: 'New password must be at least 8 characters' });
    }

    const user = await User._findWithPassword({ _id: req.user._id });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    user.password = newPassword;
    await User.save(user);

    return res.json({ message: 'Password changed successfully' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
