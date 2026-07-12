import { prisma } from '../../../shared/prisma/client';
import { CreateCategoryInput, UpdateCategoryInput } from './category.dto';

export const categoryRepository = {
  async findAll() {
    return prisma.assetCategory.findMany({
      include: {
        _count: {
          select: { assets: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  },

  async findById(id: string) {
    return prisma.assetCategory.findUnique({
      where: { id },
      include: {
        _count: {
          select: { assets: true },
        },
      },
    });
  },

  async findByName(name: string) {
    return prisma.assetCategory.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } },
    });
  },

  async create(data: CreateCategoryInput) {
    return prisma.assetCategory.create({
      data: {
        name: data.name,
        description: data.description ?? null,
        extraFields: data.extraFields ?? undefined,
      },
    });
  },

  async update(id: string, data: UpdateCategoryInput) {
    return prisma.assetCategory.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.extraFields !== undefined && { extraFields: data.extraFields ?? undefined }),
      },
    });
  },

  async delete(id: string) {
    return prisma.assetCategory.delete({ where: { id } });
  },

  async countAssets(id: string) {
    return prisma.asset.count({ where: { categoryId: id } });
  },
};
