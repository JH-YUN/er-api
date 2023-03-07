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

  @Put('task')
  async task(@Body('key') key, @Res() res: Response) {
    if (key === 'googlecloudschedulekey') this.scheduleService.task();
    else res.status(HttpStatus.NOT_FOUND).send();
  }
}
