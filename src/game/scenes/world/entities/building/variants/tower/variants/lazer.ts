import { DIFFICULTY } from '~const/world/difficulty';
import { ShotLazer } from '~entity/shot/lazer';
import { IWorld } from '~type/world';
import {
  BuildingIcon,
  BuildingParam, BuildingTexture, BuildingType, BuildingVariant, BuildingVariantData,
} from '~type/world/entities/building';

import { BuildingTower } from '../tower';

export class BuildingTowerLazer extends BuildingTower {
  static Name = 'Lazer tower';

  static Description = 'Instant and continuous laser attack of enemies';

  static Params: BuildingParam[] = [
    { label: 'HEALTH', value: DIFFICULTY.BUILDING_TOWER_LAZER_HEALTH, icon: BuildingIcon.HEALTH },
    { label: 'RADIUS', value: DIFFICULTY.BUILDING_TOWER_LAZER_ATTACK_RADIUS, icon: BuildingIcon.RADIUS },
    { label: 'DAMAGE', value: DIFFICULTY.BUILDING_TOWER_LAZER_ATTACK_DAMAGE, icon: BuildingIcon.DAMAGE },
  ];

  static Texture = BuildingTexture.TOWER_LAZER;

  static Cost = DIFFICULTY.BUILDING_TOWER_LAZER_COST;

  static Health = DIFFICULTY.BUILDING_TOWER_LAZER_HEALTH;

  static AllowByWave = DIFFICULTY.BUILDING_TOWER_LAZER_ALLOW_BY_WAVE;
  
  static Type = BuildingType.BUILDING;

  constructor(scene: IWorld, data: BuildingVariantData) {
    const shot = new ShotLazer(scene, {
      damage: DIFFICULTY.BUILDING_TOWER_LAZER_ATTACK_DAMAGE,
    });

    super(scene, {
      ...data,
      variant: BuildingVariant.TOWER_LAZER,
      health: BuildingTowerLazer.Health,
      texture: BuildingTowerLazer.Texture,
      actions: {
        radius: DIFFICULTY.BUILDING_TOWER_LAZER_ATTACK_RADIUS,
        pause: DIFFICULTY.BUILDING_TOWER_LAZER_ATTACK_PAUSE,
      },
    }, shot);
  }
}
