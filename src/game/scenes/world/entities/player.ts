import Phaser from 'phaser';

import { CONTROL_KEY } from '~const/controls';
import { DIFFICULTY } from '~const/world/difficulty';
import { PLAYER_TILE_SIZE, PLAYER_MOVE_DIRECTIONS, PLAYER_MOVE_ANIMATIONS, DIRECTIONS } from '~const/world/entities/player';
import { LEVEL_MAP_VISITED_TILE_TINT, TILE_META } from '~const/world/level';
import { Chest } from '~entity/chest';
import { Assistant } from '~entity/npc/variants/assistant';
import { Sprite } from '~entity/sprite';
import { registerAudioAssets, registerSpriteAssets } from '~lib/assets';
import { aroundPosition, calcGrowth } from '~lib/utils';
import { NoticeType } from '~type/screen';
import { IWorld } from '~type/world';
import { IAssistant } from '~type/world/entities/npc/assistant';
import { IEnemy } from '~type/world/entities/npc/enemy';
import {
  PlayerTexture, MovementDirection, PlayerAudio, PlayerData, IPlayer,
} from '~type/world/entities/player';
import { BiomeType, TileType, Vector2D } from '~type/world/level';
import { ITile } from '~type/world/level/tile-matrix';
import { WaveEvents } from '~type/world/wave';
import { Building } from './building';
import { BuildingVariant, BuildingWallOrientation } from '~type/world/entities/building';
import { BuildingWall } from './building/variants/wall';
import { Level } from '../level';
import { WORLD_COLLIDE_LOOK } from '~const/world';

export class Player extends Sprite implements IPlayer {
  private _level: number = 1;

  public get level() { return this._level; }

  private set level(v) { this._level = v; }

  private _experience: number = 0;

  public get experience() { return this._experience; }

  private set experience(v) { this._experience = v; }

  private _resources: number = DIFFICULTY.PLAYER_START_RESOURCES;

  public get resources() { return this._resources; }

  private set resources(v) { this._resources = v; }

  private _kills: number = 0;

  public get kills() { return this._kills; }

  private set kills(v) { this._kills = v; }

  private speed: number = DIFFICULTY.PLAYER_SPEED;

  private movementKeys: Nullable<Record<string, Phaser.Input.Keyboard.Key>> = null;

  private direction: number = 0;

  private directionVector: Vector2D = { x: 0, y: 0 };

  private isMoving: boolean = false;

  private assistant: Nullable<IAssistant> = null;

  private collisionGroups: TileType[] = [
    TileType.MAP,
    TileType.BUILDING,
    TileType.CHEST,
    TileType.TREE,
  ];

  constructor(scene: IWorld, data: PlayerData) {
    super(scene, {
      ...data,
      texture: PlayerTexture.PLAYER,
      health: DIFFICULTY.PLAYER_HEALTH,
    });
    scene.add.existing(this);

    this.registerKeyboard();
    this.registerAnimations();

    // this.addAssistant();

    this.body.setCircle(3, 5, 12);
    this.setScale(2.0);
    this.setOrigin(0.5, 0.75);

    this.setTilesGroundCollision(true);
    this.setTilesCollision(this.collisionGroups, (tile) => {
      if (tile instanceof Chest) {
        tile.open();
      }
    });

    this.scene.physics.add.collider(this, this.scene.entityGroups.enemies, (_, enemy: IEnemy) => {
      enemy.attack(this);
    });

    this.scene.wave.on(WaveEvents.COMPLETE, (number: number) => {
      this.onWaveComplete(number);
    });
  }

  public update() {
    super.update();

    if (this.live.isDead()) {
      return;
    }

    // this.addVisitedWay();
    this.updateDirection();
    this.updateVelocity();
  }

  public getNextExperience(level = 0) {
    return calcGrowth(
      DIFFICULTY.PLAYER_EXPERIENCE_TO_NEXT_LEVEL,
      DIFFICULTY.PLAYER_EXPERIENCE_TO_NEXT_LEVEL_GROWTH,
      this.level + level + 1,
    );
  }

  public giveExperience(amount: number) {
    if (this.live.isDead()) {
      return;
    }

    this.experience += amount;

    let experienceNeed = this.getNextExperience();
    let experienceLeft = this.experience;
    let level = 0;

    while (experienceLeft >= experienceNeed) {
      level++;
      experienceLeft -= experienceNeed;
      experienceNeed = this.getNextExperience(level);
    }

    if (level > 0) {
      this.experience = experienceLeft;
      this.addLevelProgress(level);
    }
  }

  public giveResources(amount: number) {
    if (this.live.isDead()) {
      return;
    }

    this.resources += amount;
  }

  public takeResources(amount: number) {
    this.resources -= amount;
  }

  public incrementKills() {
    this.kills++;
  }

  public onDead() {
    this.scene.cameras.main.zoomTo(2.0, 10 * 1000);
    this.scene.sound.play(PlayerAudio.DEAD);

    this.stopMovement();
    this.scene.tweens.add({
      targets: [this, this.container],
      alpha: 0.0,
      duration: 250,
    });
  }

  private addAssistant() {
    const positionAtMatrix = aroundPosition(this.positionAtMatrix, 1).find((spawn) => {
      const tileGround = this.scene.level.getTile({ ...spawn, z: 0 });

      return Boolean(tileGround);
    });

    this.assistant = new Assistant(this.scene, {
      positionAtMatrix: positionAtMatrix || this.positionAtMatrix,
    });

    this.assistant.upgrade(this.level);

    this.assistant.on(Phaser.Scenes.Events.DESTROY, () => {
      this.assistant = null;
    });
  }

  private addLevelProgress(count: number) {
    this.level += count;

    if (this.assistant) {
      this.assistant.upgrade(this.level);
    }

    const maxHealth = calcGrowth(
      DIFFICULTY.PLAYER_HEALTH,
      DIFFICULTY.PLAYER_HEALTH_GROWTH,
      this.level,
    );

    this.live.setMaxHealth(maxHealth);
    this.live.heal();

    this.scene.sound.play(PlayerAudio.LEVEL_UP);
    this.scene.game.screen.notice(NoticeType.INFO, 'LEVEL UP');
  }

  private onWaveComplete(number: number) {
    if (this.assistant) {
      this.assistant.live.heal();
    } else {
      this.addAssistant();
    }

    const experience = calcGrowth(
      DIFFICULTY.WAVE_EXPERIENCE,
      DIFFICULTY.WAVE_EXPERIENCE_GROWTH,
      number,
    );

    this.giveExperience(experience);
  }

  private registerKeyboard() {
    this.movementKeys = <Record<string, Phaser.Input.Keyboard.Key>>this.scene.input.keyboard.addKeys(
      CONTROL_KEY.MOVEMENT,
    );
  }

  private updateVelocity() {
    if (!this.isMoving) {
      this.setVelocity(0, 0);
      this.body.setImmovable(true);

      return;
    }

    const friction = this.currentGroundTile?.biome?.friction ?? 1;
    const speed = this.speed / friction;
    const velocity = this.scene.physics.velocityFromAngle(this.direction, speed);
    const tile = this.handleCollide(this.direction);
    let stopMoving = false;

    const targets:Array<Vector2D> = this.calculateCoordinates(TILE_META.width);

    if (tile) {
      if (tile.tileType === TileType.BUILDING) {
        const building = tile as Building;
        const isWall = building.variant === BuildingVariant.WALL;

        if (isWall) {
          const wall = building as BuildingWall;
          const orientation = wall.orientation
          const wallOrientation = orientation.split('');
          const top = Number(wallOrientation[0]);
          const right = Number(wallOrientation[1]);
          const bottom = Number(wallOrientation[2]);
          const left = Number(wallOrientation[3]);

          const positionAtMatrix = Level.ToMatrixPosition({ x: this.body.position.x, y: this.body.position.y });
          // const target = this.scene.physics.velocityFromAngle(this.direction, TILE_META.width * 0.5);
          const normalized = velocity.clone().normalize();
          const bodyRadius = this.body.width / 2;
          // const nextPosition = Level.ToMatrixPosition({
          //   x: this.body.position.x + (normalized.x * bodyRadius) + target.x,
          //   y: this.body.position.y + (normalized.y * bodyRadius) + target.y
          // });
          const positionAtWorld = Level.ToWorldPosition({ ...positionAtMatrix, z: 1 });
          const currentTile = this.scene.level.getTileWithType({ ...positionAtMatrix, z: 1 }, this.collisionGroups) as BuildingWall;

          if (orientation === BuildingWallOrientation.BLOCK) {
            stopMoving = true;
          } else if (orientation === BuildingWallOrientation.TOP) {
            if (this.directionVector.x < 0 || this.directionVector.y > 0) {
              stopMoving = true;
            } else {
              if (currentTile) {
                if (this.directionVector.y < 0) {
                  const offset:Vector2D = targets[DIRECTIONS.UP];
                  const limitY = positionAtWorld.y - offset.y;
                  const positionTop = Level.ToMatrixPosition({ x: this.body.position.x, y: this.body.position.y - offset.y });

                  if (this.body.position.y <= limitY) {
                    stopMoving = true;
                  }
                  console.log(positionAtMatrix, positionTop);
                  // console.log(this.body.position.y, positionAtWorld.y, limitY);
                }
              }
              // if (this.directionVector.x > 0 || this.directionVector.y < 0) {
              //   if (this.body.position.x >= limitX) stopMoving = true;
              //   if (this.body.position.y <= limitY) stopMoving = true;
              //   console.log(this.body.position.y, positionAtWorld.y, limitY);
              // }
            }
          } else {

          }


          // if (top && (velocity.x < 0 || velocity.y > 0)) return tile;
          // if (right && (velocity.x < 0 || velocity.y < 0)) return tile;
          // if (bottom && (velocity.x > 0 || velocity.y < 0)) return tile;
          // if (left && (velocity.x > 0 || velocity.y < 0)) return tile;
        } else {
          stopMoving = true;
        }
      }
    }

    if (stopMoving) {
      this.setVelocity(0, 0);
      this.body.setImmovable(true);
      return;
    }

    this.body.setImmovable(false);
    this.setVelocity(velocity.x, velocity.y);
  }

  private calculateCoordinates(radius: number): Array<Vector2D> {
    const widthToHeightRatio = TILE_META.perspective;
    const centerX = 0; // X-coordinate of the circle's center
    const centerY = 0; // Y-coordinate of the circle's center
    const numPoints = 8; // Number of equidistant points

    const coordinates:Array<Vector2D> = [];

    for (let i = 0; i < numPoints; i++) {
      const angle = (2 * Math.PI * i) / numPoints; // Calculate the angle for each point

      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * widthToHeightRatio * Math.sin(angle);
      const vector: Vector2D = { x: x, y: y };
      coordinates.push(vector);
    }

    return coordinates;
  }

  private updateDirection() {
    const x = this.getKeyboardSingleDirection([['LEFT', 'A'], ['RIGHT', 'D']]);
    const y = this.getKeyboardSingleDirection([['UP', 'W'], ['DOWN', 'S']]);
    const key = `${x}|${y}`;
    this.directionVector.x = x;
    this.directionVector.y = y;

    const oldMoving = this.isMoving;
    const oldDirection = this.direction;

    if (x !== 0 || y !== 0) {
      this.isMoving = true;
      this.direction = PLAYER_MOVE_DIRECTIONS[key];
    } else {
      this.isMoving = false;
    }

    if (oldMoving !== this.isMoving || oldDirection !== this.direction) {
      if (this.isMoving) {
        this.anims.play(PLAYER_MOVE_ANIMATIONS[key]);

        if (!oldMoving) {
          this.scene.game.sound.play(PlayerAudio.MOVE, {
            loop: true,
            rate: 1.8,
          });
        }
      } else {
        this.stopMovement();
      }
    }
  }

  private stopMovement() {
    if (this.anims.currentAnim) {
      this.anims.setProgress(0);
      this.anims.stop();
    }

    this.scene.sound.stopByKey(PlayerAudio.MOVE);
  }

  private getKeyboardSingleDirection(
    controls: [keyof typeof MovementDirection, string][],
  ) {
    for (const [core, alias] of controls) {
      if (this.movementKeys[core].isDown || this.movementKeys[alias].isDown) {
        return MovementDirection[core];
      }
    }

    return MovementDirection.NONE;
  }

  private addVisitedWay() {
    if (!this.currentGroundTile?.biome) {
      return;
    }

    if ([BiomeType.SAND, BiomeType.GRASS].includes(this.currentGroundTile.biome.type)) {
      this.currentGroundTile.setTint(LEVEL_MAP_VISITED_TILE_TINT);
    }
  }

  private registerAnimations() {
    let frameIndex = 0;

    for (const key of Object.values(PLAYER_MOVE_ANIMATIONS)) {
      this.scene.anims.create({
        key,
        frames: this.scene.anims.generateFrameNumbers(PlayerTexture.PLAYER, {
          start: frameIndex * 4,
          end: (frameIndex + 1) * 4 - 1,
        }),
        frameRate: 8,
        repeat: -1,
      });
      frameIndex++;
    }
  }
}

registerAudioAssets(PlayerAudio);
registerSpriteAssets(PlayerTexture, {
  width: PLAYER_TILE_SIZE[0],
  height: PLAYER_TILE_SIZE[1],
});
