import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { IIndividualUser } from '../models/individual.model';
import { IBusinessUser } from '../models/business.model';

// Individual User Registration Validation Schema
export const individualRegistrationSchema = Joi.object({
  name: Joi.string().required().trim().min(2).max(50).messages({
    'string.empty': 'Name is required',
    'string.min': 'Name must be at least 2 characters long',
    'string.max': 'Name cannot exceed 50 characters',
  }),
  email: Joi.string().required().email().messages({
    'string.empty': 'Email is required',
    'string.email': 'Please provide a valid email address',
  }),
  password: Joi.string()
    .required()
    .min(8)
    .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])'))
    .messages({
      'string.empty': 'Password is required',
      'string.min': 'Password must be at least 8 characters long',
      'string.pattern.base':
        'Password must contain at least one uppercase letter, one lowercase letter, and one number',
    }),
  profilePicture: Joi.string().uri().optional(),
  bio: Joi.string().optional().max(500),
  location: Joi.object({
    city: Joi.string().required(),
    state: Joi.string().required(),
    country: Joi.string().required(),
    coordinates: Joi.object({
      lat: Joi.number().optional(),
      lng: Joi.number().optional(),
    }).optional(),
  }).required(),
  userType: Joi.string().valid('individual').required(),
});

// Business User Registration Validation Schema
export const businessRegistrationSchema = Joi.object({
  name: Joi.string().required().trim().min(2).max(50).messages({
    'string.empty': 'Name is required',
    'string.min': 'Name must be at least 2 characters long',
    'string.max': 'Name cannot exceed 50 characters',
  }),
  email: Joi.string().required().email().messages({
    'string.empty': 'Email is required',
    'string.email': 'Please provide a valid email address',
  }),
  password: Joi.string()
    .required()
    .min(8)
    .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])'))
    .messages({
      'string.empty': 'Password is required',
      'string.min': 'Password must be at least 8 characters long',
      'string.pattern.base':
        'Password must contain at least one uppercase letter, one lowercase letter, and one number',
    }),
  companyName: Joi.string().required().trim().min(2).max(100).messages({
    'string.empty': 'Company name is required for business accounts',
    'string.min': 'Company name must be at least 2 characters long',
    'string.max': 'Company name cannot exceed 100 characters',
  }),
  companyEmail: Joi.string().required().email().messages({
    'string.empty': 'Company email is required for business accounts',
    'string.email': 'Please provide a valid company email address',
  }),
  profilePicture: Joi.string().uri().optional(),
  bio: Joi.string().optional().max(1000),
  location: Joi.object({
    city: Joi.string().required(),
    state: Joi.string().required(),
    country: Joi.string().required(),
    coordinates: Joi.object({
      lat: Joi.number().optional(),
      lng: Joi.number().optional(),
    }).optional(),
  }).required(),
  website: Joi.string().uri().optional(),
  userType: Joi.string().valid('business').required(),
});

// Common fields for both user types
const commonUserFields = {
  name: Joi.string().required().trim().min(2).max(50).messages({
    'string.empty': 'Name is required',
    'string.min': 'Name must be at least 2 characters long',
    'string.max': 'Name cannot exceed 50 characters',
  }),
  email: Joi.string().required().email().messages({
    'string.empty': 'Email is required',
    'string.email': 'Please provide a valid email address',
  }),
  password: Joi.string()
    .required()
    .min(8)
    .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])'))
    .messages({
      'string.empty': 'Password is required',
      'string.min': 'Password must be at least 8 characters long',
      'string.pattern.base':
        'Password must contain at least one uppercase letter, one lowercase letter, and one number',
    }),
  profilePicture: Joi.string().uri().optional(),
  bio: Joi.string().optional().max(500),
  location: Joi.object({
    city: Joi.string().required(),
    state: Joi.string().required(),
    country: Joi.string().required(),
    coordinates: Joi.object({
      lat: Joi.number().optional(),
      lng: Joi.number().optional(),
    }).optional(),
  }).required(),
  userType: Joi.string().valid('individual', 'business').required().messages({
    'string.empty': 'User type is required',
    'any.only': 'User type must be either individual or business',
  }),
};

// Updated schemas with conditional validation based on userType
export const signupSchema = Joi.object({
  ...commonUserFields,
  // Business-specific fields (required only when userType is business)
  companyName: Joi.when('userType', {
    is: 'business',
    then: Joi.string().required().trim().min(2).max(100).messages({
      'string.empty': 'Company name is required for business accounts',
      'string.min': 'Company name must be at least 2 characters long',
      'string.max': 'Company name cannot exceed 100 characters',
    }),
    otherwise: Joi.optional(),
  }),
  companyEmail: Joi.when('userType', {
    is: 'business',
    then: Joi.string().required().email().messages({
      'string.empty': 'Company email is required for business accounts',
      'string.email': 'Please provide a valid company email address',
    }),
    otherwise: Joi.optional(),
  }),
  website: Joi.when('userType', {
    is: 'business',
    then: Joi.string().uri().optional(),
    otherwise: Joi.optional(),
  }),
});

// Middleware for validating signup - fixed return type for Express compatibility
export const validateSignup = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const { error } = signupSchema.validate(req.body, { abortEarly: false });

  if (error) {
    const errorMessage = error.details
      .map((detail) => detail.message)
      .join(', ');
    res.status(400).json({ success: false, message: errorMessage });
    return;
  }

  next();
};

// Login Validation Schema (Common for both user types)
export const loginSchema = Joi.object({
  email: Joi.string().required().email().messages({
    'string.empty': 'Email is required',
    'string.email': 'Please provide a valid email address',
  }),
  password: Joi.string().required().messages({
    'string.empty': 'Password is required',
  }),
});

// Password Reset Request Validation Schema
export const passwordResetRequestSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email address',
    'string.empty': 'Email is required',
  }),
});

// Password Reset Validation Schema
export const passwordResetSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email address',
    'string.empty': 'Email is required',
  }),
  code: Joi.string().length(4).required().messages({
    'string.empty': 'Reset code is required',
    'string.length': 'Reset code must be 4 digits',
  }),
  newPassword: Joi.string()
    .required()
    .min(8)
    .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])'))
    .messages({
      'string.empty': 'New password is required',
      'string.min': 'New password must be at least 8 characters long',
      'string.pattern.base':
        'New password must contain at least one uppercase letter, one lowercase letter, and one number',
    }),
  confirmPassword: Joi.string()
    .valid(Joi.ref('newPassword'))
    .required()
    .messages({
      'any.only': 'Passwords do not match',
      'string.empty': 'Please confirm your password',
    }),
});

// Middleware for validating login
export const validateLogin = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const { error } = loginSchema.validate(req.body, { abortEarly: false });

  if (error) {
    const errorMessage = error.details
      .map((detail) => detail.message)
      .join(', ');
    res.status(400).json({ success: false, message: errorMessage });
    return;
  }

  next();
};

// Middleware for validating password reset request
export const validatePasswordResetRequest = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const { error } = passwordResetRequestSchema.validate(req.body, {
    abortEarly: false,
  });

  if (error) {
    const errorMessage = error.details
      .map((detail) => detail.message)
      .join(', ');
    res.status(400).json({ success: false, message: errorMessage });
    return;
  }

  next();
};

// Middleware for validating password reset
export const validatePasswordReset = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const { error } = passwordResetSchema.validate(req.body, {
    abortEarly: false,
  });

  if (error) {
    const errorMessage = error.details
      .map((detail) => detail.message)
      .join(', ');
    res.status(400).json({ success: false, message: errorMessage });
    return;
  }

  next();
};

// Add this to your existing schemas
export const passwordChangeSchema = Joi.object({
  currentPassword: Joi.string().required().min(8).messages({
    'string.empty': 'Current password is required',
    'string.min': 'Current password must be at least 8 characters long',
  }),
  newPassword: Joi.string()
    .required()
    .min(8)
    .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])'))
    .messages({
      'string.empty': 'New password is required',
      'string.min': 'New password must be at least 8 characters long',
      'string.pattern.base':
        'New password must contain at least one uppercase letter, one lowercase letter, and one number',
    }),
  confirmPassword: Joi.string()
    .valid(Joi.ref('newPassword'))
    .required()
    .messages({
      'any.only': 'Passwords do not match',
      'string.empty': 'Please confirm your password',
    }),
});
