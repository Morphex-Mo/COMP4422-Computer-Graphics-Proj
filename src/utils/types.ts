export enum TimeMode {
  Simple = "Simple",
}

export enum TimeDirection {
  Forward = "Forward",
  Backward = "Backward",
}

export enum TimeLoop {
  Off = "Off",
  Dayly = "Dayly",
  Monthly = "Monthly",
  Yearly = "Yearly",
}

export enum WeatherPropertyType {
  Float = "Float",
  Color = "Color",
  Curve = "Curve",
  Gradient = "Gradient",
  Vector3 = "Vector3",
}

export type CurveKey = { time: number; value: number };
export type GradientKey = { time: number; color: { r: number; g: number; b: number; a?: number } };

export type Vec3 = { x: number; y: number; z: number };

export interface ColorRGBA {
  r: number;
  g: number;
  b: number;
  a?: number;
}