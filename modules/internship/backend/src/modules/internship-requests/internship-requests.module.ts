import { Module } from '@nestjs/common';
import { InternshipRequestsService } from './internship-requests.service.js';
import { InternshipRequestsController } from './internship-requests.controller.js';

@Module({
  controllers: [InternshipRequestsController],
  providers: [InternshipRequestsService],
})
export class InternshipRequestsModule {}
