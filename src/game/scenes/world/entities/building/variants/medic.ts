import { DIFFICULTY } from '~const/world/difficulty';
import { Particles } from '~scene/world/effects';
import { IWorld } from '~type/world';
import { ParticlesType } from '~type/world/effects';
import {
  BuildingVariant, BuildingTexture, BuildingParam, BuildingVariantData, BuildingIcon, BuildingType,
} from '~type/world/entities/building';
import { IPlayer } from '~type/world/entities/player';

import { Building } from '../building';

export class BuildingMedic extends Building {
  static Name = 'Medic';

  static Description = 'Heals player, that are in radius of this building';

  static Params: BuildingParam[] = [
    { label: 'HEALTH', value: DIFFICULTY.BUILDING_MEDIC_HEALTH, icon: BuildingIcon.HEALTH },
    { label: 'HEAL', value: DIFFICULTY.BUILDING_MEDIC_HEAL_AMOUNT, icon: BuildingIcon.HEAL },
  ];

  static Texture = BuildingTexture.MEDIC;

  static Type = BuildingType.BUILDING;

  static Cost = DIFFICULTY.BUILDING_MEDIC_COST;

  static Health = DIFFICULTY.BUILDING_MEDIC_HEALTH;

  static Limit = DIFFICULTY.BUILDING_MEDIC_LIMIT;

  static AllowByWave = DIFFICULTY.BUILDING_MEDIC_ALLOW_BY_WAVE;

  constructor(scene: IWorld, data: BuildingVariantData) {
    super(scene, {
      ...data,
      variant: BuildingVariant.MEDIC,
      health: BuildingMedic.Health,
      texture: BuildingMedic.Texture,
      actions: {
        radius: DIFFICULTY.BUILDING_MEDIC_HEAL_RADIUS,
        pause: DIFFICULTY.BUILDING_MEDIC_HEAL_PAUSE,
      },
    });
  }

  public update() {
    super.update();

    if (!this.isAllowAction()) {
      return;
    }

    if (this.scene.player.live.isMaxHealth()) {
      return;
    }

    if (!this.actionsAreaContains(this.scene.player)) {
      return;
    }

    this.heal(this.scene.player);
    this.pauseActions();
  }

  public getInfo() {
    return [
      ...super.getInfo(), {
        label: 'HEAL',
        icon: BuildingIcon.HEAL,
        value: this.getHealAmount(),
      },
    ];
  }

  private getHealAmount() {
    return DIFFICULTY.BUILDING_MEDIC_HEAL_AMOUNT + (
      DIFFICULTY.BUILDING_MEDIC_HEAL_AMOUNT_UPGRADE * (this.upgradeLevel - 1)
    );
  }

  private heal(player: IPlayer) {
    const health = this.getHealAmount();

    player.live.addHealth(health);

    if (this.visible) {
      new Particles(this, {
        type: ParticlesType.BIT,
        duration: 500,
        params: {
          x: this.x,
          y: this.y,
          lifespan: { min: 100, max: 300 },
          scale: { start: 1.0, end: 0.5 },
          speed: 100,
          maxParticles: 6,
          alpha: 0.75,
        },
      });
    }
  }
}
