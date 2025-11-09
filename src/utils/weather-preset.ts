import { WeatherPropertyGroup } from "./weather-property-group";
import { AnimationCurve } from "./animation-curve";
import { WeatherProperty } from "./weather-property";
import { Gradient } from "./gradient"; // added

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
  gradientData: Gradient[] = []; // 现在实际存储 Gradient，兼容旧数据若为空则使用 colorData 兜底
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
          default: {
            // 旧版仅使用 floatData；为兼容 Curve 解析时也能读取，放入一条常量曲线
            data.floatData.push(prop.defaultFloatValue);
            data.colorData.push({ r: 1, g: 1, b: 1, a: 1 });
            const constantCurve = AnimationCurve.Linear(0, prop.defaultFloatValue, 24, prop.defaultFloatValue);
            data.curveData.push(constantCurve);
            data.gradientData.push(new Gradient()); // 占位
            data.vector3Data.push({ x: 0, y: 0, z: 0 });
            break;
          }
          case "Color" as any: {
            data.floatData.push(0);
            data.colorData.push(prop.defaultColorValue);
            // 创建一条常量曲线，用于在 Curve 解析逻辑里兜底
            const constantCurve = AnimationCurve.Linear(0, 0, 24, 0);
            data.curveData.push(constantCurve);
            // 同样给一个占位 Gradient（与 color 保持一致），使 Gradient 解析兼容
            const placeholderGradient = new Gradient([
              { time: 0, color: prop.defaultColorValue },
              { time: 1, color: prop.defaultColorValue },
            ]);
            data.gradientData.push(placeholderGradient);
            data.vector3Data.push({ x: 0, y: 0, z: 0 });
            break;
          }
          case "Curve" as any: {
            data.floatData.push(0); // 旧版可能查 floatData；仍提供 0 占位
            data.colorData.push({ r: 1, g: 1, b: 1, a: 1 });
            const c = new AnimationCurve();
            c.copyFrom(prop.defaultCurveValue);
            data.curveData.push(c);
            data.gradientData.push(new Gradient()); // 占位
            data.vector3Data.push({ x: 0, y: 0, z: 0 });
            break;
          }
          case "Gradient" as any: {
            data.floatData.push(0); // 占位
            // 给一个初始 colorData 作为兜底（gradient 第一个关键点颜色）
            const firstColor = prop.defaultGradientValue?.evaluate ? prop.defaultGradientValue.evaluate(0) : { r: 1, g: 1, b: 1, a: 1 };
            data.colorData.push(firstColor);
            data.curveData.push(AnimationCurve.Linear(0, 0, 24, 0)); // 占位
            // 保存默认 Gradient（保持引用即可，若需独立可 clone，这里简单）
            data.gradientData.push(prop.defaultGradientValue);
            data.vector3Data.push({ x: 0, y: 0, z: 0 });
            break;
          }
          case "Vector3" as any: {
            data.floatData.push(0);
            data.colorData.push({ r: 1, g: 1, b: 1, a: 1 });
            data.curveData.push(AnimationCurve.Linear(0, 0, 24, 0)); // 占位
            data.gradientData.push(new Gradient()); // 占位
            data.vector3Data.push(prop.defaultVector3Value);
            break;
          }
        }
      }
      return data;
    });
    return preset;
  }
}