// src/prisma/prisma.module.ts
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global() // Global module để dùng PrismaService ở bất kỳ đâu
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}