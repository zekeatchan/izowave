import Phaser from 'phaser';

import { WORLD_COLLIDE_LOOK } from '~const/world';
import { equalPositions } from '~lib/utils';
import { Particles } from '~scene/world/effects';
import { Level } from '~scene/world/level';
import { Live } from '~scene/world/live';
import { IWorld } from '~type/world';
import { ParticlesType } from '~type/world/effects';
import { ILive, LiveEvents } from '~type/world/entities/live';
import { ISprite, SpriteData } from '~type/world/entities/sprite';
import { BiomeType, TileType, Vector2D } from '~type/world/level';
import { ITile } from '~type/world/level/tile-matrix';
import { Building } from './building';
import { BuildingVariant } from '~type/world/entities/building';
import { BuildingWall } from './building/variants/wall';

export class Sprite extends Phaser.Physics.Arcade.Sprite implements ISprite {
  readonly scene: IWorld;

  readonly body: Phaser.Physics.Arcade.Body;

  readonly live: ILive;

  readonly container: Phaser.GameObjects.Container;

  public currentGroundTile: Nullable<ITile> = null;

  private _positionAtMatrix: Vector2D;

  public get positionAtMatrix() { return this._positionAtMatrix; }

  private set positionAtMatrix(v) { this._positionAtMatrix = v; }

  private collisionTargets: TileType[] = [];

  private collisionHandler: Nullable<(tile: Phaser.GameObjects.Image) => void> = null;

  private collisionGround: boolean = false;

  private healthIndicator: Phaser.GameObjects.Container;

  constructor(scene: IWorld, {
    texture, positionAtMatrix, health, frame = 0,
  }: SpriteData) {
    const positionAtWorld = Level.ToWorldPosition({
      ...positionAtMatrix,
      z: 0,
    });

    super(scene, positionAtWorld.x, positionAtWorld.y, texture, frame);
    scene.add.existing(this);

    this.positionAtMatrix = positionAtMatrix;
    this.live = new Live(health);
    this.container = this.scene.add.container(this.x, this.y);

    this.addHealthIndicator();

    this.scene.physics.world.enable(this, Phaser.Physics.Arcade.DYNAMIC_BODY);
    this.setPushable(false);

    this.live.on(LiveEvents.DAMAGE, () => {
      this.onDamage();
    });
    this.live.on(LiveEvents.DEAD, () => {
      this.onDead();
    });
    this.on(Phaser.GameObjects.Events.DESTROY, () => {
      this.container.destroy();
    });
  }

  public update() {
    super.update();

    this.positionAtMatrix = Level.ToMatrixPosition(this);
    this.currentGroundTile = this.scene.level.getTile({ ...this.positionAtMatrix, z: 0 });

    this.container.setVisible(this.visible);
    if (this.visible) {
      const position = this.getTopCenter();

      this.container.setPosition(position.x, position.y);

      const depth = Level.GetDepth(this.y, 1, this.displayHeight);

      this.setDepth(depth);
      this.container.setDepth(depth);

      this.updateHealthIndicator();
    }
  }

  public isStopped() {
    return equalPositions(this.body.velocity, { x: 0, y: 0 });
  }

  public getAllPositionsAtMatrix() {
    return this.getCorners().map((point) => Level.ToMatrixPosition(point));
  }

  public setTilesCollision(
    targets: TileType[],
    handler: (tile: Phaser.GameObjects.Image) => void,
  ) {
    this.collisionTargets = targets;
    this.collisionHandler = handler;
  }

  public setTilesGroundCollision(state: boolean) {
    this.collisionGround = state;
  }

  public handleCollide(direction: number) {
    const tile = this.getCollidedTile(direction);

    if (this.collisionHandler && tile instanceof Phaser.GameObjects.Image) {
      this.collisionHandler(tile);
    }

    return tile;
  }

  private getCollidedTile(direction: number) {
    if (this.collisionTargets.length === 0 && !this.collisionGround) {
      return null;
    }

    const target = this.scene.physics.velocityFromAngle(direction, WORLD_COLLIDE_LOOK);
    const occupiedTiles = this.getCorners().map((point) => Level.ToMatrixPosition({
      x: point.x + target.x,
      y: point.y + target.y,
    }));

    for (const positionAtMatrix of occupiedTiles) {
      const tile = this.scene.level.getTileWithType({ ...positionAtMatrix, z: 1 }, this.collisionTargets);

      if (tile) return tile;

      if (this.collisionGround) {
        const tileGround = this.scene.level.getTile({ ...positionAtMatrix, z: 0 });
        if (!tileGround || tileGround.biome?.type === BiomeType.WATER) {
          return tile;
        }
      }
    }

    return null;
  }

  public getCorners() {
    const count = 8;
    const r = this.body.width / 2;
    const l = Phaser.Math.PI2 / count;

    const points: Vector2D[] = [];

    for (let u = 0; u < count; u++) {
      points.push({
        x: (this.body.position.x + r) + Math.sin(u * l) * r,
        y: (this.body.position.y + r) - Math.cos(u * l) * r,
      });
    }

    return points;
  }

  private addHealthIndicator() {
    const width = this.displayWidth * 1.5;
    const body = this.scene.add.rectangle(0, 0, width, 6, 0x000000);

    body.setOrigin(0.0, 0.0);

    const bar = this.scene.add.rectangle(1, 1, 0, 0, 0xe4372c);

    bar.setOrigin(0.0, 0.0);

    this.healthIndicator = this.scene.add.container(-width / 2, -13);
    this.healthIndicator.setSize(body.width, body.height);
    this.healthIndicator.add([body, bar]);

    this.container.add(this.healthIndicator);
  }

  private updateHealthIndicator() {
    const value = this.live.health / this.live.maxHealth;
    const bar = <Phaser.GameObjects.Rectangle>this.healthIndicator.getAt(1);

    bar.setSize((this.healthIndicator.width - 2) * value, this.healthIndicator.height - 2);
  }

  public onDamage() {
    if (!this.visible) {
      return;
    }

    new Particles(this, {
      type: ParticlesType.BIT,
      duration: 250,
      params: {
        follow: this,
        lifespan: { min: 100, max: 250 },
        scale: { start: 1.0, end: 0.5 },
        speed: 100,
        maxParticles: 6,
        tint: 0xdd1e1e,
      },
    });
  }

  public onDead() {
    if (this.visible) {
      this.anims.stop();
      this.scene.tweens.add({
        targets: [this, this.container],
        alpha: 0.0,
        duration: 250,
        onComplete: () => {
          this.destroy();
        },
      });
    } else {
      this.destroy();
    }
  }
}
