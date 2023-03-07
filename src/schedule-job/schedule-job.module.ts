import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { OfficialApiModule } from 'src/official-api/official-api.module';
import { ScheduleJobService } from './schedule-job.service';
import { ScheduleJobController } from './schedule-job.controller';

@Module({
  imports: [ScheduleModule.forRoot(), OfficialApiModule],
  providers: [ScheduleJobService],
  exports: [ScheduleJobService],
  controllers: [ScheduleJobController],
})
export class ScheduleJobModule {}
