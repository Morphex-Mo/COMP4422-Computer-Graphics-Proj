import {WeatherPropertyGroup} from "../weather-property-group";
import {WeatherProperty} from "../weather-property";
import {WeatherPropertyType} from "../types";
import {AnimationCurve} from "../animation-curve";
import {Gradient} from "../gradient";
import {WeatherPreset} from "../weather-preset";
import {AzureManager} from "../manager";
import {GlobalWeatherEntry} from "../weather-system";
type RGBA = { r: number; g: number; b: number; a: number };

/**
 * 将 hex 字符串和 alpha 转为 0..1 范围的 rgba 对象
 * 支持格式: "#RRGGBB", "RRGGBB", "#RGB", "RGB"
 * alpha 可选，默认 1；超出范围会被截断到 [0,1]
 */
function hexToRgba(hex: string, alpha: number = 1): RGBA {
    // 清理输入，去掉前导 #
    const clean = hex.replace(/^#/, '').trim();

    // 处理短写 #RGB -> #RRGGBB
    const full =
        clean.length === 3
            ? clean.split('').map(ch => ch + ch).join('')
            : clean;

    if (!/^[0-9a-fA-F]{6}$/.test(full)) {
        throw new Error('Invalid hex color. Expected formats: #RRGGBB, RRGGBB, #RGB, RGB.');
    }

    const r8 = parseInt(full.slice(0, 2), 16);
    const g8 = parseInt(full.slice(2, 4), 16);
    const b8 = parseInt(full.slice(4, 6), 16);

    const clamp = (v: number, min = 0, max = 1) => Math.min(max, Math.max(min, v));
    const to01 = (n: number) => clamp(Number((n / 255).toFixed(8)));

    return {
        r: to01(r8),
        g: to01(g8),
        b: to01(b8),
        a: clamp(Number(alpha))
    };
}
export const buildingPresets = (manager:AzureManager)=>{
    //创建雾气预设
    const scattering = new WeatherPropertyGroup();
    scattering.name = "Scattering";
    scattering.weatherPropertyList = [];

    const molecularDensity = new WeatherProperty();
    molecularDensity.name = "MolecularDensity";
    molecularDensity.propertyType = WeatherPropertyType.Float;
    molecularDensity.defaultFloatValue = 1.2725;

    const rayleigh = new WeatherProperty();
    rayleigh.name = "RayleighMultiplier";
    rayleigh.propertyType = WeatherPropertyType.Curve;
    rayleigh.defaultCurveValue = new AnimationCurve([
        { time: 0, value: 7 },
        { time: 24, value: 7 }
    ]);

    const mie = new WeatherProperty();
    mie.name = "MieMultiplier";
    mie.propertyType = WeatherPropertyType.Curve;
    mie.defaultCurveValue = new AnimationCurve([
        { time: 0, value: 3 },
        { time: 24, value:3 }
    ]);

    const rayleighColor = new WeatherProperty();
    rayleighColor.name = "RayleighColor";
    rayleighColor.propertyType = WeatherPropertyType.Gradient;
    rayleighColor.defaultGradientValue = new Gradient([
        { time: 0, color: hexToRgba("#146FD7") },
        { time: 0.2, color: hexToRgba("#146FD7") },
        { time: 0.35, color: hexToRgba("#2F4094") },
        { time: 1-0.35, color: hexToRgba("#2F4094") },
        { time: 1-0.2, color: hexToRgba("#146FD7") },
        { time: 1, color: hexToRgba("#146FD7") },
    ]);

    const mieColor = new WeatherProperty();
    mieColor.name = "MieColor";
    mieColor.propertyType = WeatherPropertyType.Gradient;
    mieColor.defaultGradientValue = new Gradient([
        { time: 0, color: hexToRgba("#3F698C") },
        { time: 0.225, color: hexToRgba("#3F698C") },
        { time: 0.255, color: hexToRgba("#F5B752") },
        { time: 0.30, color: hexToRgba("#F5B752") },
        { time: 0.50, color: { r: 1, g: 1, b: 1, a: 1 } },
        { time: 1-0.30, color: hexToRgba("#F5B752") },
        { time: 1-0.255, color: hexToRgba("#F5B752") },
        { time: 1-0.225, color: hexToRgba("#3F698C") },
        { time: 1-0, color: hexToRgba("#3F698C") },
    ]);

    scattering.weatherPropertyList.push(molecularDensity, rayleigh, mie, rayleighColor, mieColor);

    const fog = new WeatherPropertyGroup();
    fog.name = "FogScattering";
    fog.weatherPropertyList = [];
    const makeFloat = (name: string, def: number) => {
        const p = new WeatherProperty();
        p.name = name;
        p.propertyType = WeatherPropertyType.Float;
        p.defaultFloatValue = def;
        return p;
    };
    const HeightFogScatterMultiplier = new WeatherProperty();
    HeightFogScatterMultiplier.name = "HeightFogScatterMultiplier";
    HeightFogScatterMultiplier.propertyType = WeatherPropertyType.Curve;
    HeightFogScatterMultiplier.defaultCurveValue = new AnimationCurve([
        { time: 0, value: 0.025 },
        { time: 6, value: 0.025 },
        { time: 7, value: 0.1 },
        { time: 10, value: 0.3 },
        { time: 24-10, value: 0.3 },
        { time: 24-7, value: 0.1 },
        { time: 24-6, value: 0.025 },
        { time: 24, value: 0.025 },
    ]);
    fog.weatherPropertyList.push(
        makeFloat("GlobalFogDistance", 50),
        makeFloat("GlobalFogSmooth", 0.35),
        makeFloat("GlobalFogDensity", 1.0),
        makeFloat("HeightFogDistance", 100.0),
        makeFloat("HeightFogSmooth", 0.5),
        makeFloat("HeightFogDensity", 0.5),
        makeFloat("FogBluishDistance", 12288.0),
        makeFloat("FogBluishIntensity", 0.15),
        HeightFogScatterMultiplier, // use Curve here
        makeFloat("MieDistance", 0.5),
    );

    const light = new WeatherPropertyGroup();
    light.name = "DirectionalLight";
    light.weatherPropertyList = [];

    const lightIntensity = new WeatherProperty();
    lightIntensity.name = "LightIntensity";
    lightIntensity.propertyType = WeatherPropertyType.Curve;
    lightIntensity.defaultCurveValue = manager.buildUnityIntensity([
        { time: 0, value: 0.35 },
        { time: 24, value: 0.35 },
    ]);

    const lightColor = new WeatherProperty();
    lightColor.name = "LightColor";
    lightColor.propertyType = WeatherPropertyType.Gradient;
    lightColor.defaultGradientValue=new Gradient([
        { time: 0, color: { r: 0.1607843, g: 0.2784314, b: 0.4627451, a: 1 } },
        { time: 0.225, color: { r: 0.1607843, g: 0.2784314, b: 0.4627451, a: 1 } },
        { time: 0.27, color: { r: 1, g: 0.5172414, b: 0, a: 1 } },
        { time: 0.37, color: { r: 1, g: 1, b: 1, a: 1 } },
        { time: 1-0.37, color: { r: 1, g: 1, b: 1, a: 1 } },
        { time: 1-0.27, color: { r: 1, g: 0.5172414, b: 0, a: 1 } },
        { time: 1-0.225, color: { r: 0.1607843, g: 0.2784314, b: 0.4627451, a: 1 } },
        { time: 1, color: { r: 0.1607843, g: 0.2784314, b: 0.4627451, a: 1 } },
    ]);

    light.weatherPropertyList.push(lightIntensity, lightColor);

    const starfield = new WeatherPropertyGroup();
    starfield.name = "Starfield";
    starfield.weatherPropertyList = [];

    const starFieldIntensity = new WeatherProperty();
    starFieldIntensity.name = "StarFieldIntensity";
    starFieldIntensity.propertyType = WeatherPropertyType.Curve;
    starFieldIntensity.defaultCurveValue = new AnimationCurve([
        { time: 0, value: 1 },
        { time: 6, value: 1 },
        { time: 6.5, value: 0 },
        { time: 17.5, value: 0 },
        { time: 18, value: 1 },
        { time: 24, value: 1 },
    ]);

    starfield.weatherPropertyList.push(starFieldIntensity);

    // 构建一个默认预设用于立即评估（支持 Curve / Gradient 新类型）
    const defaultPreset = WeatherPreset.createFromSchema([scattering, fog, light, starfield], "Fogness");
    manager.weather.globalWeatherList.push(new GlobalWeatherEntry(defaultPreset,3));
};