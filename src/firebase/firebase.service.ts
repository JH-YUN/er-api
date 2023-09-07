import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosError } from 'axios';
import { firestore } from 'firebase-admin';
import { catchError, firstValueFrom } from 'rxjs';
import * as dayjs from 'dayjs';

@Injectable()
export class FirebaseService {
  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {}
  async test() {
    const ref = firestore().collection('data').doc('hash');
    const doc = await ref.get();
    return doc.data();
  }

  /**
   * l10n 데이터 인서트
   * 데이터가 상당히 크다(1.6MB 이상) 너무 자주 업데이트 ㄴㄴ
   */
  async insertl10n(language = 'Korean') {
    const { data } = (
      await firstValueFrom(
        this.httpService
          .get(`${this.configService.get('ER_API_URL')}/v1/l10n/${language}`)
          .pipe(
            catchError((error: AxiosError) => {
              console.error(error);
              throw 'An error happened!';
            }),
          ),
      )
    ).data;

    const l10nPath = data.l10Path;

    const l10nData = (
      await firstValueFrom(
        this.httpService.get(l10nPath, { headers: {} }).pipe(
          catchError((error: AxiosError) => {
            console.log(error);
            throw 'An error happened!';
          }),
        ),
      )
    ).data;

    const l10nObject: any = {};

    // l10n 데이터중 가져올 데이터 카테고리
    const categories = [
      'Item/Name/',
      'Item/Effects/',
      'Item/Skills/',
      'Character/',
      'Monster/',
      'ItemType/',
      'WeaponType/',
      'ArmorType/',
      'SpecialItemType/',
      'MasteryType/',
      'Skin/Name/',
      'Skill/',
      'Trait/',
      'Infusion/',
      'StatType/',
    ];

    // l18n 데이터 파싱
    for (const el of l10nData.split('\r\n')) {
      const [key, value] = el.split('┃');
      if (
        key !== undefined &&
        key !== null &&
        key !== '' &&
        value !== undefined &&
        value !== null &&
        value !== ''
      ) {
        for (const cat of categories) {
          const pattern = new RegExp(`^${cat}`); // 정규식 패턴 생성
          if (key.search(pattern) > -1) {
            l10nObject[key] = value;
            break;
          }
        }
      }
    }

    // 저장
    const batch = firestore().batch();
    const l10nRef = firestore().collection('l10n').doc(language.toLowerCase());
    batch.set(l10nRef, { ...l10nObject }, { merge: true }); // l10n 데이터 저장
    const l10nDateRef = firestore()
      .collection('l10n')
      .doc(`${language}FilePath`);
    batch.set(l10nDateRef, { path: l10nPath }); // 업데이트 체크용 l10n 업데이트 날짜 저장
    await batch.commit();

    return l10nObject;
  }
  /**
   * 케릭터&스킨 정보 인서트
   */
  async insertCharactersAndSkins(l10n = null) {
    if (!l10n) {
      l10n = await this.getL10n();
    }
    const charactersResponse = await firstValueFrom(
      this.httpService
        .get(`${this.configService.get('ER_API_URL')}/v2/data/Character`)
        .pipe(
          catchError((error: AxiosError) => {
            console.error(error);
            throw 'An error happened!';
          }),
        ),
    );

    const skinResponse = await firstValueFrom(
      this.httpService
        .get(`${this.configService.get('ER_API_URL')}/v2/data/CharacterSkin`)
        .pipe(
          catchError((error: AxiosError) => {
            console.error(error);
            throw 'An error happened!';
          }),
        ),
    );

    // 데이터 인서트
    const characters = charactersResponse.data.data;
    const skins = skinResponse.data.data;

    const batch = firestore().batch();
    // 데이터 가공 : 캐릭터 스킨 코드 리스트 추가, 캐릭터 이름 l10n
    characters.forEach((character) => {
      const characterSkins = skins.filter(
        (skin) => skin.characterCode === character.code,
      );
      character.skinCodes = characterSkins.map((skin) => skin.code);
      character.name =
        l10n[`Character/Name/${character.code}`] ?? character.name; // l10n 데이터 업데이트가 느린 경우가 있음
      const characterRef = firestore()
        .collection('characters')
        .doc(String(character.code));
      batch.set(characterRef, character, { merge: true });
    });
    // 데이터 가공 : 스킨 이름 l10n
    skins.forEach((skin) => {
      skin.name = l10n[`Skin/Name/${skin.code}`] ?? skin.name;
      const skinsRef = firestore()
        .collection('characterSkins')
        .doc(String(skin.code));
      batch.set(skinsRef, skin, { merge: true });
    });

    await batch.commit();
  }

  /**
   * 시즌 정보 insert
   */
  async insertSeason() {
    const batch = firestore().batch();

    const seasons = (
      await this.httpService.axiosRef.get(
        `${this.configService.get('ER_API_URL')}/v2/data/Season`,
      )
    ).data.data;

    seasons.map((season) => {
      const seasonsRef = firestore()
        .collection('seasons')
        .doc(String(season.seasonID));
      batch.set(seasonsRef, season, { merge: true });
    });

    await batch.commit();
  }

  /**
   * 특성 정보 insert
   */
  async insertTrait(l10n = null) {
    if (!l10n) {
      l10n = await this.getL10n();
    }
    const { data } = await firstValueFrom(
      this.httpService
        .get(`${this.configService.get('ER_API_URL')}/v2/data/Trait`)
        .pipe(
          catchError((error: AxiosError) => {
            console.error(error);
            throw 'An error happened!';
          }),
        ),
    );

    const traits = data.data;

    const batch = firestore().batch();
    // 데이터 가공(이름, 툴팁 추가)
    traits.forEach((trait) => {
      trait.name = l10n[`Trait/Name/${trait.code}`] ?? null;
      trait.tooltip = l10n[`Trait/Tooltip/${trait.code}`] ?? null;
      // 코발트 인퓨전의 경우 다른 l10n데이터 참조
      if (!trait.tooltip && trait.traitGameMode === 'Cobalt') {
        trait.tooltip = l10n[`Infusion/Trait/Desc/${trait.code}`] ?? null;
      }

      const traitsRef = firestore()
        .collection('traits')
        .doc(String(trait.code));
      batch.set(traitsRef, trait, { merge: true });
    });

    await batch.commit();
  }

  /**
   * 장비 아이템(무기 + 방어구) 정보 insert
   */
  async insertItem(l10n = null) {
    if (!l10n) {
      l10n = await this.getL10n();
    }
    const itemArmorResponse = await firstValueFrom(
      this.httpService
        .get(`${this.configService.get('ER_API_URL')}/v2/data/ItemArmor`)
        .pipe(
          catchError((error: AxiosError) => {
            console.error(error);
            throw 'An error happened!';
          }),
        ),
    );
    const itemWeaponResponse = await firstValueFrom(
      this.httpService
        .get(`${this.configService.get('ER_API_URL')}/v2/data/ItemWeapon`)
        .pipe(
          catchError((error: AxiosError) => {
            console.error(error);
            throw 'An error happened!';
          }),
        ),
    );
    const itemSkillLinkerResponse = await firstValueFrom(
      this.httpService
        .get(`${this.configService.get('ER_API_URL')}/v1/data/ItemSkillLinker`)
        .pipe(
          catchError((error: AxiosError) => {
            console.error(error);
            throw 'An error happened!';
          }),
        ),
    );
    const itemSkillLinkers = itemSkillLinkerResponse.data.data;

    const items = [
      ...itemArmorResponse.data.data,
      ...itemWeaponResponse.data.data,
    ];
    const itemResult = [];
    items.map((item) => {
      const skills = []; // 아이템 스킬
      const option = {}; // 아이템 옵션
      const itemSkillLinker = itemSkillLinkers.find(
        (itemSkillLinker) => Number(itemSkillLinker.itemCode) === item.code,
      );
      // 아이템 스킬 추가
      if (itemSkillLinker) {
        const activeItemSkillCode = Number(itemSkillLinker.activeItemSkillCode);
        const passiveItemSkillCode1 = Number(
          itemSkillLinker.passiveItemSkillCode1,
        );
        const passiveItemSkillCode2 = Number(
          itemSkillLinker.passiveItemSkillCode2,
        );

        if (activeItemSkillCode !== 0) {
          const activeSkill = {
            code: activeItemSkillCode,
            name: l10n[`Item/Skills/${activeItemSkillCode}/Name`] ?? '',
            desc: l10n[`Item/Skills/${activeItemSkillCode}/Desc`] ?? '',
            type: 'active',
          };
          skills.push(activeSkill);
        }
        if (passiveItemSkillCode1 !== 0) {
          const passiveSkill1 = {
            code: passiveItemSkillCode1,
            name: l10n[`Item/Skills/${passiveItemSkillCode1}/Name`] ?? '',
            desc: l10n[`Item/Skills/${passiveItemSkillCode1}/Desc`] ?? '',
            type: 'passive',
          };
          skills.push(passiveSkill1);
          if (passiveItemSkillCode2 !== 0) {
            const passiveSkill2 = {
              code: passiveItemSkillCode2,
              name: l10n[`Item/Skills/${passiveItemSkillCode2}/Name`] ?? '',
              desc: l10n[`Item/Skills/${passiveItemSkillCode2}/Desc`] ?? '',
              type: 'passive',
            };
            skills.push(passiveSkill2);
          }
        }
      }

      // 제거할 key
      const DEL_KEY_LIST = [
        'isCompletedItem',
        'alertInSpectator',
        'markingType',
        'craftAnimTrigger',
        'stackable',
        'initialCount',
        'itemUsableType',
        'itemUsableValueList',
        'exclusiveProducer',
        'canNotBeTakeItemFromCorpse',
        'makeMaterial1',
        'makeMaterial2',
        'notDisarm',
        'consumable',
        'manufacturableType',
        'restoreItemWhenResurrected',
      ];

      // 스탯 key, 값이 0 이면 제거
      const OPTION_KEY_LIST = [
        'attackPower',
        'attackPowerByLv',
        'defense',
        'defenseByLv',
        'skillAmp',
        'skillAmpByLevel',
        'skillAmpRatio',
        'skillAmpRatioByLevel',
        'maxHp',
        'maxHpByLv',
        'hpRegenRatio',
        'hpRegen',
        'maxSP', // api 오류로 무기에서는 SP, 장비에서는 Sp임
        'maxSp',
        'spRegenRatio',
        'spRegen',
        'attackSpeedRatio',
        'attackSpeedRatioByLv',
        'criticalStrikeChance',
        'criticalStrikeDamage',
        'cooldownReduction',
        'preventCriticalStrikeDamaged',
        'cooldownLimit',
        'lifeSteal',
        'normalLifeSteal',
        'skillLifeSteal',
        'moveSpeed',
        'moveSpeedOutOfCombat',
        'sightRange',
        'attackRange',
        'increaseBasicAttackDamage',
        'increaseBasicAttackDamageByLv',
        'increaseBasicAttackDamageRatio',
        'increaseBasicAttackDamageRatioByLv',
        'preventBasicAttackDamaged',
        'preventBasicAttackDamagedByLv',
        'preventBasicAttackDamagedRatio',
        'preventBasicAttackDamagedRatioByLv',
        'preventSkillDamaged',
        'preventSkillDamagedByLv',
        'preventSkillDamagedRatio',
        'preventSkillDamagedRatioByLv',
        'penetrationDefense',
        'penetrationDefenseRatio',
        'trapDamageReduce',
        'trapDamageReduceRatio',
        'hpHealedIncreaseRatio',
        'healerGiveHpHealRatio',
        'uniqueAttackRange',
        'uniqueHpHealedIncreaseRatio',
        'uniqueCooldownLimit',
        'uniqueTenacity',
        'uniqueMoveSpeed',
        'uniquePenetrationDefense',
        'uniquePenetrationDefenseRatio',
        'uniqueLifeSteal',
        'uniqueSkillAmpRatio',
      ];

      for (const delKey of DEL_KEY_LIST) {
        delete item[delKey];
      }

      for (const optionKey of OPTION_KEY_LIST) {
        if (item[optionKey] !== 0 && item.hasOwnProperty(optionKey)) {
          // api 오류 예외처리
          if (optionKey === 'maxSP') {
            console.log(item[optionKey]);
            option['maxSp'] = item[optionKey];
          } else {
            option[optionKey] = item[optionKey];
          }
        }
        delete item[optionKey];
      }
      item.skills = skills;
      item.option = option;

      itemResult.push(item);
    });

    const batch = firestore().batch();
    itemResult.forEach((item) => {
      const itemRef = firestore().collection('items').doc(String(item.code));
      itemRef.set(item, { merge: true });
    });

    await batch.commit();
  }

  /**
   * l10n 데이터중 스탯 정보만 추출해서 가공후 insert
   */
  async insertStats(l10n = null) {
    if (!l10n) {
      l10n = await this.getL10n();
    }
    const batch = firestore().batch();
    // 데이터 가공
    Object.entries(l10n).map(([key, val]: [string, string]) => {
      const statKey = key.split('/')[1];
      if (key.startsWith('StatType/') && key.split('/').length == 2) {
        const stat = {
          id: statKey.charAt(0).toLowerCase() + statKey.slice(1), // 앞글자 소문자로 변경
          name: val.replace('%', ''),
        };

        const statsRef = firestore().collection('stats').doc(String(stat.id));
        batch.set(statsRef, stat, { merge: true });
      }
    });

    await batch.commit();
  }
  /**
   * 랭커 인서트
   */
  async insertTopRank(mode: 'solo' | 'duo' | 'squard') {
    let gameMode;
    if (mode === 'solo') {
      gameMode = 1;
    } else if (mode === 'duo') {
      gameMode = 2;
    } else if (mode === 'squard') {
      gameMode = 3;
    } else {
      throw new Error('존재하지 않는 게임 모드입니다.');
    }

    const currentSeason = await this.getSeasons(true);

    const res = (
      await this.httpService.axiosRef.get(
        `${this.configService.get('ER_API_URL')}/v1/rank/top/${
          currentSeason.seasonID
        }/${gameMode}`,
      )
    ).data;

    const topRanks = res.topRanks;

    const batch = firestore().batch();
    const modifyDatetime = dayjs().format('YYYY-MM-DD HH:mm:ss');
    const rankRef = firestore().collection('rank').doc(mode);
    batch.set(rankRef, {
      date: modifyDatetime,
      seasonId: currentSeason.seasonID,
    });

    topRanks.slice(0, 100).map((el, i) => {
      const rankModeRef = rankRef.collection('users').doc(`${i}`);
      batch.set(rankModeRef, { ...el, mode: mode });
    });
    await batch.commit();
  }

  /**
   * 전술 스킬 인서트
   */
  async insertTacticalSkill(l10n = null) {
    if (!l10n) {
      l10n = await this.getL10n();
    }

    // 전술 스킬 group, l10n key 매핑
    const taticalSkillgroupToKeyMap = {
      // group : l10n key
      30: 4000000,
      40: 4001000,
      50: 4101000,
      60: 4102000,
      70: 4103000,
      80: 4104000,
      90: 4105000,
      110: 4107000,
      120: 4110000,
      130: 4112000,
      140: 4113000,
      150: 4108000,
      500010: 4501000,
      500020: 4502000,
      500030: 4503000,
      500040: 4504000,
      500050: 4505000,
      500060: 4506000,
      500070: 4507000,
      500080: 4508000,
      500090: 4509000,
      500100: 4510000,
      500110: 4511000,
    };

    const taticalSkillList = (
      await this.httpService.axiosRef.get(
        `${this.configService.get('ER_API_URL')}/v2/data/TacticalSkillSetGroup`,
      )
    ).data.data;

    // 데이터 가공, 이름, 상세 추가
    const taticalSkill = taticalSkillList.map((skill) => {
      const l10Key = taticalSkillgroupToKeyMap[skill.group];
      return {
        ...skill,
        name: l10n[`Skill/Group/Name/${l10Key}`] ?? '',
        desc: l10n[`Skill/Group/LobbyDesc/${l10Key}`] ?? '',
      };
    });

    const batch = firestore().batch();
    taticalSkill.forEach((skill) => {
      const skillRef = firestore()
        .collection('tacticalSkills')
        .doc(String(skill.group));
      batch.set(skillRef, skill, { merge: true });
    });

    await batch.commit();
  }
  /**
   * 공식 api v1 해쉬 데이터 인서트
   */
  async insertHashV1() {
    // 저장할 해쉬 키 리스트(v1 api)
    const HASH_LIST = ['ItemSkillLinker'];

    const { data } = await firstValueFrom(
      this.httpService
        .get(`${this.configService.get('ER_API_URL')}/v1/data/hash`)
        .pipe(
          catchError((error: AxiosError) => {
            console.error(error);
            throw 'An error happened!';
          }),
        ),
    );

    // 특정 키만 저장
    const hashData = Object.entries(data.data).reduce((acc, cur) => {
      if (HASH_LIST.includes(cur[0])) return { ...acc, [cur[0]]: cur[1] };
      return acc;
    }, {});

    const hashRef = firestore().collection('data').doc('hash');

    await hashRef.set(hashData);
  }

  /**
   * 공식 api v2 해쉬 데이터 인서트
   */
  async insertHashV2() {
    // 저장할 해쉬 키 리스트 (v2 api)
    const HASH_LIST = [
      'TacticalSkillSetGroup',
      'Character',
      'CharacterSkin',
      'Season',
      'Trait',
      'ItemArmor',
      'ItemWeapon',
    ];

    const { data } = await firstValueFrom(
      this.httpService
        .get(`${this.configService.get('ER_API_URL')}/v2/data/hash`)
        .pipe(
          catchError((error: AxiosError) => {
            console.error(error);
            throw 'An error happened!';
          }),
        ),
    );

    // 특정 키만 저장
    const hashData = Object.entries(data.data).reduce((acc, cur) => {
      if (HASH_LIST.includes(cur[0])) return { ...acc, [cur[0]]: cur[1] };
      return acc;
    }, {});

    const hashRef = firestore().collection('data').doc('hash');

    await hashRef.set(hashData);
  }

  /**
   * 케릭터 정보 가져오기
   */
  async getCharacters() {
    const ref = firestore().collection('characters');
    const snapshot = await ref.get();
    const characters = snapshot.docs.map((doc) => doc.data());

    return characters;
  }

  /**
   * 케릭터 스킨 정보 가져오기
   */
  async getCharacterSkins() {
    const ref = firestore().collection('characterSkins');
    const snapshot = await ref.get();
    const skins = snapshot.docs.map((doc) => doc.data());

    return skins;
  }

  /**
   * 특성 정보 가져오기
   */
  async getTraits() {
    const ref = firestore().collection('traits');
    const snapshot = await ref.get();
    const traits = snapshot.docs.map((doc) => doc.data());

    return traits;
  }

  async getItems() {
    const ref = firestore().collection('items');
    const snapshot = await ref.get();
    const items = snapshot.docs.map((doc) => doc.data());

    return items;
  }

  async getStats() {
    const ref = firestore().collection('stats');
    const snapshot = await ref.get();
    const stats = snapshot.docs.map((doc) => doc.data());

    return stats;
  }

  async getSeasons(isCurrent = false) {
    const ref = firestore().collection('seasons');
    const snapshot = await ref.orderBy('seasonID', 'asc').get();
    const seasons = snapshot.docs.map((doc) => doc.data());

    if (isCurrent) {
      return seasons.find((el) => el.isCurrent === 1);
    }
    return seasons;
  }

  async getTacticalSkills() {
    const ref = firestore().collection('tacticalSkills');
    const snapshot = await ref.get();
    const skills = snapshot.docs.map((doc) => doc.data());

    return skills;
  }

  /**
   * l10n 데이터 가져오기
   */
  async getL10n(language = 'korean') {
    const ref = firestore().collection('l10n').doc(language);
    const l10n = await ref.get();

    return l10n.data();
  }

  /**
   * l10n 최근 업데이트 날짜 가져오기
   */
  async getL10nFilePath(language = 'korean') {
    const ref = firestore().collection('l10n').doc(`${language}FilePath`);
    const path = await ref.get();

    return path.data();
  }

  /**
   * 랭커 리스트
   * @param mode 게임 모드
   * @param count 가져올 랭커수
   * @returns 랭커 리스트
   */
  async getTopRank(mode: 'solo' | 'duo' | 'squard', count = 10) {
    const ref = firestore().collection('rank').doc(mode);
    const snapshot = await ref
      .collection('users')
      .orderBy('rank', 'asc')
      .limit(count)
      .get();
    const refData = (await ref.get()).data();
    const updateAt = refData.date;
    const seasonId = refData.seasonId;
    const ranks = snapshot.docs.map((doc) => doc.data());

    return {
      updateAt: updateAt,
      seasonId: seasonId,
      users: ranks,
    };
  }

  /**
   * 해쉬 데이터
   */
  async getHash() {
    const ref = firestore().collection('data').doc('hash');
    const hash = await ref.get();

    return hash.data();
  }
}
