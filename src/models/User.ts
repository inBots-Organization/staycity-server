import { Schema, model, Document } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { RoleName } from '../types/permissions';

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: RoleName;
  image?: string;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Please enter a valid email',
      ],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false,
    },
    role: {
      type: String,
      required: [true, 'Role is required'],
      enum: ['super_admin', 'admin', 'manager', 'user'],
      default: 'user',
    },
    image: {
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

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(12);
    this['password'] = await bcrypt.hash(this['password'], salt);
    next();
  } catch (error) {
    next(error as any);
  }
});

// Compare password method
userSchema.methods['comparePassword'] = async function (
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this['password']);
};

export const User = model<IUser>('User', userSchema);
