import * as THREE from "three";

/**
 * 基础大气与雾散射参数（覆盖/驱动用）
 * 与你的原始 skyParams 对应。部分可由天气系统更新。
 */
export interface AtmosphereParams {
  sunPosition: THREE.Vector3;
  kr: number;
  km: number;
  wavelength: THREE.Vector3;
  molecularDensity: number;
  rayleigh: number;
  mie: number;
  mieDirectionalG: number;
  scattering: number;
  luminance: number;
  exposure: number;
  rayleighColor: THREE.Color;
  mieColor: THREE.Color;

  // Fog
  globalFogDistance: number;
  globalFogSmooth: number;
  globalFogDensity: number;
  heightFogDistance: number;
  heightFogSmooth: number;
  heightFogDensity: number;
  heightFogStart: number;
  heightFogEnd: number;
  fogBluishDistance: number;
  fogBluishIntensity: number;
  heightFogScatterMultiplier: number;
  mieDistance: number;
}

/**
 * 可用于 overrideParameters() 的部分键名
 */
export type PartialAtmosphereParams = Partial<{
  sunPosition: THREE.Vector3;
  kr: number;
  km: number;
  wavelength: THREE.Vector3;
  molecularDensity: number;
  rayleigh: number;
  mie: number;
  mieDirectionalG: number;
  scattering: number;
  luminance: number;
  exposure: number;
  rayleighColor: THREE.Color | { r: number; g: number; b: number };
  mieColor: THREE.Color | { r: number; g: number; b: number };

  globalFogDistance: number;
  globalFogSmooth: number;
  globalFogDensity: number;
  heightFogDistance: number;
  heightFogSmooth: number;
  heightFogDensity: number;
  heightFogStart: number;
  heightFogEnd: number;
  fogBluishDistance: number;
  fogBluishIntensity: number;
  heightFogScatterMultiplier: number;
  mieDistance: number;
}>;

export interface AtmosphereControllerOptions {
  // 是否启用深度显示调试
  enableDepthDebug?: boolean;
  // 天空球半径
  skyRadius?: number;
  // 是否自动更新（在 update() 中根据 time & weather）
  autoUpdateFromSystems?: boolean;
  // 是否创建 OrbitControls（可选）
  controls?: boolean;
}