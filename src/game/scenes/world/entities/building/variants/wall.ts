import { DIFFICULTY } from '~const/world/difficulty';
import { IWorld } from '~type/world';
import {
  BuildingEvents, BuildingVariant, BuildingTexture, BuildingParam, BuildingVariantData, BuildingIcon, BuildingType, WallVariantData,
} from '~type/world/entities/building';

import { Building } from '../building';
import { ITile } from '~type/world/level/tile-matrix';

export class BuildingWall extends Building implements ITile {
  static Name = 'Wall';

  static Description = 'Wall with more health to defend other buildings';

  static Params: BuildingParam[] = [
    { label: 'HEALTH', value: DIFFICULTY.BUILDING_WALL_HEALTH, icon: BuildingIcon.HEALTH },
  ];

  static Texture = BuildingTexture.WALL;

  static Cost = DIFFICULTY.BUILDING_WALL_COST;

  static Health = DIFFICULTY.BUILDING_WALL_HEALTH;

  static Type = BuildingType.WALL;

  readonly orientation: string;

  constructor(scene: IWorld, data: BuildingVariantData) {
    super(scene, {
      ...data,
      variant: BuildingVariant.WALL,
      health: BuildingWall.Health,
      texture: BuildingWall.Texture,
    });

    this.orientation = data.wall.orientation;
    this.setFrame(data.wall.frame);
    this.on(BuildingEvents.UPGRADE, this.upgradeMaxHealth, this);
  }

  private upgradeMaxHealth() {
    const health = DIFFICULTY.BUILDING_WALL_HEALTH + (
      DIFFICULTY.BUILDING_WALL_HEALTH_UPGRADE * (this.upgradeLevel - 1)
    );

    this.live.setMaxHealth(health);
  }
}
