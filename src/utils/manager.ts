import { AzureEvents } from "./notification-center";
import { TimeSystem } from "./time-system";
import { WeatherSystem, GlobalWeatherEntry } from "./weather-system";
import { WeatherPropertyGroup } from "./weather-property-group";
import { WeatherProperty } from "./weather-property";
import { WeatherPreset } from "./weather-preset";
import { WeatherPropertyType } from "./types";
import {AnimationCurve} from "./animation-curve";
import {Gradient} from "./gradient";

export class AzureManager {
    readonly time = new TimeSystem();
    readonly weather = new WeatherSystem();

    buildDefaultSchema() {
        const scattering = new WeatherPropertyGroup();
        scattering.name = "Scattering";
        scattering.weatherPropertyList = [];

        const molecularDensity = new WeatherProperty();
        molecularDensity.name = "MolecularDensity";
        molecularDensity.propertyType = WeatherPropertyType.Float;
        molecularDensity.defaultFloatValue = 2.545;

        const rayleigh = new WeatherProperty();
        rayleigh.name = "RayleighMultiplier";
        rayleigh.propertyType = WeatherPropertyType.Curve;
        rayleigh.defaultCurveValue = new AnimationCurve([
            { time: 0, value: 2 },
            { time: 24, value:0.5 }
        ]);

        const mie = new WeatherProperty();
        mie.name = "MieMultiplier";
        mie.propertyType = WeatherPropertyType.Curve;
        mie.defaultCurveValue = new AnimationCurve([
            { time: 0, value: 2 },
            { time: 4.9, value: 2 },
            { time: 6, value: 0.5 },
            { time: 18, value: 0.5 },
            { time: 18.9, value: 2 },
            { time: 24, value:2 }
        ]);

        const rayleighColor = new WeatherProperty();
        rayleighColor.name = "RayleighColor";
        rayleighColor.propertyType = WeatherPropertyType.Gradient;
        rayleighColor.defaultGradientValue = new Gradient([
            { time: 0, color: { r: 0.25, g: 0.6586208, b: 1, a: 1 } },
            { time: 0.2, color: { r: 0.25, g: 0.6586208, b: 1, a: 1 } },
            { time: 0.25, color: { r: 0.6102941, g: 0.8226167, b: 1, a: 1 } },
            { time: 0.35, color: { r: 1, g: 1, b: 1, a: 1 } },
            { time: 0.65, color: { r: 1, g: 1, b: 1, a: 1 } },
            { time: 1-0.25, color: { r: 0.6102941, g: 0.8226167, b: 1, a: 1 } },
            { time: 1-0.2, color: { r: 0.25, g: 0.6586208, b: 1, a: 1 } },
            { time: 1, color: { r: 0.25, g: 0.6586208, b: 1, a: 1 } },
        ]);

        const mieColor = new WeatherProperty();
        mieColor.name = "MieColor";
        mieColor.propertyType = WeatherPropertyType.Gradient;
        mieColor.defaultGradientValue = new Gradient([
            { time: 0, color: { r: 0.25, g: 0.6586208, b: 1, a: 1 } },
            { time: 0.25, color: { r: 0.25, g: 0.6586208, b: 1, a: 1 } },
            { time: 0.255, color: { r: 0.9622642, g: 0.718456, b: 0.3222677, a: 1 } },
            { time: 0.30, color: { r: 0.9622642, g: 0.718456, b: 0.3222677, a: 1 } },
            { time: 0.50, color: { r: 1, g: 1, b: 1, a: 1 } },
            { time: 1-0.30, color: { r: 0.9622642, g: 0.718456, b: 0.3222677, a: 1 } },
            { time: 1-0.255, color: { r: 0.9622642, g: 0.718456, b: 0.3222677, a: 1 } },
            { time: 1-0.25, color: { r: 0.25, g: 0.6586208, b: 1, a: 1 } },
            { time: 1, color: { r: 0.25, g: 0.6586208, b: 1, a: 1 } },
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
            { time: 10, value: 0.5 },
            { time: 24-10, value: 0.5 },
            { time: 24-7, value: 0.1 },
            { time: 24-6, value: 0.025 },
            { time: 0, value: 0.025 },
        ]);
        fog.weatherPropertyList.push(
            makeFloat("GlobalFogDistance", 1000),
            makeFloat("GlobalFogSmooth", 0.25),
            makeFloat("GlobalFogDensity", 1.0),
            makeFloat("HeightFogDistance", 100.0),
            makeFloat("HeightFogSmooth", 1.0),
            makeFloat("HeightFogDensity", 0.0),
            makeFloat("FogBluishDistance", 12288.0),
            makeFloat("FogBluishIntensity", 0.15),
            makeFloat("HeightFogScatterMultiplier", 0.5),
            makeFloat("MieDistance", 1.0),
        );

        const light = new WeatherPropertyGroup();
        light.name = "DirectionalLight";
        light.weatherPropertyList = [];

        const lightIntensity = new WeatherProperty();
        lightIntensity.name = "LightIntensity";
        lightIntensity.propertyType = WeatherPropertyType.Curve;
        lightIntensity.defaultCurveValue = new AnimationCurve([
            { time: 0, value: 0.35 },
            { time: 5.5, value: 0.35 },
            { time: 6, value: 0.1 },
            { time: 6.5, value: 1 },
            { time: 24-6.5, value: 1 },
            { time: 24-6, value: 0.1 },
            { time: 24-5.5, value: 0.35 },
            { time: 24-0, value: 0.35 },
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
            { time: 1-0, color: { r: 0.1607843, g: 0.2784314, b: 0.4627451, a: 1 } },
        ]);

        light.weatherPropertyList.push(lightIntensity, lightColor);

        this.weather.weatherPropertyGroupList = [scattering, fog, light];
    }
    /*
    buildExamplePresets() {
        const schema = this.weather.weatherPropertyGroupList;

        // Clear
        const clear = WeatherPreset.createFromSchema(schema, "Clear");
        {
            const g0 = clear.propertyGroupDataList[0]; // Scattering (5 props: 0..2 float, 3..4 color)
            g0.floatData[0] = 2.545;
            g0.floatData[1] = 1.0;
            g0.floatData[2] = 0.8;
            g0.colorData[3] = { r: 1, g: 1, b: 1, a: 1 };
            g0.colorData[4] = { r: 1, g: 1, b: 1, a: 1 };

            const g1 = clear.propertyGroupDataList[1]; // Fog (10 floats: 0..9)
            g1.floatData[0] = 2000;  // GlobalFogDistance
            g1.floatData[1] = 0.15;  // GlobalFogSmooth
            g1.floatData[2] = 0.6;   // GlobalFogDensity
            g1.floatData[3] = 200;   // HeightFogDistance
            g1.floatData[4] = 0.8;   // HeightFogSmooth
            g1.floatData[5] = 0.05;  // HeightFogDensity
            g1.floatData[6] = 12288; // FogBluishDistance
            g1.floatData[7] = 0.1;   // FogBluishIntensity
            g1.floatData[8] = 0.4;   // HeightFogScatterMultiplier
            g1.floatData[9] = 0.8;   // MieDistance

            const g2 = clear.propertyGroupDataList[2]; // Light (0 float intensity, 1 color)
            g2.floatData[0] = 1.0;
            g2.colorData[1] = { r: 1, g: 1, b: 0.98, a: 1 };
        }

        // Overcast
        const overcast = WeatherPreset.createFromSchema(schema, "Overcast");
        {
            const g0 = overcast.propertyGroupDataList[0];
            g0.floatData[0] = 2.8;
            g0.floatData[1] = 1.2;
            g0.floatData[2] = 1.2;
            g0.colorData[3] = { r: 0.95, g: 0.97, b: 1.0, a: 1 };
            g0.colorData[4] = { r: 0.95, g: 0.97, b: 1.0, a: 1 };

            const g1 = overcast.propertyGroupDataList[1];
            g1.floatData[0] = 1200;
            g1.floatData[1] = 0.4;
            g1.floatData[2] = 1.0;
            g1.floatData[3] = 150;
            g1.floatData[4] = 1.0;
            g1.floatData[5] = 0.2;
            g1.floatData[6] = 9000;
            g1.floatData[7] = 0.2;
            g1.floatData[8] = 0.6;
            g1.floatData[9] = 1.0;

            const g2 = overcast.propertyGroupDataList[2];
            g2.floatData[0] = 0.7;
            g2.colorData[1] = { r: 0.9, g: 0.92, b: 0.95, a: 1 };
        }

        // Storm
        const storm = WeatherPreset.createFromSchema(schema, "Storm");
        {
            const g0 = storm.propertyGroupDataList[0];
            g0.floatData[0] = 3.0;
            g0.floatData[1] = 1.4;
            g0.floatData[2] = 1.6;
            g0.colorData[3] = { r: 0.9, g: 0.95, b: 1.0, a: 1 };
            g0.colorData[4] = { r: 1.0, g: 0.9, b: 0.85, a: 1 };

            const g1 = storm.propertyGroupDataList[1];
            g1.floatData[0] = 800;
            g1.floatData[1] = 0.6;
            g1.floatData[2] = 1.2;
            g1.floatData[3] = 120;
            g1.floatData[4] = 1.2;
            g1.floatData[5] = 0.4;
            g1.floatData[6] = 6000;
            g1.floatData[7] = 0.4;
            g1.floatData[8] = 0.8;
            g1.floatData[9] = 1.2;

            const g2 = storm.propertyGroupDataList[2];
            g2.floatData[0] = 0.5;
            g2.colorData[1] = { r: 0.85, g: 0.9, b: 1.0, a: 1 };
        }

        this.weather.currentWeatherPreset = clear;
        this.weather.globalWeatherList = [
            new GlobalWeatherEntry(clear, 8),
            new GlobalWeatherEntry(overcast, 12),
            new GlobalWeatherEntry(storm, 15),
        ];
    }
    */
    private _startTimeSec = performance.now() / 1000;
    private _lastTimeSec = this._startTimeSec;

    update() {
        const now = performance.now() / 1000;
        const dt = now - this._lastTimeSec;
        this._lastTimeSec = now;

        this.time.update(dt);
        this.weather.setEvaluationTime(this.time.evaluationTime);
        this.weather.update(now, dt);
    }
}