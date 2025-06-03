import { Schema, model, Document } from 'mongoose';

export interface IRole extends Document {
  name: string;
}

const RoleSchema = new Schema<IRole>({
  name: {
    type: String,
    enum: ['individual', 'business'],
    required: true,
    unique: true,
  },
});

export const Role = model<IRole>('Role', RoleSchema);

console.log('Role model collection name:', Role.collection.name);
