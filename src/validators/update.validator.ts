import Joi from 'joi';

export const individualUpdateSchema = Joi.object({
  name: Joi.string().min(2).max(100),
  profilePicture: Joi.string().uri(),
  bio: Joi.string().max(500),
}).min(1); // At least one field must be provided

export const businessUpdateSchema = Joi.object({
  name: Joi.string().min(2).max(100),
  profilePicture: Joi.string().uri(),
  bio: Joi.string().max(500),
  companyName: Joi.string().min(2).max(100),
  companyEmail: Joi.string().email(),
}).min(1); // At least one field must be provided 