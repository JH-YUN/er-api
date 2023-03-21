import { Body, Controller, HttpStatus, Put, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { ScheduleJobService } from './schedule-job.service';

@Controller('schedule-job')
export class ScheduleJobController {
  constructor(
    private readonly scheduleService: ScheduleJobService,
    private readonly configService: ConfigService,
  ) {}

  @Put('data-task')
  async dataUpdateTask(
    @Body('key') key,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (key === 'googlecloudschedulekey')
      await this.scheduleService.dataUpdateTask();
    else res.status(HttpStatus.NOT_FOUND).send();
  }

  @Put('rank-task')
  async topRankUpdateTask(
    @Body('key') key,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (key === 'googlecloudschedulekey')
      await this.scheduleService.topRankUpdateTask();
    else res.status(HttpStatus.NOT_FOUND).send();
  }
}
