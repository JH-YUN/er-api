import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { OfficialApiModule } from 'src/official-api/official-api.module';
import { ScheduleJobService } from './schedule-job.service';

@Module({
  imports: [ScheduleModule.forRoot(), OfficialApiModule],
  providers: [ScheduleJobService],
  exports: [ScheduleJobService],
})
export class ScheduleJobModule {}
