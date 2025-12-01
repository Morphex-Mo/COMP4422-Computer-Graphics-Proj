import {AzureEvents} from "./notification-center";
import {WeatherPropertyGroup} from "./weather-property-group";
import {WeatherPreset} from "./weather-preset";
import {WeatherPropertyType} from "./types";

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
function lerpColor(a: any, b: any, t: number) {
  return {
    r: lerp(a.r, b.r, t),
    g: lerp(a.g, b.g, t),
    b: lerp(a.b, b.b, t),
    a: lerp(a.a ?? 1, b.a ?? 1, t),
  };
}
function lerpVec3(a: any, b: any, t: number) {
  return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), z: lerp(a.z, b.z, t) };
}

export class GlobalWeatherEntry {
  constructor(public preset: WeatherPreset, public transitionTimeSec = 10) {}
}

export class WeatherSystem {
  weatherPropertyGroupList: WeatherPropertyGroup[] = [];
  globalWeatherList: GlobalWeatherEntry[] = [];
  currentWeatherPreset: WeatherPreset | null = null;
  private targetWeatherPreset: WeatherPreset | null = null;

  private isWeatherChanging = false;
  private transitionStartTime = 0;
  private transitionDuration = 0;
  weatherTransitionProgress = 0;

  evaluationTime = 6.5;
  evaluationTimeGradient = 6.5 / 24.0;

  update(nowSec: number, deltaTimeSec: number) {
    AzureEvents.emitBeforeWeatherSystemUpdate({
      evaluationTime: this.evaluationTime,
      evaluationTimeGradient: this.evaluationTimeGradient,
    });

    if (!this.isWeatherChanging) {
      this.evaluateCurrentWeather();
    } else {
      const t = Math.max(0, Math.min(1, (nowSec - this.transitionStartTime) / this.transitionDuration));
      this.weatherTransitionProgress = t;
      this.evaluateGlobalWeatherTransition(this.currentWeatherPreset, this.targetWeatherPreset, t);
      if (Math.abs(t - 1) <= 0) {
        this.isWeatherChanging = false;
        this.currentWeatherPreset = this.targetWeatherPreset;
        this.targetWeatherPreset = null;
        this.transitionDuration = 0;
        this.transitionStartTime = 0;
        this.weatherTransitionProgress = 0;
        AzureEvents.emitWeatherTransitionEnd();
      }
    }

    AzureEvents.emitAfterWeatherSystemUpdate({
      evaluationTime: this.evaluationTime,
      evaluationTimeGradient: this.evaluationTimeGradient,
    });
  }

  setEvaluationTime(evaluationTimeHours: number) {
    this.evaluationTime = evaluationTimeHours;
    this.evaluationTimeGradient = evaluationTimeHours / 24.0;
  }

  setCurrentWeather(preset: WeatherPreset) {
    this.currentWeatherPreset = preset;
  }

  setGlobalWeatherByIndex(index: number, nowSec: number) {
    if (index < 0 || index >= this.globalWeatherList.length) return;
    const entry = this.globalWeatherList[index];
    if (!entry || !entry.preset) return;

    if (this.currentWeatherPreset === entry.preset) return;
    if (this.isWeatherChanging) return;

    this.targetWeatherPreset = entry.preset;
    this.transitionDuration = entry.transitionTimeSec;
    this.transitionStartTime = nowSec;
    this.isWeatherChanging = true;
  }

  setGlobalWeather(preset: WeatherPreset, transitionTimeSec: number, nowSec: number) {
    this.targetWeatherPreset = preset;
    this.transitionDuration = transitionTimeSec;
    this.transitionStartTime = nowSec;
    this.isWeatherChanging = true;
  }

  private evaluateCurrentWeather() {
    const from = this.currentWeatherPreset;
    if (!from) return;
    const hourT = Math.min(24, Math.max(0, this.evaluationTime));
    const gradT = Math.min(1, Math.max(0, this.evaluationTimeGradient));
    for (let gi = 0; gi < this.weatherPropertyGroupList.length; gi++) {
      const group = this.weatherPropertyGroupList[gi];
      if (!group.isEnabled) continue;
      const props = group.weatherPropertyList;
      const data = from.propertyGroupDataList[gi];
      for (let pi = 0; pi < props.length; pi++) {
        const prop = props[pi];
        switch (prop.propertyType) {
          case WeatherPropertyType.Float: {
            prop.floatOutput = data.floatData[pi];
            break;
          }
          case WeatherPropertyType.Color: {
            prop.colorOutput = data.colorData[pi];
            break;
          }
          case WeatherPropertyType.Curve: {
            const curve = data.curveData[pi];
            prop.floatOutput = curve.evaluate(hourT);
            break;
          }
          case WeatherPropertyType.Gradient: {
            const grad = data.gradientData[pi];
            prop.colorOutput = grad.evaluate(gradT);
            break;
          }
          case WeatherPropertyType.Vector3: {
            prop.vector3Output = data.vector3Data[pi];
            break;
          }
        }
      }
    }
  }

  private evaluateGlobalWeatherTransition(from: WeatherPreset | null, to: WeatherPreset | null, t: number) {
    if (!from || !to) return;
    const hourT = Math.min(24, Math.max(0, this.evaluationTime));
    const gradT = Math.min(1, Math.max(0, this.evaluationTimeGradient));
    for (let gi = 0; gi < this.weatherPropertyGroupList.length; gi++) {
      const group = this.weatherPropertyGroupList[gi];
      if (!group.isEnabled) continue;
      const ramp = to.propertyGroupDataList[gi].rampCurve.evaluate(t);
      const props = group.weatherPropertyList;
      for (let pi = 0; pi < props.length; pi++) {
        const prop = props[pi];
        const fData = from.propertyGroupDataList[gi];
        const tData = to.propertyGroupDataList[gi];
        switch (prop.propertyType) {
          case WeatherPropertyType.Float: {
            prop.floatOutput = lerp(fData.floatData[pi], tData.floatData[pi], ramp);
            break;
          }
          case WeatherPropertyType.Color: {
            prop.colorOutput = lerpColor(fData.colorData[pi], tData.colorData[pi], ramp);
            break;
          }
          case WeatherPropertyType.Curve: {
            const fVal = fData.curveData[pi]?.evaluate ? fData.curveData[pi].evaluate(hourT) : fData.floatData[pi];
            const tVal = tData.curveData[pi]?.evaluate ? tData.curveData[pi].evaluate(hourT) : tData.floatData[pi];
            prop.floatOutput = lerp(fVal, tVal, ramp);
            break;
          }
          case WeatherPropertyType.Gradient: {
            const fCol = fData.gradientData[pi]?.evaluate ? fData.gradientData[pi].evaluate(gradT) : fData.colorData[pi];
            const tCol = tData.gradientData[pi]?.evaluate ? tData.gradientData[pi].evaluate(gradT) : tData.colorData[pi];
            prop.colorOutput = lerpColor(fCol, tCol, ramp);
            break;
          }
          case WeatherPropertyType.Vector3: {
            prop.vector3Output = lerpVec3(fData.vector3Data[pi], tData.vector3Data[pi], ramp);
            break;
          }
        }
      }
    }
  }
}