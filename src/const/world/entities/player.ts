import { TILE_META } from '~const/world/level';
import { MovementDirection } from '~type/world/entities/player';

export const PLAYER_TILE_SIZE = [16, 16];

const {
  RIGHT, LEFT, UP, DOWN, NONE,
} = MovementDirection;

export const PLAYER_MOVE_DIRECTIONS = {
  [`${LEFT}|${UP}`]: 180 + TILE_META.deg,
  [`${LEFT}|${NONE}`]: 180,
  [`${LEFT}|${DOWN}`]: 180 - TILE_META.deg,
  [`${NONE}|${UP}`]: 270,
  [`${NONE}|${DOWN}`]: 90,
  [`${RIGHT}|${UP}`]: -TILE_META.deg,
  [`${RIGHT}|${NONE}`]: 0,
  [`${RIGHT}|${DOWN}`]: TILE_META.deg,
};

export const PLAYER_MOVE_ANIMATIONS = {
  [`${LEFT}|${UP}`]: 'move_left_up',
  [`${LEFT}|${NONE}`]: 'move_left',
  [`${LEFT}|${DOWN}`]: 'move_left_down',
  [`${NONE}|${UP}`]: 'move_up',
  [`${NONE}|${DOWN}`]: 'move_down',
  [`${RIGHT}|${UP}`]: 'move_right_up',
  [`${RIGHT}|${NONE}`]: 'move_right',
  [`${RIGHT}|${DOWN}`]: 'move_right_down',
};

export const DIRECTIONS = {
  [`${RIGHT}|${NONE}`]: 0,
  [`${RIGHT}|${DOWN}`]: 1,
  [`${NONE}|${DOWN}`]: 2,
  [`${LEFT}|${DOWN}`]: 3,
  [`${LEFT}|${NONE}`]: 4,
  [`${LEFT}|${UP}`]: 5,
  [`${NONE}|${UP}`]: 6,
  [`${RIGHT}|${UP}`]: 7,
};
