import { DynamicModule, Module } from '@nestjs/common';
import { OfficialApiService } from './official-api.service';
import { HttpModule } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    HttpModule.registerAsync({
      useFactory: async (configService: ConfigService) => ({
        headers: { 'x-api-key': configService.get('ER_API_KEY') },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [OfficialApiService],
  exports: [OfficialApiService],
})
export class OfficialApiModule {}
