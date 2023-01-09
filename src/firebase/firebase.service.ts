import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER, Inject, Injectable, Options } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosError } from 'axios';
import { firestore } from 'firebase-admin';
import { catchError, firstValueFrom } from 'rxjs';
import { Cache } from 'cache-manager';

@Injectable()
export class FirebaseService {
  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}
  async test() {
    const ref = firestore().collection('data').doc('hash');
    const doc = await ref.get();
    return doc.data();
  }

  /**
   * l10n 데이터 인서트 korean 데이터만
   * 데이터가 상당히 크다(1.6MB 이상) 너무 자주 업데이트 ㄴㄴ
   */
  async insertl10n() {
    const { data } = (
      await firstValueFrom(
        this.httpService
          .get(`${this.configService.get('ER_API_URL')}/v1/l10n/Korean`)
          .pipe(
            catchError((error: AxiosError) => {
              console.error(error);
              throw 'An error happened!';
            }),
          ),
      )
    ).data;

    const l10nData = (
      await firstValueFrom(
        this.httpService.get(data.l10Path, { headers: {} }).pipe(
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

    const batch = firestore().batch();
    const l10nRef = firestore().collection('l10n').doc('korean');
    batch.set(l10nRef, { ...l10nObject }, { merge: true });
    await batch.commit();

    // return l10nObject;
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
        .get(`${this.configService.get('ER_API_URL')}/v1/data/Character`)
        .pipe(
          catchError((error: AxiosError) => {
            console.error(error);
            throw 'An error happened!';
          }),
        ),
    );

    const skinResponse = await firstValueFrom(
      this.httpService
        .get(`${this.configService.get('ER_API_URL')}/v1/data/CharacterSkin`)
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
   * 시즌 리스트 인서트
   */
  async insertSeason() {
    const { data } = await firstValueFrom(
      this.httpService
        .get(`${this.configService.get('ER_API_URL')}/v1/data/Season`)
        .pipe(
          catchError((error: AxiosError) => {
            console.error(error);
            throw 'An error happened!';
          }),
        ),
    );

    // firebase set
    const seasons = data.data;
    const seasonRef = firestore().collection('data').doc('season');

    seasonRef.set(seasons, { merge: true });
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
        .get(`${this.configService.get('ER_API_URL')}/v1/data/Trait`)
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
        .get(`${this.configService.get('ER_API_URL')}/v1/data/ItemArmor`)
        .pipe(
          catchError((error: AxiosError) => {
            console.error(error);
            throw 'An error happened!';
          }),
        ),
    );
    const itemWeaponResponse = await firstValueFrom(
      this.httpService
        .get(`${this.configService.get('ER_API_URL')}/v1/data/ItemWeapon`)
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
   * 공식 api 해쉬 데이터 인서트
   */
  async insertHash() {
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
    const hashData = data.data;
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

  /**
   * l10n 데이터 가져오기
   */
  async getL10n() {
    const ref = firestore().collection('l10n').doc('korean');
    const l10n = await ref.get();

    return l10n.data();
  }
}
