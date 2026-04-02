// src/modules/crawler/dto/currency-query.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, IsInt, Min, IsDate } from 'class-validator';
import { StringUtil } from 'src/common/utils/string.util';

export class CurrencyQueryDto {
  @ApiPropertyOptional({ description: 'Mã ngoại tệ (USD, EUR, JPY, ...)', example: 'USD' })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value ? StringUtil.toUpper(value) : undefined)
  currency?: string;

  @ApiPropertyOptional({ description: 'Ngân hàng (Vietcombank, ...)', example: 'Vietcombank' })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value ? StringUtil.toUpper(value) : undefined)
  bank?: string;

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