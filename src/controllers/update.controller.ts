import { Request, Response } from 'express';
import { user as User } from '../models/user.model';
import { IndividualUser } from '../models/individual.model';
import { BusinessUser } from '../models/business.model';
import {
  individualUpdateSchema,
  businessUpdateSchema,
} from '../validators/update.validator';
import mongoose from 'mongoose';

const MAX_RETRIES = 3;

// Enhanced update with retry function that works with any model
const updateWithRetry = async (
  userId: mongoose.Types.ObjectId | string,
  updates: Record<string, any>,
  model: any, // Accept the model as a parameter
): Promise<any> => {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const profile = await model.findOne({ user: userId });

      // Check if profile exists
      if (!profile) {
        throw new Error('Profile not found');
      }

      const result = await model.findOneAndUpdate(
        { user: userId, version: profile.version },
        { $set: updates, $inc: { version: 1 } },
        { new: true },
      );

      if (result) return result;

      // If no document was updated, version has changed, so retry
      console.log(
        `Update conflict detected, retrying (${attempt + 1}/${MAX_RETRIES})...`,
      );
    } catch (error) {
      if (attempt === MAX_RETRIES - 1) throw error;
    }
  }

  throw new Error('Failed to update after maximum retry attempts');
};

export const updateProfile = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    // Find the user
    const userRecord = await User.findById(userId);
    if (!userRecord) {
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    // Check for individual profile first
    const individualProfile = await IndividualUser.findOne({ user: userId });
    if (individualProfile) {
      // User has an individual profile, update it
      await updateIndividualProfile(req, res, userRecord);
      return;
    }

    // Check for business profile
    const businessProfile = await BusinessUser.findOne({ user: userId });
    if (businessProfile) {
      // User has a business profile, update it
      await updateBusinessProfile(req, res, userRecord);
      return;
    }

    // If we get here, no profile was found
    res.status(404).json({
      success: false,
      message: 'No user profile found',
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during profile update',
    });
  }
};

const updateIndividualProfile = async (
  req: Request,
  res: Response,
  userRecord: any,
): Promise<void> => {
  try {
    const { error } = individualUpdateSchema.validate(req.body);
    if (error) {
      res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
      return;
    }

    const { name, profilePicture, bio } = req.body;

    // Update user name if provided
    if (name) {
      await User.findByIdAndUpdate(userRecord._id, { name });
      userRecord.name = name; // Update local object for response
    }

    // Prepare profile updates
    const updates: Record<string, any> = {};
    if (profilePicture) updates.profilePicture = profilePicture;
    if (bio) updates.bio = bio;

    // Only update if there are changes
    let updatedProfile = null;
    if (Object.keys(updates).length > 0) {
      try {
        // Use the updated retry function with IndividualUser model
        updatedProfile = await updateWithRetry(
          userRecord._id,
          updates,
          IndividualUser,
        );
      } catch (error) {
        console.error('Error with retry mechanism:', error);
        res.status(409).json({
          success: false,
          message:
            'Failed to update profile after multiple attempts. Please try again.',
        });
        return;
      }
    } else {
      // If no profile updates, just fetch current profile
      updatedProfile = await IndividualUser.findOne({ user: userRecord._id });
    }

    // Check if update succeeded
    if (!updatedProfile) {
      res.status(404).json({
        success: false,
        message: 'Profile not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: {
          _id: userRecord._id,
          name: userRecord.name,
          email: userRecord.email,
        },
        profile: updatedProfile,
      },
    });
  } catch (error) {
    console.error('Error updating individual profile:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during profile update',
    });
  }
};

const updateBusinessProfile = async (
  req: Request,
  res: Response,
  userRecord: any,
): Promise<void> => {
  try {
    const { error } = businessUpdateSchema.validate(req.body);
    if (error) {
      res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
      return;
    }

    const { name, profilePicture, bio, companyName, companyEmail } = req.body;

    // Update user name if provided
    if (name) {
      await User.findByIdAndUpdate(userRecord._id, { name });
      userRecord.name = name; // Update local object for response
    }

    // Prepare business profile updates
    const updates: Record<string, any> = {};
    if (profilePicture) updates.profilePicture = profilePicture;
    if (bio) updates.bio = bio;
    if (companyName) updates.companyName = companyName;
    if (companyEmail) updates.companyEmail = companyEmail;

    // Only update if there are changes
    let updatedProfile = null;
    if (Object.keys(updates).length > 0) {
      try {
        // Use the updated retry function with BusinessUser model
        updatedProfile = await updateWithRetry(
          userRecord._id,
          updates,
          BusinessUser,
        );
      } catch (error) {
        console.error('Error with retry mechanism:', error);
        res.status(409).json({
          success: false,
          message:
            'Failed to update profile after multiple attempts. Please try again.',
        });
        return;
      }
    } else {
      updatedProfile = await BusinessUser.findOne({ user: userRecord._id });
    }

    // Check if update succeeded
    if (!updatedProfile) {
      res.status(404).json({
        success: false,
        message: 'Profile not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Business profile updated successfully',
      data: {
        user: {
          _id: userRecord._id,
          name: userRecord.name,
          email: userRecord.email,
        },
        profile: updatedProfile,
      },
    });
  } catch (error) {
    console.error('Error updating business profile:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during profile update',
    });
  }
};
