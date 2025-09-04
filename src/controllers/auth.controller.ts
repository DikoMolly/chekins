import { Request, Response } from 'express';
import { IndividualUser } from '../models/individual.model';
import { BusinessUser } from '../models/business.model';
import { Role } from '../models/role.model';
import { user as User } from '../models/user.model';
import {
  individualRegistrationSchema,
  businessRegistrationSchema,
  loginSchema,
  passwordChangeSchema,
} from '../validators/auth.validator';

import { sendVerificationEmail } from '../utils/sendVerificationEmail';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import {
  generateToken,
  generateRefreshToken,
  verifyToken,
} from '../utils/jwt.utils';

export const signUp = async (req: Request, res: Response): Promise<void> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // First, determine if this is an individual or business signup
    const { userType } = req.body;

    if (!userType) {
      res.status(400).json({
        success: false,
        message: 'userType is required (individual or business)',
      });
      return;
    }

    // Validate based on user type
    let validationError;
    if (userType === 'individual') {
      const { error } = individualRegistrationSchema.validate(req.body);
      validationError = error;
    } else if (userType === 'business') {
      const { error } = businessRegistrationSchema.validate(req.body);
      validationError = error;
    } else {
      res.status(400).json({
        success: false,
        message: 'userType must be either individual or business',
      });
      return;
    }

    if (validationError) {
      res.status(400).json({
        success: false,
        message: validationError.details[0].message,
      });
      return;
    }

    // Extract common fields
    const { name, email, password, profilePicture, bio, location, hiringSettings } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(400).json({
        success: false,
        message: 'Email already exists',
      });
      return;
    }

    // Get or create the role
    const roleName = userType === 'individual' ? 'individual' : 'business';
    console.log('Looking for role with name:', roleName);
    const role = await Role.findOne({ name: roleName });
    console.log('Found role:', role);

    if (!role) {
      throw new Error(
        `Role "${roleName}" does not exist. Please seed roles first.`,
      );
    }

    // Also add this to check all available roles
    const allRoles = await Role.find({});
    console.log('All available roles:', allRoles);

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const verificationCode = Math.floor(1000 + Math.random() * 9000).toString();
    const verificationCodeExpires = new Date();
    verificationCodeExpires.setHours(verificationCodeExpires.getHours() + 1);

    // Create base user
    const newUser = await User.create({
      name,
      email,
      password: hashedPassword,
      role: role._id,
      verificationCode,
      verificationCodeExpires,
      location,
      hiringSettings: {
        skills: hiringSettings?.skills || [], // ✅ Add this
        servicesOffered: []
      }
    });

    await sendVerificationEmail(email, verificationCode);

    let profileData;

    // Create the specific profile based on user type
    if (userType === 'individual') {
      // Create individual profile
      const individualProfile = await IndividualUser.create({
        user: newUser._id,
        name: name,
        profilePicture,
        bio,
        location,
      });

      // Link profile back to user
      await User.findByIdAndUpdate(newUser._id, {
        $set: { individualProfile: individualProfile._id },
      });

      profileData = individualProfile;
    } else {
      // Extract business-specific fields
      const { companyName, companyEmail, website } = req.body;

      // Create business profile
      const businessProfile = await BusinessUser.create({
        user: newUser._id,
        companyName,
        companyEmail,
        profilePicture,
        bio,
        location,
        website,
        isVerified: false,
      });

      // Link profile back to user
      await User.findByIdAndUpdate(newUser._id, {
        $set: { businessProfile: businessProfile._id },
      });

      profileData = businessProfile;
    }

    await session.commitTransaction();

    const accessToken = generateToken({
      userId: newUser._id,
      email: newUser.email,
      role: role,
    });

    const refreshToken = generateRefreshToken({
      userId: newUser._id,
    });

    // Create response object without password
    const userResponse = {
      ...newUser.toObject(),
      password: undefined,
      profile: profileData,
    };

    res.status(201).json({
      success: true,
      message: `${roleName} user created successfully`,
      data: {
        user: userResponse,
        tokens: {
          accessToken,
          refreshToken,
        },
      },
    });
  } catch (error) {
    await session.abortTransaction();
    console.error('Error in signup:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during registration',
    });
  } finally {
    session.endSession();
  }
};

export const verifyEmail = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { email, code } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    if (user.isVerified) {
      res.status(400).json({
        success: false,
        message: 'Email already verified',
      });
      return;
    }

    if (user.verificationCode !== code) {
      res.status(400).json({
        success: false,
        message: 'Invalid verification code',
      });
      return;
    }

    if (user.verificationCodeExpires < new Date()) {
      res.status(400).json({
        success: false,
        message: 'Verification code has expired',
      });
      return;
    }

    // Update user as verified
    user.isVerified = true;
    user.verificationCode = '';
    user.verificationCodeExpires = new Date();
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Email verified successfully',
    });
  } catch (error) {
    console.error('Error verifying email:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during email verification',
    });
  }
};

export const loginUser = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  try {
    let validationError;
    const { error } = loginSchema.validate(req.body);
    validationError = error;
    if (validationError) {
      res.status(400).json({
        success: false,
        message: validationError.details[0].message,
      });
      return;
    }

    // Find user and populate role
    const user = await User.findOne({ email }).populate('role');
    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
      return;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
      return;
    }

    // Check if user is verified
    // if (!user.isVerified) {
    //   res.status(401).json({
    //     success: false,
    //     message: 'Please verify your email before logging in',
    //   });
    //   return;
    // }

    // Generate tokens
    const accessToken = generateToken({
      userId: user._id,
      email: user.email,
      role: user.role,
    });

    const refreshToken = generateRefreshToken({
      userId: user._id,
    });

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        tokens: {
          accessToken,
          refreshToken,
        },
      },
    });
  } catch (error) {
    console.error('Error in login:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login',
    });
  }
};

// Add refresh token endpoint
export const refreshAccessToken = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({
        success: false,
        message: 'Refresh token is required',
      });
      return;
    }

    // Verify refresh token
    const decoded = verifyToken(refreshToken) as { userId: string };

    // Find user
    const user = await User.findById(decoded.userId).populate('role');
    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Invalid refresh token',
      });
      return;
    }

    // Generate new access token
    const accessToken = generateToken({
      userId: user._id,
      email: user.email,
      role: user.role,
    });

    res.status(200).json({
      success: true,
      data: {
        accessToken,
      },
    });
  } catch (error) {
    console.error('Error refreshing token:', error);
    res.status(401).json({
      success: false,
      message: 'Invalid refresh token',
    });
  }
};

export const changePassword = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = (req as any).user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    // Validate password requirements
    const { error } = passwordChangeSchema.validate(req.body);
    if (error) {
      res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
      return;
    }

    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password,
    );
    if (!isPasswordValid) {
      res.status(401).json({
        success: false,
        message: 'Current password is incorrect',
      });
      return;
    }

    // Check if new password is the same as current
    if (currentPassword === newPassword) {
      res.status(400).json({
        success: false,
        message: 'New password must be different from current password',
      });
      return;
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update the password
    user.password = hashedPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during password change',
    });
  }
};

export const requestPasswordReset = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { email } = req.body;

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      // For security reasons, don't reveal that the email doesn't exist
      res.status(200).json({
        success: true,
        message:
          'If your email is registered, you will receive a password reset code',
      });
      return;
    }

    // Generate reset code
    const resetCode = Math.floor(1000 + Math.random() * 9000).toString();
    const resetCodeExpires = new Date();
    resetCodeExpires.setHours(resetCodeExpires.getHours() + 1); // 1 hour expiry

    // Save reset code to user
    user.verificationCode = resetCode;
    user.verificationCodeExpires = resetCodeExpires;
    await user.save();

    // Send reset email
    await sendVerificationEmail(email, resetCode);

    res.status(200).json({
      success: true,
      message:
        'If your email is registered, you will receive a password reset code',
    });
  } catch (error) {
    console.error('Error requesting password reset:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during password reset request',
    });
  }
};

export const resetPassword = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { email, code, newPassword } = req.body;

    // Find user by email
    const user = await User.findOne({
      email,
      verificationCode: code,
      verificationCodeExpires: { $gt: new Date() },
    });

    if (!user) {
      res.status(400).json({
        success: false,
        message: 'Invalid or expired reset code',
      });
      return;
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user's password and clear reset code
    user.password = hashedPassword;
    user.verificationCode = '';
    user.verificationCodeExpires = new Date();
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password reset successfully',
    });
  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during password reset',
    });
  }
};
