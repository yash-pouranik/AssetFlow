import { NotFoundError, ConflictError } from '../../../shared/errors/AppError';
import { eventBus, EVENTS } from '../../../shared/events/eventBus';
import { categoryRepository } from './category.repository';
import { CreateCategoryInput, UpdateCategoryInput } from './category.dto';

export const categoryService = {
  async getAll() {
    return categoryRepository.findAll();
  },

  async getById(id: string) {
    const category = await categoryRepository.findById(id);

    if (!category) {
      throw new NotFoundError(`Asset category with ID '${id}' not found`);
    }

    return category;
  },

  async create(data: CreateCategoryInput) {
    const existing = await categoryRepository.findByName(data.name);
    if (existing) {
      throw new ConflictError(`Asset category with name '${data.name}' already exists`);
    }

    const category = await categoryRepository.create(data);

    eventBus.emit(EVENTS.CATEGORY_CREATED, { category });

    return category;
  },

  async update(id: string, data: UpdateCategoryInput) {
    const existing = await categoryRepository.findById(id);
    if (!existing) {
      throw new NotFoundError(`Asset category with ID '${id}' not found`);
    }

    if (data.name && data.name.toLowerCase() !== existing.name.toLowerCase()) {
      const duplicate = await categoryRepository.findByName(data.name);
      if (duplicate && duplicate.id !== id) {
        throw new ConflictError(`Asset category with name '${data.name}' already exists`);
      }
    }

    const updated = await categoryRepository.update(id, data);

    eventBus.emit(EVENTS.CATEGORY_UPDATED, { category: updated });

    return updated;
  },

  async delete(id: string) {
    const existing = await categoryRepository.findById(id);
    if (!existing) {
      throw new NotFoundError(`Asset category with ID '${id}' not found`);
    }

    const assetCount = await categoryRepository.countAssets(id);
    if (assetCount > 0) {
      throw new ConflictError(
        `Cannot delete category: it has ${assetCount} asset(s) associated with it. Reassign or remove them first.`,
      );
    }

    await categoryRepository.delete(id);

    eventBus.emit(EVENTS.CATEGORY_DELETED, { categoryId: id });
  },
};
