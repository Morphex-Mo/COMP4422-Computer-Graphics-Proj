import * as THREE from "three";
import {AzureEvents} from "./notification-center";
import {AzureManager} from "./manager";

export type ThreeAzureBindings = {
  skyParams: {
    molecularDensity: number;
    rayleigh: number;
    mie: number;
    rayleighColor: THREE.Color;
    mieColor: THREE.Color;

    globalFogDistance: number;
    globalFogSmooth: number;
    globalFogDensity: number;
    heightFogDistance: number;
    heightFogSmooth: number;
    heightFogDensity: number;
    fogBluishDistance: number;
    fogBluishIntensity: number;
    heightFogScatterMultiplier: number;
    mieDistance: number;
  };
  updateSkyUniforms: () => void;
  directionalLight: THREE.DirectionalLight;
  ambientLight?: THREE.AmbientLight;
};

export function bindAzureToThree(manager: AzureManager, bindings: ThreeAzureBindings) {
  AzureEvents.onAfterWeatherSystemUpdate(() => {
    const schema = manager.weather.weatherPropertyGroupList;

    {
      const group = schema[0];
      const props = group.weatherPropertyList;
      bindings.skyParams.molecularDensity = props[0].floatOutput;
      bindings.skyParams.rayleigh = props[1].floatOutput;
      bindings.skyParams.mie = props[2].floatOutput;
      const rc = props[3].colorOutput; bindings.skyParams.rayleighColor.setRGB(rc.r, rc.g, rc.b);
      const mc = props[4].colorOutput; bindings.skyParams.mieColor.setRGB(mc.r, mc.g, mc.b);
    }

    {
      const group = schema[1];
      const p = group.weatherPropertyList;
      bindings.skyParams.globalFogDistance = p[0].floatOutput;
      bindings.skyParams.globalFogSmooth = p[1].floatOutput;
      bindings.skyParams.globalFogDensity = p[2].floatOutput;
      bindings.skyParams.heightFogDistance = p[3].floatOutput;
      bindings.skyParams.heightFogSmooth = p[4].floatOutput;
      bindings.skyParams.heightFogDensity = p[5].floatOutput;
      bindings.skyParams.fogBluishDistance = p[6].floatOutput;
      bindings.skyParams.fogBluishIntensity = p[7].floatOutput;
      bindings.skyParams.heightFogScatterMultiplier = p[8].floatOutput;
      bindings.skyParams.mieDistance = p[9].floatOutput;
    }

    {
      const group = schema[2];
      const p = group.weatherPropertyList;
      const intensity = p[0].floatOutput;
      const lc = p[1].colorOutput;

      bindings.directionalLight.intensity = intensity;
      bindings.directionalLight.color.setRGB(lc.r, lc.g, lc.b);
    }

    bindings.updateSkyUniforms();
  });
}