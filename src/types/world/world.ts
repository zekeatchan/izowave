import Phaser from 'phaser';

import { IGame, IScene } from '~type/game';
import { IBuilder } from '~type/world/builder';
import { ParticlesList } from '~type/world/effects';
import { BuildingVariant, IBuilding } from '~type/world/entities/building';
// import { EnemyVariant, IEnemy } from '~type/world/entities/npc/enemy';
import { IPlayer } from '~type/world/entities/player';
import { ILevel, Vector2D } from '~type/world/level';

export interface IWorld extends IScene {
  readonly game: IGame

  /**
   * Player.
   */
  readonly player: IPlayer

  /**
   * Level.
   */
  readonly level: ILevel

  /**
   * Builder.
   */
  readonly builder: IBuilder

  /**
   * Groups of entities.
   */
  readonly entityGroups: Record<string, Phaser.GameObjects.Group>

  /**
   * Particles manager.
   */
  readonly particles: ParticlesList

  /**
   * Start world.
   */
  start(): void

  /**
   * Show hint on world.
   * @param hint - Hint data
   */
  showHint(hint: WorldHint): void

  /**
   * Hide hint from world.
   */
  hideHint(): void
}

export enum WorldEvents {
  SELECT_BUILDING = 'select_building',
  UNSELECT_BUILDING = 'unselect_building',
  SHOW_HINT = 'show_hint',
  HIDE_HINT = 'hide_hint',
}

export type WorldHint = {
  side: 'left' | 'right' | 'top' | 'bottom'
  text: string
  position: Vector2D
};

export type WorldParams = {
  width: number
  height: number
};