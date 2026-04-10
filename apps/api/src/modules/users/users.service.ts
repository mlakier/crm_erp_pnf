import { Injectable, NotFoundException } from "@nestjs/common";
import { RecordStatus } from "@prisma/client";
import { PrismaService } from "../database/prisma.service.js";
import { CreateUserDto } from "./dto/create-user.dto.js";
import { UpdateUserDto } from "./dto/update-user.dto.js";

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async listUsers() {
    return this.prisma.user.findMany({
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }, { email: "asc" }]
    });
  }

  async getUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!user) {
      throw new NotFoundException(`User ${userId} was not found.`);
    }

    return user;
  }

  async createUser(input: CreateUserDto) {
    const roles = input.roleCodes?.length
      ? await this.prisma.role.findMany({
          where: {
            code: {
              in: input.roleCodes
            }
          }
        })
      : [];

    return this.prisma.user.create({
      data: {
        email: input.email,
        firstName: input.firstName,
        lastName: input.lastName,
        status: input.status === "INACTIVE" ? RecordStatus.INACTIVE : RecordStatus.ACTIVE,
        userRoles: roles.length
          ? {
              create: roles.map((role) => ({
                roleId: role.id
              }))
            }
          : undefined
      },
      include: {
        userRoles: {
          include: {
            role: true
          }
        }
      }
    });
  }

  async updateUser(userId: string, input: UpdateUserDto) {
    await this.getUser(userId);

    const roles = input.roleCodes?.length
      ? await this.prisma.role.findMany({
          where: {
            code: {
              in: input.roleCodes
            }
          }
        })
      : null;

    if (roles) {
      await this.prisma.userRole.deleteMany({ where: { userId } });
      if (roles.length) {
        await this.prisma.userRole.createMany({
          data: roles.map((role) => ({
            userId,
            roleId: role.id
          })),
          skipDuplicates: true
        });
      }
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        email: input.email,
        firstName: input.firstName,
        lastName: input.lastName,
        status: input.status ? (input.status === "INACTIVE" ? RecordStatus.INACTIVE : RecordStatus.ACTIVE) : undefined
      },
      include: {
        userRoles: {
          include: {
            role: true
          }
        }
      }
    });
  }
}
