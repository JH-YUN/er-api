import {
  Controller,
  Get,
  UseInterceptors,
  CacheInterceptor,
  CacheKey,
  CacheTTL,
  Post,
} from '@nestjs/common';
import { AppService } from './app.service';
import { FirebaseService } from './firebase/firebase.service';

@Controller()
@UseInterceptors(CacheInterceptor)
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly firebaseService: FirebaseService,
  ) {}

  @Get('insert')
  async insertTest() {
    return await this.firebaseService.insertItem();
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
}
