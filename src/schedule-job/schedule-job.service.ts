import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { FirebaseService } from '../firebase/firebase.service';
import { OfficialApiService } from '../official-api/official-api.service';
@Injectable()
export class ScheduleJobService {
  constructor(
    private readonly firebaseService: FirebaseService,
    private readonly officialApiService: OfficialApiService,
  ) {}

  /**
   * 업데이트된 해쉬값 키 리스트 반환
   */
  async getUpdateHash(): Promise<string[]> {
    const officialApiHashes = await this.officialApiService.getHash();
    const firebaseHashes = await this.firebaseService.getHash();

    const updateHashes = Object.entries(officialApiHashes).filter(
      ([key, hash]) => hash !== firebaseHashes?.[key],
    );

    return updateHashes.map((el) => el[0]);
  }

  /**
   * l10n 데이터 날짜 비교
   */
  async comepareL10nUpdateDate(language = 'korean'): Promise<boolean> {
    const officialApiL10nPath = await this.officialApiService.getL10nFilePath(
      language.charAt(0).toUpperCase() + language.slice(1),
    );
    const firebaseL10nPath = await this.firebaseService.getL10nFilePath(
      language,
    );

    return officialApiL10nPath === firebaseL10nPath;
  }

  async dataUpdateTask() {
    console.log('Task 실행');
    let l10n = null;
    if (await this.comepareL10nUpdateDate()) {
      console.log('l10n데이터 업데이트');
      l10n = await this.firebaseService.insertl10n();
      await this.firebaseService.insertStats();
    }
    const updateKeys = await this.getUpdateHash();

    let characterFlag = false;
    let itemFlag = false;
    let traitFlag = false;
    let seasonFlag = false;
    let tacticalSkillFlag = false;
    updateKeys.map((key) => {
      const keyLower = key.toLowerCase();
      if (keyLower.indexOf('character') >= 0) {
        characterFlag = true;
      } else if (keyLower.indexOf('item') >= 0) {
        itemFlag = true;
      } else if (keyLower === 'trait') {
        traitFlag = true;
      } else if (keyLower === 'season') {
        seasonFlag = true;
      } else if (keyLower === 'tacticalskillsetgroup') {
        tacticalSkillFlag = true;
      }
    });

    // 업데이트 내역이 있을 경우 l10n 데이터 불러오기
    if (
      (characterFlag ||
        itemFlag ||
        traitFlag ||
        seasonFlag ||
        tacticalSkillFlag) &&
      l10n === null
    ) {
      l10n = this.firebaseService.getL10n();
    }
    if (characterFlag) {
      console.log('케릭터 업데이트');
      await this.firebaseService.insertCharactersAndSkins(l10n);
    }
    if (itemFlag) {
      console.log('아이템 업데이트');
      await this.firebaseService.insertItem(l10n);
    }
    if (traitFlag) {
      console.log('특성 업데이트');
      await this.firebaseService.insertTrait(l10n);
    }
    if (seasonFlag) {
      console.log('시즌 업데이트');
      await this.firebaseService.insertSeason();
    }
    if (tacticalSkillFlag) {
      console.log('전술 스킬 업데이트');
      await this.firebaseService.insertTacticalSkill(l10n);
    }

    if (characterFlag || itemFlag || traitFlag || seasonFlag) {
      console.log('해시 데이터 업데이트');
      await this.firebaseService.insertHashV1();
      await this.firebaseService.insertHashV2();
    }
  }

  async topRankUpdateTask() {
    console.log('랭커 업데이트');
    await this.firebaseService.insertTopRank('squard');
  }
}
