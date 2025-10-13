import { prisma } from '../config/prisma';
import { User, RoleName } from '../generated/prisma';
import * as bcrypt from 'bcryptjs';

export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  role?: RoleName;
  image?: string;
}

export interface UpdateUserInput {
  name?: string;
  email?: string;
  role?: RoleName;
  image?: string;
}

export interface UserWithoutPassword extends Omit<User, 'password'> {}

export class UserService {
  static async createUser(data: CreateUserInput): Promise<UserWithoutPassword> {
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(data.password, salt);

    const user = await prisma.user.create({
      data: {
        ...data,
        password: hashedPassword,
        role: data.role || 'user',
      },
    });

    // Return user without password
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  static async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { email },
    });
  }

  static async findByEmailWithoutPassword(email: string): Promise<UserWithoutPassword | null> {
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        image: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return user;
  }

  static async findById(id: string): Promise<UserWithoutPassword | null> {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        image: true,
        createdAt: true,
        password: true,
        updatedAt: true,
      },
    });

    return user;
  }

  static async findByIdWithPassword(id: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { id },
    });
  }

  static async getAllUsers(): Promise<UserWithoutPassword[]> {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        image: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return users;
  }

  static async updateUser(id: string, data: UpdateUserInput): Promise<UserWithoutPassword | null> {
    const user = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        image: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return user;
  }

  static async deleteUser(id: string): Promise<void> {
    await prisma.user.delete({
      where: { id },
    });
  }

  static async comparePassword(user: User, candidatePassword: string): Promise<boolean> {
    console.log(candidatePassword, user.password)
    return bcrypt.compare(candidatePassword, user.password);
  }

  static async checkEmailExists(email: string, excludeId?: string): Promise<boolean> {
    const whereClause: any = { email };
    if (excludeId) {
      whereClause.id = { not: excludeId };
    }

    const user = await prisma.user.findFirst({
      where: whereClause,
    });

    return !!user;
  }
  
  static async updatePassword(id: string, newPassword: string): Promise<void> {
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await prisma.user.update({
      where: { id },
      data: {
        password: hashedPassword,
      },
    });
  }
}