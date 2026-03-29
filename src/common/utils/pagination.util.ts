import { Prisma } from '@prisma/client';

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export class PaginationHelper {
  static getPaginationParams(params: PaginationParams): { page: number; limit: number; skip: number } {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(100, Math.max(1, params.limit ?? 20));
    const skip = (page - 1) * limit;
    return { page, limit, skip };
  }

  static getOrderBy(params: PaginationParams): any {
    const sortBy = params.sortBy ?? 'createdAt';
    const sortOrder = params.sortOrder ?? 'desc';
    return { [sortBy]: sortOrder };
  }

  static createPaginatedResult<T>(
    data: T[],
    total: number,
    page: number,
    limit: number,
  ): PaginatedResult<T> {
    const totalPages = Math.ceil(total / limit);
    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  static async paginate<T>(
    model: { 
      findMany: Function; 
      count: Function;
    },
    options: {
      where?: any;
      include?: any;
      select?: any;
      orderBy?: any;
      page?: number;
      limit?: number;
    },
  ): Promise<PaginatedResult<T>> {
    const { page, limit, skip } = this.getPaginationParams({
      page: options.page,
      limit: options.limit,
    });

    const orderBy = options.orderBy || this.getOrderBy({});

    const [data, total] = await Promise.all([
      model.findMany({
        where: options.where,
        include: options.include,
        select: options.select,
        orderBy,
        skip,
        take: limit,
      }),
      model.count({ where: options.where }),
    ]);

    return this.createPaginatedResult(data, total, page, limit);
  }
}