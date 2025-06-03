const UserSettingsSchema = new Schema({
  account: {
    name: String,
    bio: String,
    location: String,
    website: String,
    profileVisibility: {
      type: String,
      enum: ['public', 'private', 'connections'],
      default: 'public',
    },
  },
  privacy: {
    onlineStatusVisibility: {
      type: String,
      enum: ['public', 'connections', 'none'],
      default: 'public',
    },
    messagePermissions: {
      type: String,
      enum: ['everyone', 'connections', 'nobody'],
      default: 'everyone',
    },
    profileSearchability: {
      type: String,
      enum: ['searchable', 'connections-only', 'hidden'],
      default: 'searchable',
    },
    activityVisibility: {
      type: String,
      enum: ['public', 'connections', 'private'],
      default: 'public',
    },
  },
  notifications: {
    pushEnabled: {
      type: Boolean,
      default: true,
    },
    emailDigest: {
      type: String,
      enum: ['none', 'daily', 'weekly'],
      default: 'none',
    },
    preferences: {
      likes: { type: Boolean, default: true },
      comments: { type: Boolean, default: true },
      mentions: { type: Boolean, default: true },
      messages: { type: Boolean, default: true },
      hireRequests: { type: Boolean, default: true },
      newFollowers: { type: Boolean, default: true },
    },
  },
  display: {
    theme: {
      type: String,
      enum: ['light', 'dark', 'system'],
      default: 'system',
    },
    fontSize: {
      type: String,
      enum: ['small', 'medium', 'large'],
      default: 'medium',
    },
    reduceAnimations: {
      type: Boolean,
      default: false,
    },
    highContrastMode: {
      type: Boolean,
      default: false,
    },
    autoplayMedia: {
      type: Boolean,
      default: true,
    },
  },
  security: {
    twoFactorAuthEnabled: {
      type: Boolean,
      default: false,
    },
    loginNotifications: {
      type: Boolean,
      default: true,
    },
  },
  hiring: {
    availableForHire: {
      type: Boolean,
      default: false,
    },
    displayRatesPublicly: {
      type: Boolean,
      default: false,
    },
    rates: {
      hourly: Number,
      fixed: Number,
      currency: {
        type: String,
        default: 'USD',
      },
    },
    skills: [String],
    servicesOffered: [String],
    preferredPaymentMethods: [String],
  },
});
