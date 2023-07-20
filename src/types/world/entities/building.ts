import Phaser from 'phaser';

import { IWorld } from '~type/world';
import { IParticlesParent } from '~type/world/effects';
import { Vector2D } from '~type/world/level';

import { ILive } from './live';

export interface IBuilding extends Phaser.GameObjects.Image, IParticlesParent {
  readonly scene: IWorld

  /**
   * Health management.
   */
  readonly live: ILive

  /**
   * Current upgrade level.
   */
  readonly upgradeLevel: number

  /**
   * Position at matrix.
   */
  readonly positionAtMatrix: Vector2D

  /**
   * Variant name.
   */
  readonly variant: BuildingVariant

  /**
   * Has alert state.
   */
  readonly hasAlert: boolean

  /**
   * Is cursor on building.
   */
  readonly isFocused: boolean

  /**
   * Check is position inside action area.
   * @param position - Position at world
   */
  actionsAreaContains(position: Vector2D): boolean

  /**
   * Pause actions.
   */
  pauseActions(): void

  /**
   * Check is actions not paused.
   */
  isAllowAction(): boolean

  /**
   * Get building information params.
   */
  getInfo(): BuildingParam[]

  /**
   * Get building controls.
   */
  getControls(): BuildingControl[]

  /**
   * Get building meta.
   */
  getMeta(): IBuildingFactory

  /**
   * Get actions radius.
   */
  getActionsRadius(): number

}

export interface IBuildingAmmunition extends IBuilding {
  /**
   * Current ammo count.
   */
  readonly ammo: number

  /**
   * Use ammunition.
   * Returns count of ammo which was used.
   */
  use(amount: number): number
}

export interface IBuildingTower extends IBuilding {
  /**
   * Current ammo in clip.
   */
  readonly ammo: number
}

export interface IBuildingWall extends IBuilding {
  /**
   * Current ammo in clip.
   */
  readonly top: boolean
  readonly bottom: boolean
  readonly left: boolean
  readonly right: boolean
  Texture: WallTexture
}

export enum WallVariant {
  NORMAL = 'NORMAL',
  DOOR = 'DOOR',
  WINDOW = 'WINDOW',
}

export enum WallTexture {
  WALL = 'building/wall',
  DOOR = 'building/door',
}

export interface IBuildingFactory {
  Name: string
  Description: string
  Params: BuildingParam[]
  Texture: BuildingTexture
  Type: BuildingType
  Cost: number
  Health: number
  Limit?: number
  AllowByWave?: number
  new (scene: IWorld, data: BuildingVariantData): IBuilding
}

export enum BuildingEvents {
  UPGRADE = 'upgrade',
}

export enum BuildingVariant {
  WALL = 'WALL',
  BLOCK = 'BLOCK',
}

export enum BuildingType {
  WALL = 'WALL',
  BUILDING = 'BUILDING',
  FOUNDATION = 'FOUNDATION',
}

export enum BuildingTexture {
  WALL = 'building/wall',
  BLOCK = 'building/block',
  TOWER_FIRE = 'building/tower_fire',
  TOWER_FROZEN = 'building/tower_frozen',
  TOWER_LAZER = 'building/tower_lazer',
  GENERATOR = 'building/generator',
  AMMUNITION = 'building/ammunition',
  MEDIC = 'building/medic',
}

export enum BuildingUiTexture {
  UI = 'building/ui',
}

export enum BuildingWallOrientation {
  TOP_LEFT = '1001', //TOP-RIGHT-BOTTOM-LEFT
  TOP_RIGHT = '1100',
  BOTTOM_RIGHT = '0110',
  BOTTOM_LEFT = '0011',
  TOP = '1000',
  RIGHT = '0100',
  BOTTOM = '0010',
  LEFT = '0001',
  TOP_END = '1101',
  RIGHT_END = '1110',
  BOTTOM_END = '0111',
  LEFT_END = '1011',
  HORIZONTAL = '1010',
  VERTICAL = '0101',
  BLOCK = '1111',
}

export enum BuildingWallState {
  TOP_LEFT = 0,
  TOP_RIGHT = 1,
  BOTTOM_RIGHT = 2,
  BOTTOM_LEFT = 3,
  TOP = 4,
  RIGHT = 5,
  BOTTOM = 6,
  LEFT = 7,
  TOP_END = 8,
  RIGHT_END = 9,
  BOTTOM_END = 10,
  LEFT_END = 11,
  HORIZONTAL = 12,
  VERTICAL = 13,
  BLOCK = 14,
}

export enum BuildingUiState {
  BUILDING_VALID = 0,
  BUILDING_INVALID = 1,
  WALL_VALID = 2,
  WALL_INVALID = 3,
  WALL_BLOCK_VALID = 4,
  WALL_BLOCK_INVALID = 5,
  WALL_TOP_LEFT_VALID = 8,
  WALL_TOP_LEFT_INVALID = 9,
  WALL_TOP_RIGHT_VALID = 10,
  WALL_TOP_RIGHT_INVALID = 11,
  WALL_BOTTOM_RIGHT_VALID = 12,
  WALL_BOTTOM_RIGHT_INVALID = 13,
  WALL_BOTTOM_LEFT_VALID = 14,
  WALL_BOTTOM_LEFT_INVALID = 15,
  WALL_TOP_VALID = 16,
  WALL_TOP_INVALID = 17,
  WALL_RIGHT_VALID = 18,
  WALL_RIGHT_INVALID = 19,
  WALL_BOTTOM_VALID = 20,
  WALL_BOTTOM_INVALID = 21,
  WALL_LEFT_VALID = 22,
  WALL_LEFT_INVALID = 23,
  WALL_TOP_END_VALID = 24,
  WALL_TOP_END_INVALID = 25,
  WALL_RIGHT_END_VALID = 26,
  WALL_RIGHT_END_INVALID = 27,
  WALL_BOTTOM_END_VALID = 28,
  WALL_BOTTOM_END_INVALID = 29,
  WALL_LEFT_END_VALID = 30,
  WALL_LEFT_END_INVALID = 31,
  WALL_HORIZONTAL_VALID = 32,
  WALL_HORIZONTAL_INVALID = 33,
  WALL_VERTICAL_VALID = 34,
  WALL_VERTICAL_INVALID = 35,
}

export enum BuildingAudio {
  SELECT = 'building/select',
  UNSELECT = 'building/unselect',
  BUILD = 'building/build',
  UPGRADE = 'building/upgrade',
  DEAD = 'building/dead',
  REMOVE = 'building/remove',
  FAILURE = 'building/failure',
  OVER = 'building/over',
  RELOAD = 'building/reload',
}

export enum BuildingIcon {
  HEALTH = 0,
  RADIUS = 1,
  AMMO = 2,
  HEAL = 3,
  DAMAGE = 4,
  RESOURCES = 5,
  PAUSE = 6,
  SPEED = 7,
}

export enum BuildingOutlineState {
  NONE = 'NONE',
  FOCUSED = 'FOCUSED',
  SELECTED = 'SELECTED',
  ALERT = 'ALERT',
}

export type BuildingActionsParams = {
  radius?: number
  pause?: number
};

export type BuildingParam = {
  label: string
  value: string | number
  icon: BuildingIcon
  attention?: boolean
};

export type BuildingControl = {
  label: string
  cost?: number
  onClick: () => void
};

export type BuildingVariantData = {
  positionAtMatrix: Vector2D
  wall: WallVariantData
};

export type WallVariantData = {
  frame: number
  orientation: string
};

export type BuildingData = BuildingVariantData & {
  variant: BuildingVariant
  health: number
  texture: BuildingTexture
  actions?: BuildingActionsParams
};
