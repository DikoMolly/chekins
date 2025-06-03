import { Role } from '../models/role.model';
import mongoose from 'mongoose';

export const seedRoles = async (): Promise<void> => {
  try {
    // Connect to MongoDB if not already connected
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/chekins');
    }
    
    console.log('Seeding roles...');
    
    // Force drop the roles collection to start fresh
    try {
      await mongoose.connection.collection('roles').drop();
      console.log('Dropped existing roles collection');
    } catch (err) {
      console.log('No existing roles collection to drop');
    }
    
    // Create roles
    const roles = [
      { name: 'individual' },
      { name: 'business' }
    ];
    
    const result = await Role.insertMany(roles);
    console.log('Roles seeded successfully!', result);
    
    // Verify roles exist
    const allRoles = await Role.find({});
    console.log('Available roles after seeding:', allRoles);
  } catch (error) {
    console.error('Error seeding roles:', error);
  }
};

// Run the seeder if this file is executed directly
if (require.main === module) {
  seedRoles()
    .then(() => {
      console.log('Role seeding completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('Role seeding failed:', error);
      process.exit(1);
    });
} 