import { Module } from '@nestjs/common';
import { InterestRegistrationsService } from './interest-registrations.service.js';
import { InterestRegistrationsController } from './interest-registrations.controller.js';

@Module({
  controllers: [InterestRegistrationsController],
  providers: [InterestRegistrationsService],
})
export class InterestRegistrationsModule {}
