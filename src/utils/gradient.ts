import type {ColorRGBA, GradientKey} from "./types";

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export class Gradient {
  private keys: GradientKey[] = [];

  constructor(keys?: GradientKey[]) {
    if (keys && keys.length) {
      this.keys = [...keys].sort((a, b) => a.time - b.time);
    } else {
      this.keys = [
        { time: 0, color: { r: 1, g: 1, b: 1, a: 1 } },
        { time: 1, color: { r: 1, g: 1, b: 1, a: 1 } },
      ];
    }
  }

  setKeys(keys: GradientKey[]) {
    this.keys = [...keys].sort((a, b) => a.time - b.time);
  }

  evaluate(t: number): ColorRGBA {
    if (this.keys.length === 0) return { r: 1, g: 1, b: 1, a: 1 };
    if (this.keys.length === 1) return this.keys[0].color;

    if (t <= this.keys[0].time) return this.keys[0].color;
    if (t >= this.keys[this.keys.length - 1].time) return this.keys[this.keys.length - 1].color;

    for (let i = 0; i < this.keys.length - 1; i++) {
      const a = this.keys[i];
      const b = this.keys[i + 1];
      if (t >= a.time && t <= b.time) {
        const u = (t - a.time) / (b.time - a.time);
        return {
          r: lerp(a.color.r, b.color.r, u),
          g: lerp(a.color.g, b.color.g, u),
          b: lerp(a.color.b, b.color.b, u),
          a: lerp(a.color.a ?? 1, b.color.a ?? 1, u),
        };
      }
    }
    return this.keys[this.keys.length - 1].color;
  }
}