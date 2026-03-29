// src/modules/crawler/dto/crawl-result.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class CrawlResultDto {
  @ApiProperty({ description: 'ID của job' })
  jobId: string;

  @ApiProperty({ description: 'Trạng thái job' })
  status: 'pending' | 'processing' | 'completed' | 'failed';

  @ApiProperty({ description: 'Thông báo' })
  message: string;
}

export class CrawlStatusDto {
  @ApiProperty({ description: 'Nguồn chính có hoạt động không' })
  primaryAvailable: boolean;

  @ApiProperty({ description: 'Số job đang chờ' })
  waitingJobs: number;

  @ApiProperty({ description: 'Số job đang xử lý' })
  activeJobs: number;

  @ApiProperty({ description: 'Số job hoàn thành' })
  completedJobs: number;

  @ApiProperty({ description: 'Số job thất bại' })
  failedJobs: number;

  @ApiProperty({ description: 'Lần crawl gần nhất' })
  lastCrawl: Date;
}