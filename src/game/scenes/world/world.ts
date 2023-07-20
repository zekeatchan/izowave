import Phaser from 'phaser';

import { CONTROL_KEY } from '~const/controls';
import {
  WORLD_DEPTH_EFFECT, WORLD_FIND_PATH_RATE, WORLD_MAX_ZOOM, WORLD_MIN_ZOOM,
} from '~const/world';
import { Player } from '~entity/player';
import { Interface } from '~lib/interface';
import { sortByDistance } from '~lib/utils';
import { Builder } from '~scene/world/builder';
import { Level } from '~scene/world/level';
import { IGame, GameScene } from '~type/game';
import { IWorld, WorldEvents, WorldHint } from '~type/world';
import { IBuilder } from '~type/world/builder';
import { ParticlesList, ParticlesTexture, ParticlesType } from '~type/world/effects';
// import { BuildingVariant, IBuilding } from '~type/world/entities/building';
import { LiveEvents } from '~type/world/entities/live';
import { IPlayer } from '~type/world/entities/player';
import { ILevel, SpawnTarget, Vector2D } from '~type/world/level';

import { WorldUI } from './ui';

export class World extends Phaser.Scene implements IWorld {
  readonly game: IGame;

  private _entityGroups: Record<string, Phaser.GameObjects.Group>;

  public get entityGroups() { return this._entityGroups; }

  private set entityGroups(v) { this._entityGroups = v; }

  private _particles: ParticlesList = {};

  public get particles() { return this._particles; }

  private set particles(v) { this._particles = v; }

  private _player: IPlayer;

  public get player() { return this._player; }

  private set player(v) { this._player = v; }

  private _level: ILevel;

  public get level() { return this._level; }

  private set level(v) { this._level = v; }

  private _builder: IBuilder;

  public get builder() { return this._builder; }

  private set builder(v) { this._builder = v; }

  private nextFindPathTimestamp: number = 0;

  constructor() {
    super(GameScene.WORLD);
  }

  public create() {
    this.registerOptimization();

    this.makeLevel();

    this.input.setPollAlways();
  }

  public start() {
    new Interface(this, WorldUI);

    this.builder = new Builder(this);

    this.addEntityGroups();
    this.addPlayer();
    // this.addChests();
    this.addZoomControl();

    this.level.hideTiles();
  }

  public update() {
    if (!this.game.isStarted) {
      return;
    }
    this.player.update();
    // this.builder.update();
    this.level.updateVisibleTiles();
    // this.updateNPCPath();
  }

  public showHint(hint: WorldHint) {
    this.events.emit(WorldEvents.SHOW_HINT, hint);
  }

  public hideHint() {
    this.events.emit(WorldEvents.HIDE_HINT);
  }

  // public getBuildings() {
  //   return this.entityGroups.buildings.getChildren() as IBuilding[];
  // }

  // public getBuildingsByVariant(variant: BuildingVariant) {
  //   const buildings = this.getBuildings();

  //   return buildings.filter((building) => (building.variant === variant));
  // }

  private addEntityGroups() {
    this.entityGroups = {
      buildings: this.add.group({ runChildUpdate: true }),
    };
  }

  private makeLevel() {
    this.level = new Level(this);
  }

  private addPlayer() {
    const positions = this.level.readSpawnPositions(SpawnTarget.PLAYER);

    this.player = new Player(this, {
      positionAtMatrix: Phaser.Utils.Array.GetRandom(positions),
    });

    this.cameras.main.resetFX();
    this.cameras.main.startFollow(this.player);
    this.cameras.main.setZoom(1.3);
    this.cameras.main.zoomTo(1.0, 100);

    this.player.live.on(LiveEvents.DEAD, () => {
      this.game.finishGame();
    });
  }

  private addZoomControl() {
    this.input.on(
      CONTROL_KEY.MOUSE_WHEEL,
      (pointer: Phaser.Input.Pointer, gameObjects: Phaser.GameObjects.GameObject, deltaX: number, deltaY: number) => {
        const currentZoom = this.cameras.main.zoom;
        const zoomAmount = deltaY > 0 ? 1 - CONTROL_KEY.ZOOM_RATE : 1 + CONTROL_KEY.ZOOM_RATE;
        const nextZoom = Phaser.Math.Clamp(currentZoom * zoomAmount, WORLD_MIN_ZOOM, WORLD_MAX_ZOOM);
        this.cameras.main.zoomTo(nextZoom, CONTROL_KEY.ZOOM_DURATION);
      },
    );

    this.input.keyboard.on(CONTROL_KEY.ZOOM_IN, () => {
      const currentZoom = this.cameras.main.zoom;

      if (currentZoom < WORLD_MAX_ZOOM) {
        this.cameras.main.zoomTo(currentZoom + CONTROL_KEY.ZOOM_RATE, CONTROL_KEY.ZOOM_DURATION);
      }
    });

    this.input.keyboard.on(CONTROL_KEY.ZOOM_OUT, () => {
      const currentZoom = this.cameras.main.zoom;

      if (currentZoom > WORLD_MIN_ZOOM) {
        this.cameras.main.zoomTo(currentZoom - CONTROL_KEY.ZOOM_RATE, CONTROL_KEY.ZOOM_DURATION);
      }
    });
  }

  private registerOptimization() {
    const ref = this.scene.systems.displayList;

    ref.depthSort = () => {
      if (ref.sortChildrenFlag) {
        ref.list.sort(ref.sortByDepth);
        ref.sortChildrenFlag = false;
      }
    };
  }
}
