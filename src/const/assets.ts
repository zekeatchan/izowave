import 'phaser';

export const ASSETS_PATH = {
  audio: 'assets/audio/',
  image: 'assets/images/',
  spritesheet: 'assets/images/',
  json: 'assets/json/',
  tilemapJSON: 'assets/json/',
};

export const ASSETS = {
  PLAYER: {
    audio: {
      LEVEL_UP: { key: 'player/level_up' },
      MOVE: { key: 'player/move' },
      DEAD: { key: 'player/dead' },
    },
    spritesheet: {
      PLAYER: {
        key: 'player',
        frameConfig: {
          frameWidth: 128,
          frameHeight: 128,
        },
      },
    },
  },
  MAP: {
    json: {
      MASTER: {
        key: 'master',
      },
    },
  },
};
