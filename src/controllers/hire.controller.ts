import { Request, Response } from 'express';
import { HireRequest, HireRequestStatus } from '../models/hire-request.model';
import { user as User } from '../models/user.model';
import { Types } from 'mongoose';
import notificationService from '../services/notification.service';
import { NotificationType } from '../models/notification.model';
import { socketService } from '../services/socket.service';
import { presenceService } from '../services/presence.service';

// Send a hire request
export const sendHireRequest = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const clientId = (req as any).user.userId;
    const { providerId, description, budget, timeline } = req.body;

    // Validate that provider exists and is of correct type (individual or business)
    const provider = await User.findById(providerId);
    if (!provider) {
      res.status(404).json({
        success: false,
        message: 'Provider not found',
      });
      return;
    }

    // Create hire request
    const hireRequest = new HireRequest({
      client: clientId,
      provider: providerId,
      description,
      budget,
      timeline,
      status: HireRequestStatus.PENDING,
    });

    await hireRequest.save();

    // Send real-time notification to provider
    await notificationService.createNotification({
      recipient: providerId,
      sender: clientId,
      type: NotificationType.HIRE_REQUEST,
      content: `sent you a hire request: "${description.substring(0, 50)}${
        description.length > 50 ? '...' : ''
      }"`,
      reference: {
        type: 'user',
        id: (hireRequest._id as Types.ObjectId).toString(),
      },
    });

    // Get populated hire request to return
    const populatedRequest = await HireRequest.findById(hireRequest._id)
      .populate('client', 'name profilePic')
      .populate('provider', 'name profilePic');

    res.status(201).json({
      success: true,
      message: 'Hire request sent successfully',
      data: populatedRequest,
    });
  } catch (error) {
    console.error('Error sending hire request:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while sending hire request',
    });
  }
};

// Get hire requests for current user (as client)
export const getClientHireRequests = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;
    const status = req.query.status as HireRequestStatus | undefined;

    const query = {
      client: userId,
      ...(status ? { status } : {}),
    };

    const [hireRequests, total] = await Promise.all([
      HireRequest.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('provider', 'name profilePic')
        .populate('client', 'name profilePic'),
      HireRequest.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: {
        hireRequests,
        pagination: {
          total,
          page,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error('Error fetching client hire requests:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching hire requests',
    });
  }
};

// Get hire requests for current user (as provider)
export const getProviderHireRequests = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;
    const status = req.query.status as HireRequestStatus | undefined;

    const query = {
      provider: userId,
      ...(status ? { status } : {}),
    };

    const [hireRequests, total] = await Promise.all([
      HireRequest.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('client', 'name profilePic')
        .populate('provider', 'name profilePic'),
      HireRequest.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: {
        hireRequests,
        pagination: {
          total,
          page,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error('Error fetching provider hire requests:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching hire requests',
    });
  }
};

// Update hire request status (accept/decline/etc)
export const updateHireRequestStatus = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { requestId } = req.params;
    const { status } = req.body;
    const userId = (req as any).user.userId;

    if (!Object.values(HireRequestStatus).includes(status)) {
      res.status(400).json({
        success: false,
        message: 'Invalid status',
      });
      return;
    }

    // Find the hire request
    const hireRequest = await HireRequest.findById(requestId);

    if (!hireRequest) {
      res.status(404).json({
        success: false,
        message: 'Hire request not found',
      });
      return;
    }

    // Check authorization - only provider can update status
    if (hireRequest.provider.toString() !== userId) {
      res.status(403).json({
        success: false,
        message: 'Not authorized to update this hire request',
      });
      return;
    }

    // Update status
    hireRequest.status = status;
    await hireRequest.save();

    // Send notification to client about status change
    const statusMessage =
      status === 'accepted'
        ? 'accepted your hire request'
        : status === 'declined'
          ? 'declined your hire request'
          : `marked your hire request as ${status}`;

    await notificationService.createNotification({
      recipient: hireRequest.client.toString(),
      sender: userId,
      type: NotificationType.HIRE_REQUEST,
      content: statusMessage,
      reference: {
        type: 'user',
        id: (hireRequest._id as Types.ObjectId).toString(),
      },
    });

    // Get populated hire request to return
    const populatedRequest = await HireRequest.findById(requestId)
      .populate('client', 'name profilePic')
      .populate('provider', 'name profilePic');

    res.status(200).json({
      success: true,
      message: `Hire request ${status} successfully`,
      data: populatedRequest,
    });
  } catch (error) {
    console.error('Error updating hire request:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating hire request',
    });
  }
};

// Get a single hire request
export const getHireRequest = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { requestId } = req.params;
    const userId = (req as any).user.userId;

    const hireRequest = await HireRequest.findById(requestId)
      .populate('client', 'name profilePic')
      .populate('provider', 'name profilePic');

    if (!hireRequest) {
      res.status(404).json({
        success: false,
        message: 'Hire request not found',
      });
      return;
    }

    // Check if user is either the client or provider
    if (
      hireRequest.client.toString() !== userId &&
      hireRequest.provider.toString() !== userId
    ) {
      res.status(403).json({
        success: false,
        message: 'Not authorized to view this hire request',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: hireRequest,
    });
  } catch (error) {
    console.error('Error fetching hire request:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching hire request',
    });
  }
};

// Quick hire endpoint - simplified hiring process
export const quickHire = async (req: Request, res: Response): Promise<void> => {
  try {
    const clientId = (req as any).user.userId;
    const { providerId, message } = req.body;

    // Validate that provider exists
    const provider = await User.findById(providerId);
    if (!provider) {
      res.status(404).json({
        success: false,
        message: 'Provider not found',
      });
      return;
    }

    // Create a simplified hire request
    const hireRequest = new HireRequest({
      client: clientId,
      provider: providerId,
      description: message || "I'd like to hire you for your services",
      status: HireRequestStatus.PENDING,
    });

    await hireRequest.save();

    // Send real-time notification to provider
    await notificationService.createNotification({
      recipient: providerId,
      sender: clientId,
      type: NotificationType.HIRE_REQUEST,
      content: `wants to hire you${message ? `: "${message.substring(0, 50)}${message.length > 50 ? '...' : ''}"` : ''}`,
      reference: {
        type: 'user',
        id: (hireRequest._id as Types.ObjectId).toString(),
      },
    });

    // Get client info to return
    const client = await User.findById(clientId).select('name profilePic');

    res.status(201).json({
      success: true,
      message: 'Hire request sent successfully',
      data: {
        requestId: hireRequest._id,
        provider: {
          _id: provider._id,
          name: provider.name,
          profilePic: provider.profilePic,
        },
        client,
        status: hireRequest.status,
        createdAt: hireRequest.createdAt,
      },
    });
  } catch (error) {
    console.error('Error sending quick hire request:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while sending hire request',
    });
  }
};

// Hire button endpoint - for profile pages
export const hireButton = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const clientId = (req as any).user.userId;
    const { providerId } = req.params;

    // Check if provider exists and is available for hire
    const provider = await User.findById(providerId);
    if (!provider) {
      res.status(404).json({
        success: false,
        message: 'Provider not found',
      });
      return;
    }

    // Check if provider is available for hire
    if (provider.hiringSettings?.availableForHire === false) {
      res.status(400).json({
        success: false,
        message: 'This user is not currently available for hire',
      });
      return;
    }

    // Create a hire request
    const hireRequest = new HireRequest({
      client: clientId,
      provider: providerId,
      description: "I'm interested in hiring you from your profile",
      status: HireRequestStatus.PENDING,
    });

    await hireRequest.save();

    // Send real-time notification with high priority
    await notificationService.createNotification({
      recipient: providerId,
      sender: clientId,
      type: NotificationType.HIRE_REQUEST,
      content: 'wants to hire you from your profile',
      reference: {
        type: 'user',
        id: (hireRequest._id as Types.ObjectId).toString(),
      },
    });

    // Check if user is online for immediate response
    const isOnline = await presenceService.isUserOnline(providerId);

    res.status(201).json({
      success: true,
      message: 'Hire request sent successfully',
      data: {
        requestId: hireRequest._id,
        providerOnline: isOnline,
        provider: {
          _id: provider._id,
          name: provider.name,
          profilePic: provider.profilePic,
        },
        status: hireRequest.status,
      },
    });
  } catch (error) {
    console.error('Error sending hire request:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while sending hire request',
    });
  }
};
