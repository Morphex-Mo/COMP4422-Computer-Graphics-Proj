import { WeatherPropertyType, ColorRGBA, Vec3 } from "./types";
import { AnimationCurve } from "./animation-curve";
import { Gradient } from "./gradient";

export class WeatherProperty {
  name = "MyPropertyName";
  propertyType: WeatherPropertyType = WeatherPropertyType.Float;

  // Default values to initialize presets
  defaultFloatValue = 0.0;
  defaultColorValue: ColorRGBA = { r: 1, g: 1, b: 1, a: 1 };
  defaultCurveValue: AnimationCurve = AnimationCurve.Linear(0, 0.5, 24, 0.5);
  defaultGradientValue: Gradient = new Gradient();
  defaultVector3Value: Vec3 = { x: 0, y: 0, z: 0 };

  // Outputs after evaluation/blending
  floatOutput = 0.0;
  colorOutput: ColorRGBA = { r: 1, g: 1, b: 1, a: 1 };
  vector3Output: Vec3 = { x: 0, y: 0, z: 0 };
}