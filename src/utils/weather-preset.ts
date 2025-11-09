import { WeatherPropertyGroup } from "./weather-property-group";
import { AnimationCurve } from "./animation-curve";
import { WeatherProperty } from "./weather-property";

/**
 * 每个组有一条 rampCurve，控制该组在整体过渡中的权重。
 * propertyGroupDataList 与“schema”（WeatherPropertyGroup 列表）按索引对齐。
 */
export class WeatherPresetGroupData {
  name = "";
  rampCurve: AnimationCurve = AnimationCurve.Linear(0, 0, 1, 1);
  // 每个属性的数据容器（与 schema 的 property 顺序一致）
  floatData: number[] = [];
  colorData: { r: number; g: number; b: number; a?: number }[] = [];
  curveData: AnimationCurve[] = [];
  gradientData: any[] = []; // 简化：保持为空或未来扩展（已在系统内以 evaluate 读取）
  vector3Data: { x: number; y: number; z: number }[] = [];
}

export class WeatherPreset {
  name = "Preset";
  propertyGroupDataList: WeatherPresetGroupData[] = [];

  /**
   * 根据 schema（WeatherPropertyGroup+WeatherProperty）创建对应的 Preset 数据骨架
   */
  static createFromSchema(schema: WeatherPropertyGroup[], name = "Preset"): WeatherPreset {
    const preset = new WeatherPreset();
    preset.name = name;
    preset.propertyGroupDataList = schema.map((group) => {
      const data = new WeatherPresetGroupData();
      data.name = group.name;
      for (const prop of group.weatherPropertyList) {
        switch (prop.propertyType) {
          case "Float" as any:
          default:
            data.floatData.push(prop.defaultFloatValue);
            data.colorData.push({ r: 1, g: 1, b: 1, a: 1 });
            data.curveData.push(prop.defaultCurveValue);
            data.vector3Data.push({ x: 0, y: 0, z: 0 });
            break;
          case "Color" as any:
            data.floatData.push(0);
            data.colorData.push(prop.defaultColorValue);
            data.curveData.push(prop.defaultCurveValue);
            data.vector3Data.push({ x: 0, y: 0, z: 0 });
            break;
          case "Curve" as any:
            data.floatData.push(0);
            data.colorData.push({ r: 1, g: 1, b: 1, a: 1 });
            // 曲线默认复制
            const c = new AnimationCurve();
            c.copyFrom(prop.defaultCurveValue);
            data.curveData.push(c);
            data.vector3Data.push({ x: 0, y: 0, z: 0 });
            break;
          case "Gradient" as any:
            data.floatData.push(0);
            data.colorData.push({ r: 1, g: 1, b: 1, a: 1 });
            data.curveData.push(prop.defaultCurveValue);
            data.vector3Data.push({ x: 0, y: 0, z: 0 });
            break;
          case "Vector3" as any:
            data.floatData.push(0);
            data.colorData.push({ r: 1, g: 1, b: 1, a: 1 });
            data.curveData.push(prop.defaultCurveValue);
            data.vector3Data.push(prop.defaultVector3Value);
            break;
        }
      }
      return data;
    });
    return preset;
  }
}