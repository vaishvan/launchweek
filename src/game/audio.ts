// ---------------------------------------------------------------------------
// audio.ts
// Purpose : One place for sound: SFX by key, act music with a crossfade, and
//           separate music/SFX mutes remembered per browser (localStorage, guarded).
// Notes   : Browsers block audio until the first tap; Phaser unlocks on input.
// Authored: Written with Claude (Opus 5.5, claude-opus-5-5)
// ---------------------------------------------------------------------------
import * as Phaser from "phaser";
import { Log } from "../core/log";

export const SFX_KEYS = [
  "tap", "tap_2", "tap_3", "combo_full", "launch", "mini_launch", "buy", "hire", "upgrade", "unlock", "cant_afford", "cash_in",
  "click", "tab", "open", "close", "card_in", "tick", "select", "default_fired", "roll_good", "roll_bad", "cp_pass", "cp_miss",
  "loan", "term_pick", "act_up", "notify", "burst", "alarm", "chime", "sigh", "end_good", "end_mixed", "end_bad",
];
export const MUSIC_KEYS = ["mus_title", "mus_act1", "mus_act2", "mus_act3"];

function load(key: string, fallback: boolean): boolean {
  try {
    const v = localStorage.getItem(key);
    return v === null ? fallback : v === "1";
  } catch {
    return fallback;
  }
}
function save(key: string, v: boolean): void {
  try {
    localStorage.setItem(key, v ? "1" : "0");
  } catch {
    /* storage blocked: keep the in-memory value */
  }
}

class SfxManager {
  private scene: Phaser.Scene | null = null;
  private music: Phaser.Sound.BaseSound | null = null;
  private musicKey = "";
  sfxOn = load("lw_sfx", true);
  musicOn = load("lw_music", true);
  /** Set by autoplay/smoke runs: no audio at all. */
  silent = false;

  bind(scene: Phaser.Scene): void {
    this.scene = scene;
  }

  play(key: string, cfg: Phaser.Types.Sound.SoundConfig = {}): void {
    if (!this.sfxOn || this.silent || !this.scene) return;
    if (!this.scene.cache.audio.exists(key)) return Log.warn("audio", `missing sfx ${key}`);
    this.scene.sound.play(key, { volume: 0.8, ...cfg });
  }

  playMusic(key: string): void {
    if (this.musicKey === key && this.music?.isPlaying) return;
    this.musicKey = key;
    if (!this.scene || this.silent) return;
    const old = this.music;
    if (old) {
      this.scene.tweens.add({ targets: old, volume: 0, duration: 600, onComplete: () => old.destroy() });
    }
    this.music = null;
    if (!this.musicOn || !this.scene.cache.audio.exists(key)) return;
    const m = this.scene.sound.add(key, { loop: true, volume: 0 });
    m.play();
    this.scene.tweens.add({ targets: m, volume: 0.45, duration: 800 });
    this.music = m;
  }

  toggleMusic(): boolean {
    this.musicOn = !this.musicOn;
    save("lw_music", this.musicOn);
    if (!this.musicOn) {
      this.music?.destroy();
      this.music = null;
    } else {
      const k = this.musicKey;
      this.musicKey = "";
      this.playMusic(k);
    }
    return this.musicOn;
  }

  toggleSfx(): boolean {
    this.sfxOn = !this.sfxOn;
    save("lw_sfx", this.sfxOn);
    return this.sfxOn;
  }

  stopMusic(): void {
    this.music?.destroy();
    this.music = null;
    this.musicKey = "";
  }
}

export const Sfx = new SfxManager();
