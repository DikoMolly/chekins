import Joi from 'joi';

export const createPostSchema = Joi.object({
  description: Joi.string().trim().max(2000).required(),
  media: Joi.array().items(
    Joi.object({
      type: Joi.string().valid('image', 'video').required(),
      url: Joi.string().uri().required(),
      publicId: Joi.string().required(),
    }),
  ),
  // Note: The media validation is now included
});

export const updatePostSchema = Joi.object({
  description: Joi.string().trim().max(2000),
});
