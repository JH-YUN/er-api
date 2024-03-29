import {
  Controller,
  Get,
  UseInterceptors,
  CacheInterceptor,
  CacheKey,
  CacheTTL,
  Post,
  Param,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { AppService } from './app.service';
import { FirebaseService } from './firebase/firebase.service';
import { OfficialApiService } from './official-api/official-api.service';
import { ScheduleJobService } from './schedule-job/schedule-job.service';

@Controller()
@UseInterceptors(CacheInterceptor)
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly firebaseService: FirebaseService,
    private readonly scheduleService: ScheduleJobService,
    private readonly officialService: OfficialApiService,
  ) {}

  @Get('l10n')
  async l10n() {
    return await this.firebaseService.getL10n();
  }
  @Get('characters')
  async characters() {
    return await this.firebaseService.getCharacters();
  }
  @Get('character-skins')
  async characsterSkins() {
    return await this.firebaseService.getCharacterSkins();
  }
  @Get('traits')
  async traits() {
    return await this.firebaseService.getTraits();
  }
  @Get('items')
  async items() {
    return await this.firebaseService.getItems();
  }
  @Get('stats')
  async stats() {
    return await this.firebaseService.getStats();
  }
  @Get('seasons')
  async seasons() {
    return await this.firebaseService.getSeasons();
  }
  @Get('tactical-skills')
  async tacticalSkills() {
    return await this.firebaseService.getTacticalSkills();
  }
  @Get('ranks/:mode')
  async ranks(
    @Param('mode') mode: 'solo' | 'duo' | 'squard',
    @Query('count', new DefaultValuePipe(10), ParseIntPipe)
    count: number | null,
  ) {
    return await this.firebaseService.getTopRank(mode, count);
  }
}
