import EventEmitter from 'events';

import Phaser from 'phaser';

import { DIFFICULTY } from '~const/world/difficulty';
import { BUILDINGS } from '~const/world/entities/buildings';
import { TILE_META } from '~const/world/level';
import { calcGrowth, equalPositions } from '~lib/utils';
import { Level } from '~scene/world/level';
import { NoticeType } from '~type/screen';
import { TutorialStep, TutorialStepState } from '~type/tutorial';
import { IWorld } from '~type/world';
import { BuilderEvents, IBuilder } from '~type/world/builder';
import { BuildingAudio, BuildingVariant, BuildingUiState, BuildingUiTexture, BuildingType, BuildingWallState, BuildingTexture, BuildingVariantData, WallVariantData, BuildingWallOrientation } from '~type/world/entities/building';
import { BiomeType, BuildData, TileType, Vector2D } from '~type/world/level';

// import { WaveEvents } from '~type/world/wave';

export class Builder extends EventEmitter implements IBuilder {
  readonly scene: IWorld;

  private _isBuild: boolean = false;

  public get isBuild() { return this._isBuild; }

  private set isBuild(v) { this._isBuild = v; }

  private buildStartPosition: Vector2D = null;

  private buildCurrentPosition: Vector2D = null;

  private buildCornerOffset: Vector2D = null;

  private buildingList: Array<BuildData> = null;

  private buildPreviewGroup: Phaser.GameObjects.Group = null;

  private buildArea: Nullable<Phaser.GameObjects.Ellipse> = null;

  private buildAreaRadius: number = 0;

  private buildingPreview: Nullable<Phaser.GameObjects.Image> = null;

  private placementPreview: Nullable<Phaser.GameObjects.Image> = null;

  private _variant: Nullable<BuildingVariant> = null;

  public get variant() { return this._variant; }

  private set variant(v) { this._variant = v; }

  constructor(scene: IWorld) {
    super();

    this.scene = scene;

    setTimeout(() => {
      this.scene.game.tutorial.beg(TutorialStep.BUILD_TOWER_FIRE);
    }, 500);

    this.scene.input.keyboard.on(Phaser.Input.Keyboard.Events.ANY_KEY_UP, (e: KeyboardEvent) => {
      // clear selected building or d
      // if (e.key === 'Backspace') {
      //   this.unsetBuildingVariant();
      // } else 
      if (Number(e.key) <= 2) {
        this.switchBuildingVariant(Number(e.key) - 1);
      } else {
        this.unsetBuildingVariant();
      }
    });

    this.buildPreviewGroup = this.scene.add.group();

    // this.scene.wave.on(WaveEvents.START, () => {
    //   this.clearBuildingVariant();
    // });

    // this.scene.game.tutorial.bind(TutorialStep.BUILD_AMMUNITION, {
    //   beg: () => {
    //     this.scene.setTimePause(true);
    //   },
    //   end: () => {
    //     this.scene.setTimePause(false);
    //     this.clearBuildingVariant();
    //   },
    // });
    // this.scene.game.tutorial.bind(TutorialStep.BUILD_GENERATOR, {
    //   end: () => {
    //     this.scene.setTimePause(false);
    //     this.clearBuildingVariant();
    //   },
    // });
    // this.scene.game.tutorial.bind(TutorialStep.BUILD_TOWER_FIRE, {
    //   end: () => {
    //     this.clearBuildingVariant();
    //   },
    // });
  }

  public update() {
    if (this.isCanBuild()) {
      if (this.isBuild) {
        // this.updateBuildArea();
      } else {
        this.openBuilder();
      }
    } else if (this.isBuild) {
      this.closeBuilder();
    }
  }

  public setBuildingVariant(variant: BuildingVariant) {
    if (this.scene.wave.isGoing || this.variant === variant) {
      return;
    }

    if (!this.isBuildingAllowByTutorial(variant)) {
      return;
    }

    const BuildingInstance = BUILDINGS[variant];

    if (!this.isBuildingAllowByWave(variant)) {
      // eslint-disable-next-line max-len
      this.scene.game.screen.notice(NoticeType.ERROR, `${BuildingInstance.Name} WILL BE AVAILABLE ON ${BuildingInstance.AllowByWave} WAVE`);

      return;
    }

    if (this.isBuildingLimitReached(variant)) {
      this.scene.game.screen.notice(NoticeType.ERROR, `YOU HAVE MAXIMUM ${BuildingInstance.Name}`);

      return;
    }

    this.scene.sound.play(BuildingAudio.SELECT);

    this.variant = variant;

    // if (this.buildingPreview) {
    //   this.buildingPreview.setTexture(BuildingInstance.Texture);
    // }
    this.drawBuildingPlacementPreview();
  }

  public unsetBuildingVariant() {
    if (this.scene.wave.isGoing || this.variant === null) {
      return;
    }

    this.scene.sound.play(BuildingAudio.UNSELECT);

    this.clearBuildingVariant();
  }

  public addFoundation(position: Vector2D) {
    for (let y = position.y - 1; y <= position.y + 1; y++) {
      for (let x = position.x - 1; x <= position.x + 1; x++) {
        const tileGround = this.scene.level.getTile({ x, y, z: 0 });

        if (tileGround?.biome?.solid) {
          // Replace biome
          const newBiome = Level.GetBiome(BiomeType.RUBBLE);

          if (newBiome) {
            const frame = Array.isArray(newBiome.tileIndex)
              ? Phaser.Math.Between(...newBiome.tileIndex)
              : newBiome.tileIndex;

            tileGround.setFrame(frame);
            tileGround.clearTint();
            tileGround.biome = newBiome;
          }

          // Remove trees
          const tile = this.scene.level.getTileWithType({ x, y, z: 1 }, TileType.TREE);

          if (tile) {
            tile.destroy();
          }

          // Remove effects
          const effects = <Phaser.GameObjects.Image[]>this.scene.level.effects.getChildren();

          effects.forEach((effect) => {
            if (equalPositions(Level.ToMatrixPosition(effect), { x, y })) {
              effect.destroy();
            }
          });
        }
      }
    }
  }

  public isBuildingAllowByTutorial(variant: BuildingVariant) {
    if (this.scene.game.tutorial.state(TutorialStep.WAVE_TIMELEFT) === TutorialStepState.BEG) {
      return false;
    }

    for (const [step, allowedVariant] of <[TutorialStep, BuildingVariant][]>[
      [TutorialStep.BUILD_TOWER_FIRE, BuildingVariant.TOWER_FIRE],
      [TutorialStep.BUILD_GENERATOR, BuildingVariant.GENERATOR],
      [TutorialStep.BUILD_AMMUNITION, BuildingVariant.AMMUNITION],
    ]) {
      if (this.scene.game.tutorial.state(step) === TutorialStepState.BEG) {
        return (variant === allowedVariant);
      }
    }

    return true;
  }

  public isBuildingAllowByWave(variant: BuildingVariant) {
    const waveAllowed = BUILDINGS[variant].AllowByWave;

    if (waveAllowed) {
      return (waveAllowed <= this.scene.wave.number);
    }

    return true;
  }

  public getBuildingLimit(variant: BuildingVariant): Nullable<number> {
    const limit = BUILDINGS[variant].Limit;

    return limit ? limit * this.scene.wave.getSeason() : null;
  }

  private getAssumedTilePosition() {
    return Level.ToMatrixPosition({
      x: this.scene.input.activePointer.worldX,
      y: this.scene.input.activePointer.worldY,
    });
  }

  private getAssumedCornerPosition(positionAtWorld: Vector2D) {
    const { width, height, origin, deg } = TILE_META;

    const offset: Vector2D = {
      x: this.scene.input.activePointer.worldX - positionAtWorld.x,
      y: this.scene.input.activePointer.worldY - positionAtWorld.y - ((height * origin) * 2),
    }

    const angle: number = Math.atan2(offset.y, offset.x);
    const degrees: number = angle * (180 / Math.PI);
    const leftAngle = 180 - deg;
    const rightAngle = deg;
    const cornerOffset: Vector2D = {
      x: 0,
      y: 0,
    }

    if (Math.abs(degrees) < rightAngle) {
      cornerOffset.x = width * 0.5;
    } else if (Math.abs(degrees) > leftAngle) {
      cornerOffset.x = -width * 0.5;
    } else {
      if (degrees < 0) {
        cornerOffset.y = -(height * origin)
      } else {
        cornerOffset.y = height * origin
      }
    }

    return cornerOffset;
  }

  private openBuilder() {
    if (this.isBuild) {
      return;
    }

    // this.drawBuildAreaRadius();
    // this.drawBuildingPlacementPreview();

    this.scene.input.on(Phaser.Input.Events.POINTER_DOWN, this.buildStart, this);
    this.scene.input.on(Phaser.Input.Events.POINTER_UP, this.buildEnd, this);
    this.scene.input.on(Phaser.Input.Events.POINTER_MOVE, this.updateBuildingPreview, this);

    this.isBuild = true;

    this.emit(BuilderEvents.BUILD_START);
  }

  private closeBuilder() {
    if (!this.isBuild) {
      return;
    }

    this.scene.input.off(Phaser.Input.Events.POINTER_DOWN, this.buildStart);
    this.scene.input.off(Phaser.Input.Events.POINTER_UP, this.buildEnd);
    this.scene.input.off(Phaser.Input.Events.POINTER_MOVE, this.updateBuildingPreview);

    this.destroyBuildingPreview();
    // this.destroyBuildAreaRadius();
    this.isBuild = false;

    this.emit(BuilderEvents.BUILD_STOP);
  }

  private clearBuildingVariant() {
    this.closeBuilder();
    this.variant = null;
  }

  private switchBuildingVariant(index: number) {
    const variant = Object.values(BuildingVariant)[index];

    if (variant) {
      if (this.variant === variant) {
        this.unsetBuildingVariant();
      } else {
        this.setBuildingVariant(variant);
      }
    }
  }

  private isCanBuild() {
    return (
      this.variant !== null
      && !this.scene.wave.isGoing
      && !this.scene.player.live.isDead()
      && this.scene.player.isStopped()
    );
  }

  private isAllowBuild(positionAtMatrix: Vector2D = this.getAssumedTilePosition(), checkPlayerPosition: boolean = false) {
    // Pointer in build area
    // const positionAtWorldDown = Level.ToWorldPosition({ ...positionAtMatrix, z: 0 });
    // const offset = this.buildArea.getTopLeft();
    // const inArea = this.buildArea.geom.contains(
    //   positionAtWorldDown.x - offset.x,
    //   positionAtWorldDown.y - offset.y,
    // );

    // if (!inArea) {
    //   return false;
    // }

    // Pointer biome is solid
    const tileGround = this.scene.level.getTile({ ...positionAtMatrix, z: 0 });

    if (!tileGround?.biome?.solid) {
      return false;
    }

    // Pointer does not contain player or other buildings
    const isOccupied = this.scene.level.isFreePoint({ ...positionAtMatrix, z: 1 });

    const playerPositionsAtMatrix = this.scene.player.getAllPositionsAtMatrix();
    const hasPlayer = playerPositionsAtMatrix.some((point) => equalPositions(positionAtMatrix, point));

    if (!isOccupied) {
      return false;
    }

    if (hasPlayer && checkPlayerPosition) {
      return false;
    }

    return true;
  }

  private buildStart() {
    this.buildStartPosition = this.buildCurrentPosition;
  }

  private buildEnd() {
    // if (!this.buildingPreview.visible) {
    //   return;
    // }

    if (!this.isAllowBuild()) {
      this.scene.sound.play(BuildingAudio.FAILURE);

      return;
    }

    // const BuildingInstance = BUILDINGS[this.variant];

    // if (this.scene.player.resources < BuildingInstance.Cost) {
    //   this.scene.game.screen.notice(NoticeType.ERROR, 'NOT ENOUGH RESOURCES');

    //   return;
    // }

    // this.scene.player.takeResources(BuildingInstance.Cost);
    // this.scene.player.giveExperience(DIFFICULTY.BUILDING_BUILD_EXPERIENCE);

    // if (this.isBuildingLimitReached(this.variant)) {
    //   this.clearBuildingVariant();
    // }

    // this.placementPreview.setFrame(BuildingUiState.PLACE);
    // this.placementPreview.setAlpha(1);

    const BuildingInstance = BUILDINGS[this.variant];

    for (let i = 0; i < this.buildingList.length; i++) {
      const buildData: BuildData = this.buildingList[i];

      new BuildingInstance(this.scene, buildData);
    }
    this.clearBuildingPreview();
    this.scene.sound.play(BuildingAudio.BUILD);

    // switch (TutorialStepState.BEG) {
    //   case this.scene.game.tutorial.state(TutorialStep.BUILD_TOWER_FIRE): {
    //     this.scene.game.tutorial.end(TutorialStep.BUILD_TOWER_FIRE);
    //     this.scene.game.tutorial.beg(TutorialStep.BUILD_GENERATOR);
    //     break;
    //   }
    //   case this.scene.game.tutorial.state(TutorialStep.BUILD_GENERATOR): {
    //     this.scene.game.tutorial.end(TutorialStep.BUILD_GENERATOR);
    //     this.scene.game.tutorial.beg(TutorialStep.WAVE_TIMELEFT);
    //     break;
    //   }
    //   case this.scene.game.tutorial.state(TutorialStep.BUILD_AMMUNITION): {
    //     this.scene.game.tutorial.end(TutorialStep.BUILD_AMMUNITION);
    //     break;
    //   }
    //   default: break;
    // }
  }

  private isBuildingLimitReached(variant: BuildingVariant) {
    const limit = this.getBuildingLimit(variant);

    if (limit !== null) {
      return (this.scene.getBuildingsByVariant(variant).length >= limit);
    }

    return false;
  }

  private calculateBuildAreaRadius() {
    const d = calcGrowth(
      DIFFICULTY.BUILDING_BUILD_AREA / this.scene.game.getDifficultyMultiplier(),
      DIFFICULTY.BUILDING_BUILD_AREA_GROWTH,
      this.scene.player.level,
    ) * 2;

    return d;
  }

  private drawBuildAreaRadius() {
    this.buildAreaRadius = this.calculateBuildAreaRadius();

    this.buildArea = this.scene.add.ellipse(0, 0, this.buildAreaRadius, this.buildAreaRadius * TILE_META.perspective);
    this.buildArea.setStrokeStyle(2, 0xffffff, 0.4);
    this.updateBuildArea();
  }

  private updateBuildArea() {
    const position = this.scene.player.getBottomCenter();
    const out = TILE_META.height * 2;
    const depth = Level.GetDepth(position.y, 1, this.buildArea.height + out);

    this.buildArea.setPosition(position.x, position.y);
    this.buildArea.setDepth(depth);
  }

  private destroyBuildAreaRadius() {
    this.buildArea.destroy();
    this.buildArea = null;
  }

  private redrawBuildAreaRadius() {
    if (this.calculateBuildAreaRadius() > this.buildAreaRadius) {
      this.buildAreaRadius = this.calculateBuildAreaRadius();
      // this.destroyBuildAreaRadius();
      // this.drawBuildAreaRadius();
    }
  }

  private drawBuildingPlacementPreview() {
    const BuildingInstance = BUILDINGS[this.variant];
    const buildingType: string = BuildingInstance.Type;
    const frame = BuildingUiState[`${buildingType}_VALID` as keyof typeof BuildingUiState];

    if (this.placementPreview) this.placementPreview.destroy();
    this.placementPreview = this.scene.add.image(0, 0, BuildingUiTexture.UI);
    this.placementPreview.setOrigin(0.5, TILE_META.origin); // move preview building placement up slightly
    this.placementPreview.setFrame(frame);
    this.placementPreview.setAlpha(0.5);

    this.updateBuildingPreview();
  }

  private updateBuildingPreview() {
    const BuildingInstance = BUILDINGS[this.variant];
    const buildingType: string = BuildingInstance.Type;
    const frame = BuildingUiState[`${buildingType}_VALID` as keyof typeof BuildingUiState];

    this.buildPreviewGroup.clear(true, true);
    const positionAtMatrix = this.getAssumedTilePosition();
    const tilePosition = { ...positionAtMatrix, z: 1 };
    const positionAtWorld = Level.ToWorldPosition(tilePosition);
    const cornerOffset = buildingType === BuildingType.WALL ? this.getAssumedCornerPosition(positionAtWorld) : { x: 0, y: 0 };

    const isVisibleTile = this.scene.level.isVisibleTile({ ...positionAtMatrix, z: 0 });
    // this.buildingPreview.setVisible(isVisibleTile);
    this.placementPreview.setVisible(isVisibleTile);

    if (this.placementPreview.visible) {
      const positionX = positionAtWorld.x + cornerOffset.x;
      const positionY = positionAtWorld.y + cornerOffset.y;

      // this.buildingPreview.setPosition(positionAtWorld.x, positionAtWorld.y);
      // this.buildingPreview.setDepth(Level.GetTileDepth(positionAtWorld.y, tilePosition.z));
      // this.buildingPreview.setAlpha(this.isAllowBuild() ? 0.8 : 0.5);

      this.placementPreview.setPosition(positionX, positionY);
      this.placementPreview.setDepth(10000);
      this.placementPreview.setAlpha(0.5);
      // this.placementPreview.setFrame(frame);
      // this.placementPreview.setFrame(this.isAllowBuild() ? BuildingUiState.BUILDING_VALID : BuildingUiState.BUILDING_INVALID);

      this.buildingList = [{ positionAtMatrix: positionAtMatrix, wall: { frame: 0, orientation: '0000' } }];

      if (this.buildStartPosition?.x) {
        if (this.buildCurrentPosition !== positionAtMatrix) {
          this.drawPreviewArea(buildingType, positionAtMatrix);
        }
      }
    }
    this.buildCurrentPosition = positionAtMatrix;
    this.buildCornerOffset = cornerOffset;
  }

  private drawPreviewArea(buildingType: string, positionAtMatrix: Vector2D) {
    const BuildingInstance = BUILDINGS[this.variant];
    this.placementPreview.setVisible(false);
    this.buildPreviewGroup.clear(true, true);

    let previewFrame = BuildingUiState[`${buildingType}_VALID` as keyof typeof BuildingUiState];
    const isWall = buildingType === BuildingType.WALL;
    let buildFrame: number = 0;
    let wallOrientation: string = '0000';

    const startTile = { ...this.buildStartPosition, z: 1 };
    const currentTile: Vector2D = positionAtMatrix;
    const minX = Math.min(startTile.x, currentTile.x);
    const maxX = Math.max(startTile.x, currentTile.x);
    const minY = Math.min(startTile.y, currentTile.y);
    const maxY = Math.max(startTile.y, currentTile.y);

    let allowBuild = true;
    this.buildingList = [];

    for (let tileY = minY; tileY <= maxY; tileY++) {
      for (let tileX = minX; tileX <= maxX; tileX++) {
        const tileVector: Vector2D = { x: tileX, y: tileY };
        const tilePosition = { x: tileX, y: tileY, z: 1 };
        const positionAtWorld = Level.ToWorldPosition(tilePosition);

        let isOccupied = this.isAllowBuild(tileVector, false);
        const isEdge = tileY === minY || tileY === maxY || tileX === minX || tileX === maxX;

        if (isEdge) {
          if (isWall) {
            const dx = maxX - minX;
            const dy = maxY - minY;

            // block
            if (dx === 0 && dy === 0) {
              previewFrame = isOccupied ? BuildingUiState.WALL_BLOCK_VALID : BuildingUiState.WALL_BLOCK_INVALID;
              buildFrame = BuildingWallState.BLOCK;
              wallOrientation = BuildingWallOrientation.BLOCK;
            }

            // vertical wall blocks
            if (dx === 0 && dy > 0) {
              if (tileY === minY) {
                previewFrame = isOccupied ? BuildingUiState.WALL_TOP_END_VALID : BuildingUiState.WALL_TOP_END_INVALID;
                buildFrame = BuildingWallState.TOP_END;
                wallOrientation = BuildingWallOrientation.TOP_END;
              }
              else if (tileY === maxY) {
                previewFrame = isOccupied ? BuildingUiState.WALL_BOTTOM_END_VALID : BuildingUiState.WALL_BOTTOM_END_INVALID;
                buildFrame = BuildingWallState.BOTTOM_END;
                wallOrientation = BuildingWallOrientation.BOTTOM_END;
              }
              else {
                previewFrame = isOccupied ? BuildingUiState.WALL_VERTICAL_VALID : BuildingUiState.WALL_VERTICAL_INVALID;
                buildFrame = BuildingWallState.VERTICAL;
                wallOrientation = BuildingWallOrientation.VERTICAL;
              }
            }

            // horizontal wall blocks
            if (dy === 0 && dx > 0) {
              if (tileX === minX) {
                previewFrame = isOccupied ? BuildingUiState.WALL_LEFT_END_VALID : BuildingUiState.WALL_LEFT_END_INVALID;
                buildFrame = BuildingWallState.LEFT_END;
                wallOrientation = BuildingWallOrientation.LEFT_END;
              }
              else if (tileX === maxX) {
                previewFrame = isOccupied ? BuildingUiState.WALL_RIGHT_END_VALID : BuildingUiState.WALL_RIGHT_END_INVALID;
                buildFrame = BuildingWallState.RIGHT_END;
                wallOrientation = BuildingWallOrientation.RIGHT_END;
              }
              else {
                previewFrame = isOccupied ? BuildingUiState.WALL_HORIZONTAL_VALID : BuildingUiState.WALL_HORIZONTAL_INVALID;
                buildFrame = BuildingWallState.HORIZONTAL;
                wallOrientation = BuildingWallOrientation.HORIZONTAL;
              }
            }

            if (dx > 0 && dy > 0) {
              if (tileX === minX) {
                // top left
                if (tileY === minY) {
                  previewFrame = isOccupied ? BuildingUiState.WALL_TOP_LEFT_VALID : BuildingUiState.WALL_TOP_LEFT_INVALID;
                  buildFrame = BuildingWallState.TOP_LEFT;
                  wallOrientation = BuildingWallOrientation.TOP_LEFT;
                }
                // bottom left
                else if (tileY === maxY) {
                  previewFrame = isOccupied ? BuildingUiState.WALL_BOTTOM_LEFT_VALID : BuildingUiState.WALL_BOTTOM_LEFT_INVALID;
                  buildFrame = BuildingWallState.BOTTOM_LEFT;
                  wallOrientation = BuildingWallOrientation.BOTTOM_LEFT;
                }
                // left side
                else {
                  previewFrame = isOccupied ? BuildingUiState.WALL_LEFT_VALID : BuildingUiState.WALL_LEFT_INVALID;
                  buildFrame = BuildingWallState.LEFT;
                  wallOrientation = BuildingWallOrientation.LEFT;
                }
              } else if (tileX === maxX) {
                // top right
                if (tileY === minY) {
                  previewFrame = isOccupied ? BuildingUiState.WALL_TOP_RIGHT_VALID : BuildingUiState.WALL_TOP_RIGHT_INVALID;
                  buildFrame = BuildingWallState.TOP_RIGHT;
                  wallOrientation = BuildingWallOrientation.TOP_RIGHT;
                }
                // bottom right
                else if (tileY === maxY) {
                  previewFrame = isOccupied ? BuildingUiState.WALL_BOTTOM_RIGHT_VALID : BuildingUiState.WALL_BOTTOM_RIGHT_INVALID;
                  buildFrame = BuildingWallState.BOTTOM_RIGHT;
                  wallOrientation = BuildingWallOrientation.BOTTOM_RIGHT;
                }
                // right side
                else {
                  previewFrame = isOccupied ? BuildingUiState.WALL_RIGHT_VALID : BuildingUiState.WALL_RIGHT_INVALID;
                  buildFrame = BuildingWallState.RIGHT;
                  wallOrientation = BuildingWallOrientation.RIGHT;
                }
              } else {
                // top
                if (tileY === minY) {
                  previewFrame = isOccupied ? BuildingUiState.WALL_TOP_VALID : BuildingUiState.WALL_TOP_INVALID;
                  buildFrame = BuildingWallState.TOP;
                  wallOrientation = BuildingWallOrientation.TOP;
                }
                // bottom
                else {
                  previewFrame = isOccupied ? BuildingUiState.WALL_BOTTOM_VALID : BuildingUiState.WALL_BOTTOM_INVALID;
                  buildFrame = BuildingWallState.BOTTOM;
                  wallOrientation = BuildingWallOrientation.BOTTOM;
                }
              }
            }
            this.drawPreviewTile(positionAtWorld, previewFrame);
          }

          isOccupied = this.isAllowBuild(tileVector, true);
          const previewBuilding = this.scene.add.image(0, 0, isWall ? BuildingTexture.WALL : BuildingInstance.Texture);
          previewBuilding.setPosition(positionAtWorld.x, positionAtWorld.y);
          previewBuilding.setDepth(Level.GetTileDepth(positionAtWorld.y, tilePosition.z) + 10000);
          previewBuilding.setOrigin(0.5, TILE_META.origin);
          previewBuilding.setAlpha(isOccupied ? 0.3 : 0);
          previewBuilding.setFrame(buildFrame);

          this.buildPreviewGroup.add(previewBuilding);
          this.buildingList.push({ positionAtMatrix: tileVector, wall: { frame: buildFrame, orientation: wallOrientation } });
          if (!isOccupied) allowBuild = false;
        }

        if (isWall) {
          if (isEdge) {

          }
          if (!isWall) {
            this.drawPreviewTile(positionAtWorld, previewFrame);
          }
        }
      }

      if (!allowBuild) this.buildingList = [];

      this.buildCurrentPosition = positionAtMatrix;
    }
  }

  private drawPreviewTile(positionAtWorld: Vector2D, frame: BuildingUiState) {
    const previewTile = this.scene.add.image(0, 0, BuildingUiTexture.UI);
    previewTile.setPosition(positionAtWorld.x, positionAtWorld.y);
    previewTile.setDepth(10000);
    previewTile.setOrigin(0.5, TILE_META.origin);
    previewTile.setAlpha(0.5);
    previewTile.setFrame(frame);

    this.buildPreviewGroup.add(previewTile);
  }

  private clearBuildingPreview() {
    this.buildStartPosition = null;
    this.buildCurrentPosition = null;
    this.buildCornerOffset = null;
    this.buildPreviewGroup.clear(true, true);
  }

  private destroyBuildingPreview() {
    this.clearBuildingPreview();
    this.placementPreview.destroy();
    this.placementPreview = null;
  }
}
