import Phaser from 'phaser';

import { AUDIO_VOLUME, CONTAINER_ID, SETTINGS } from '~const/game';
import { shaders } from '~lib/shaders';
import { eachEntries } from '~lib/system';
import { Basic } from '~scene/basic';
import { Gameover } from '~scene/gameover';
import { Menu } from '~scene/menu';
import { Screen } from '~scene/screen';
import { World } from '~scene/world';
import {
  GameEvents, GameSettings, GameStat, IGame,
} from '~type/game';
import { IMenu } from '~type/menu';
import { IScreen } from '~type/screen';
import { IWorld } from '~type/world';

export class Game extends Phaser.Game implements IGame {
  private _menu: IMenu;

  public get menu() { return this._menu; }

  private set menu(v) { this._menu = v; }

  private _isStarted: boolean = false;

  public get isStarted() { return this._isStarted; }

  private set isStarted(v) { this._isStarted = v; }

  private _isFinished: boolean = false;

  public get isFinished() { return this._isFinished; }

  private set isFinished(v) { this._isFinished = v; }

  private _screen: IScreen;

  public get screen() { return this._screen; }

  private set screen(v) { this._screen = v; }

  private _world: IWorld;

  public get world() { return this._world; }

  private set world(v) { this._world = v; }

  private _settings: Partial<Record<GameSettings, string>> = {};

  public get settings() { return this._settings; }

  private set settings(v) { this._settings = v; }

  constructor() {
    super({
      scene: [Basic, World, Screen, Menu, Gameover],
      pixelArt: true,
      autoRound: true,
      disableContextMenu: true,
      width: window.innerWidth,
      height: window.innerHeight,
      parent: CONTAINER_ID,
      backgroundColor: '#222',
      scale: {
        mode: Phaser.Scale.RESIZE,
      },
      physics: {
        default: 'matter',
        matter: {
          debug: true,
          gravity: { y: 0 },
          enableSleeping: true,
        },
      },
    });

    this.readSettings();

    this.events.on(Phaser.Core.Events.READY, () => {
      this.screen = <Screen> this.scene.keys.SCREEN; // in game UI
      this.menu = <Menu> this.scene.keys.MENU; // main menu
      this.world = <World> this.scene.keys.WORLD; // game world

      this.sound.setVolume(AUDIO_VOLUME);

      this.registerShaders();
    });

    this.events.on(`${GameEvents.UPDATE_SETTINGS}.${GameSettings.AUDIO}`, (value: string) => {
      this.sound.mute = (value === 'off');
    });

    if (IS_DEV_MODE) {
      // @ts-ignore
      window.GAME = this;
    }
  }

  public pauseGame() {
    this.isPaused = true;

    this.world.scene.pause();
    this.screen.scene.pause();

    this.scene.systemScene.scene.launch(this.menu);
  }

  public resumeGame() {
    this.isPaused = false;

    this.scene.systemScene.scene.stop(this.menu);

    this.world.scene.resume();
    this.screen.scene.resume();
  }

  public startGame() {
    this.world.start();

    this.scene.systemScene.scene.stop(this.menu);
    this.scene.systemScene.scene.launch(this.screen);

    this.events.emit(GameEvents.START);

    if (!IS_DEV_MODE) {
      window.onbeforeunload = function confirmLeave() {
        return 'Leave game? No saves!';
      };
    }
  }

  public stopGame() {
    this.scene.systemScene.scene.stop(this.menu);
    this.scene.systemScene.scene.stop(this.screen);

    if (!IS_DEV_MODE) {
      delete window.onbeforeunload;
    }
  }

  public restartGame() {
    this.world.scene.restart();

    this.world.events.once(Phaser.Scenes.Events.CREATE, () => {
      this.startGame();
    });
  }

  public finishGame() {
    this.stopGame();

    const record = this.getRecordStat();
    const stat = this.getCurrentStat();

    if (!IS_DEV_MODE) {
      this.writeBestStat(stat, record);
    }

    this.events.emit(GameEvents.FINISH, stat, record);
  }

  public updateSetting(key: GameSettings, value: string) {
    this.settings[key] = value;
    localStorage.setItem(`SETTINGS.${key}`, value);

    this.events.emit(`${GameEvents.UPDATE_SETTINGS}.${key}`, value);
  }

  public isSettingEnabled(key: GameSettings) {
    return (this.settings[key] === 'on');
  }

  private readSettings() {
    eachEntries(GameSettings, (key) => {
      this.settings[key] = localStorage.getItem(`SETTINGS.${key}`) ?? SETTINGS[key].default;
    });
  }

  private getRecordStat(): Nullable<GameStat> {
    try {
      const difficulty = this.settings[GameSettings.DIFFICULTY];
      const recordValue = localStorage.getItem(`BEST_STAT.${difficulty}`);

      return JSON.parse(recordValue);
    } catch (error) {
      return null;
    }
  }

  private writeBestStat(stat: GameStat, record: Nullable<GameStat>) {
    const difficulty = this.settings[GameSettings.DIFFICULTY];
    const betterStat = Object.keys(stat).reduce((curr, param: keyof GameStat) => ({
      ...curr,
      [param]: Math.max(stat[param], record?.[param] ?? 0),
    }), {});

    localStorage.setItem(`BEST_STAT.${difficulty}`, JSON.stringify(betterStat));
  }

  private getCurrentStat() {
    return {
      waves: 0,
      kills: this.world.player.kills,
      level: this.world.player.level,
      lived: 1,
    } as GameStat;
  }

  private registerShaders() {
    const renderer = <Phaser.Renderer.WebGL.WebGLRenderer> this.renderer;

    eachEntries(shaders, (name, Shader) => {
      renderer.pipelines.addPostPipeline(name, Shader);
    });
  }
}
