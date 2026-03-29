// src/modules/crawler/dto/gold-query.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, IsInt, Min, IsDate } from 'class-validator';
import { StringUtil } from 'src/common/utils/string.util';

export class GoldQueryDto {
  @ApiPropertyOptional({ description: 'Thương hiệu vàng (SJC, PNJ, DOJI, ...)', example: 'SJC' })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value ? StringUtil.toUpper(value) : undefined)
  brand?: string;

  @ApiPropertyOptional({ description: 'Thành phố (Hanoi, HCMC, Danang, ...)', example: 'Hanoi' })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value ? StringUtil.toUpper(value) : undefined)
  city?: string;

  @ApiPropertyOptional({ description: 'Loại vàng (9999, 24K, 18K, World)', example: '9999' })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value ? StringUtil.toUpper(value) : undefined)
  type?: string;

  @ApiPropertyOptional({ description: 'Ngày bắt đầu (YYYY-MM-DD)', example: '2026-01-01' })
  @IsOptional()
  @Transform(({ value }) => value ? new Date(value) : undefined)
  @IsDate()
  fromDate?: Date;

  @ApiPropertyOptional({ description: 'Ngày kết thúc (YYYY-MM-DD)', example: '2026-12-31' })
  @IsOptional()
  @Transform(({ value }) => value ? new Date(value) : undefined)
  @IsDate()
  toDate?: Date;

  @ApiPropertyOptional({ description: 'Số lượng kết quả tối đa', example: 50, default: 100 })
  @IsOptional()
  @Transform(({ value }) => (value ? parseInt(value, 10) : 100))
  @IsInt()
  @Min(1)
  limit: number = 100;

  @ApiPropertyOptional({ description: 'Trang hiện tại', example: 1, default: 1 })
  @IsOptional()
  @Transform(({ value }) => (value ? parseInt(value, 10) : 1))
  @IsInt()
  @Min(1)
  page: number = 1;
}