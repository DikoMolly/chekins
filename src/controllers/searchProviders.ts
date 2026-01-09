import { Request, Response } from 'express';
import { user } from '../models/user.model';

export const searchUsers = async (req: Request, res: Response) => {
  try {
    const { skill, longitude, latitude, maxDistance = 10000 } = req.query;
    // maxDistance is in meters (default 10km)

    if (!skill) {
      return res.status(400).json({ message: 'Skill is required' });
    }

    if (!longitude || !latitude) {
      return res.status(400).json({ message: 'User location is required' });
    }

    const parsedLon = parseFloat(longitude as string);
    const parsedLat = parseFloat(latitude as string);

    const users = await user.find({
      "hiringSettings.skills": { $regex: skill, $options: 'i' }, // partial + case-insensitive
      location: {
        $near: {
          $geometry: { type: "Point", coordinates: [parsedLon, parsedLat] },
          $maxDistance: Number(maxDistance)
        }
      }
    })
    .select("name email profilePic hiringSettings skills location availability")
    .limit(50);

    if (users.length === 0) {
      return res.status(404).json({ message: 'No users found nearby with that skill' });
    }

    res.status(200).json({
      count: users.length,
      users,
    });

  } catch (error: any) {
    console.error("Error searching users:", error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
