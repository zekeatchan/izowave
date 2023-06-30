import { DIFFICULTY } from '~const/world/difficulty';
import { IWorld } from '~type/world';
import {
  BuildingEvents, BuildingVariant, BuildingTexture, BuildingParam, BuildingVariantData, BuildingIcon, BuildingType,
} from '~type/world/entities/building';

import { Building } from '../building';

export class BuildingBlock extends Building {
  static Name = 'Block';

  static Description = 'Wall with more health to defend other buildings';

  static Params: BuildingParam[] = [
    { label: 'HEALTH', value: DIFFICULTY.BUILDING_WALL_HEALTH, icon: BuildingIcon.HEALTH },
  ];

  static Texture = BuildingTexture.BLOCK;

  static Cost = DIFFICULTY.BUILDING_WALL_COST;

  static Health = DIFFICULTY.BUILDING_WALL_HEALTH;

  static Type = BuildingType.BUILDING;

  constructor(scene: IWorld, data: BuildingVariantData) {
    super(scene, {
      ...data,
      variant: BuildingVariant.BLOCK,
      health: BuildingBlock.Health,
      texture: BuildingBlock.Texture,
    });

    this.on(BuildingEvents.UPGRADE, this.upgradeMaxHealth, this);
  }

  private upgradeMaxHealth() {
    const health = DIFFICULTY.BUILDING_WALL_HEALTH + (
      DIFFICULTY.BUILDING_WALL_HEALTH_UPGRADE * (this.upgradeLevel - 1)
    );

    this.live.setMaxHealth(health);
  }
}
