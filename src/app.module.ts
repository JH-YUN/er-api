import { Module, CacheModule } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { FirebaseModule } from './firebase/firebase.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { ScheduleJobModule } from './schedule-job/schedule-job.module';
import { OfficialApiModule } from './official-api/official-api.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    FirebaseModule.forRoot(),
    CacheModule.register({
      isGlobal: true,
      ttl: 600000,
    }),
    ScheduleJobModule,
    OfficialApiModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
