import { CurveKey } from "./types";

export class AnimationCurve {
  private keys: CurveKey[] = [];

  constructor(keys?: CurveKey[]) {
    if (keys && keys.length) {
      this.keys = [...keys].sort((a, b) => a.time - b.time);
    } else {
      // default linear 0..1
      this.keys = [
        { time: 0, value: 0 },
        { time: 1, value: 1 },
      ];
    }
  }

  static Linear(x0: number, y0: number, x1: number, y1: number) {
    return new AnimationCurve([
      { time: x0, value: y0 },
      { time: x1, value: y1 },
    ]);
  }

  addKey(time: number, value: number) {
    this.keys.push({ time, value });
    this.keys.sort((a, b) => a.time - b.time);
  }

  evaluate(t: number): number {
    if (this.keys.length === 0) return 0;
    if (this.keys.length === 1) return this.keys[0].value;

    if (t <= this.keys[0].time) return this.keys[0].value;
    if (t >= this.keys[this.keys.length - 1].time) return this.keys[this.keys.length - 1].value;

    for (let i = 0; i < this.keys.length - 1; i++) {
      const a = this.keys[i];
      const b = this.keys[i + 1];
      if (t >= a.time && t <= b.time) {
        const u = (t - a.time) / (b.time - a.time);
        return a.value + (b.value - a.value) * u;
      }
    }
    return this.keys[this.keys.length - 1].value;
  }

  copyFrom(src: AnimationCurve) {
    // shallow copy keys
    this.keys = (src as any).keys ? [...(src as any).keys] : [];
  }
}