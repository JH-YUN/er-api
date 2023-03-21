import {
  Controller,
  Get,
  UseInterceptors,
  CacheInterceptor,
  CacheKey,
  CacheTTL,
  Post,
  Param,
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

  @Get('insert')
  async insert() {
    const res = await this.scheduleService.dataUpdateTask();
    console.log(res);
    return res;
  }

  @Get('insertTest')
  async insertTest() {
    return await this.firebaseService.insertTopRank('duo');
  }

  @Get('test')
  async test() {
    return await this.firebaseService.insertCharactersAndSkins();
  }

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
  @Get('ranks/:mode')
  async ranks(@Param('mode') mode: 'solo' | 'duo' | 'squard') {
    return await this.firebaseService.getTopRank(mode);
  }
}
