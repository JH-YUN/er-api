import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class OfficialApiService {
  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {}

  async getL10nFilePath(language = 'Korean') {
    const res = (
      await this.httpService.axiosRef.get(
        `${this.configService.get('ER_API_URL')}/v1/l10n/${language}`,
      )
    ).data.data.l10Path;

    return res;
  }

  async getHash() {
    // 확인할 해쉬 목록
    const HASH_LIST = [
      'Character',
      'CharacterSkin',
      'Season',
      'Trait',
      'ItemArmor',
      'ItemWeapon',
      'ItemSkillLinker',
    ];

    const res = (
      await this.httpService.axiosRef.get(
        `${this.configService.get('ER_API_URL')}/v1/data/hash`,
      )
    ).data.data;

    const hashes = Object.entries(res).reduce((acc, cur) => {
      if (HASH_LIST.includes(cur[0])) return { ...acc, [cur[0]]: cur[1] };
      return acc;
    }, {});

    return hashes;
  }
}
