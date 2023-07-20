import EventEmitter from 'events';

import { IWorld } from '~type/world';
import { BuildingVariant } from '~type/world/entities/building';
import { Vector2D } from '~type/world/level';

export interface IBuilder extends EventEmitter {
  readonly scene: IWorld

  /**
   * Build state.
   */
  readonly isBuild: boolean

  /**
   * Selected building variant.
   */
  readonly variant: Nullable<BuildingVariant>

  /**
   * Toggle build state and update build area.
   */
  update(): void

  /**
   * Set current building variant.
   */
  setBuildingVariant(variant: BuildingVariant): void

  /**
   * Unset building variant.
   */
  unsetBuildingVariant(): void

  /**
   * Add rubble foundation on position.
   * @param position - Position at matrix
   */
  addFoundation(position: Vector2D): void
}

export enum BuilderEvents {
  BUILD_START = 'build_start',
  BUILD_STOP = 'build_stop',
}
