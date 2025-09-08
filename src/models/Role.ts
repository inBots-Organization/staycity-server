import { Schema, model, Document } from 'mongoose';
import { RoleName, Permission } from '../types/permissions';

export interface IRole extends Document {
  name: RoleName;
  permissions: Permission[];
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

const roleSchema = new Schema<IRole>(
  {
    name: {
      type: String,
      required: [true, 'Role name is required'],
      unique: true,
      enum: ['super_admin', 'admin', 'manager', 'user'],
    },
    permissions: [{
      type: String,
      required: true
    }],
    description: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

roleSchema.index({ name: 1 });

export const Role = model<IRole>('Role', roleSchema);