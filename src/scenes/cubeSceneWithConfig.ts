/**
 * 配置系统增强示例场景
 * 演示如何使用 AzureManager 配置系统创建自定义天气预设
 */
import * as THREE from "three";
import {defineScene} from "../core";
import {AtmosphereController} from "../utils/atmosphere/AtmosphereController";
import {AzureManager} from "../utils/manager";
import {WeatherPreset} from "../utils/weather-preset";
import {GlobalWeatherEntry} from "../utils/weather-system";

let controller: AtmosphereController | null = null;
let azureManager: AzureManager | null = null;
let animationId: number | null = null;

// 创建自定义天气预设
function createCustomPresets(azureManager: AzureManager) {
  const schema = azureManager.weather.weatherPropertyGroupList;

  // 1. 日落天气（橙红色调、中等雾气）
  const sunset = WeatherPreset.createFromSchema(schema, "Sunset");
  {
    // Scattering 组
    const g0 = sunset.propertyGroupDataList[0];
    g0.floatData[0] = 2.8;  // MolecularDensity
    g0.floatData[1] = 1.8;  // RayleighMultiplier（增强散射）
    g0.floatData[2] = 1.2;  // MieMultiplier
    g0.colorData[3] = { r: 1.0, g: 0.6, b: 0.3, a: 1 };  // RayleighColor（橙色）
    g0.colorData[4] = { r: 1.0, g: 0.7, b: 0.4, a: 1 };  // MieColor（暖色）

    // Fog 组
    const g1 = sunset.propertyGroupDataList[1];
    g1.floatData[0] = 800;   // GlobalFogDistance
    g1.floatData[1] = 0.3;   // GlobalFogSmooth
    g1.floatData[2] = 0.7;   // GlobalFogDensity
    g1.floatData[3] = 150;   // HeightFogDistance
    g1.floatData[4] = 0.9;   // HeightFogSmooth
    g1.floatData[5] = 0.15;  // HeightFogDensity
    g1.floatData[6] = 10000; // FogBluishDistance
    g1.floatData[7] = 0.05;  // FogBluishIntensity（减少蓝色）
    g1.floatData[8] = 0.5;   // HeightFogScatterMultiplier
    g1.floatData[9] = 0.9;   // MieDistance

    // Light 组
    const g2 = sunset.propertyGroupDataList[2];
    g2.floatData[0] = 0.8;  // LightIntensity
    g2.colorData[1] = { r: 1.0, g: 0.7, b: 0.5, a: 1 };  // LightColor（暖橙色）
  }

  // 2. 迷雾森林（高雾气密度、冷色调）
  const foggyForest = WeatherPreset.createFromSchema(schema, "FoggyForest");
  {
    const g0 = foggyForest.propertyGroupDataList[0];
    g0.floatData[0] = 3.2;   // MolecularDensity
    g0.floatData[1] = 1.3;   // RayleighMultiplier
    g0.floatData[2] = 1.8;   // MieMultiplier（增强雾气散射）
    g0.colorData[3] = { r: 0.85, g: 0.9, b: 0.95, a: 1 };  // RayleighColor（淡蓝）
    g0.colorData[4] = { r: 0.9, g: 0.95, b: 1.0, a: 1 };   // MieColor（冷白）

    const g1 = foggyForest.propertyGroupDataList[1];
    g1.floatData[0] = 300;   // GlobalFogDistance（近距离雾）
    g1.floatData[1] = 0.5;   // GlobalFogSmooth
    g1.floatData[2] = 1.5;   // GlobalFogDensity（高密度）
    g1.floatData[3] = 80;    // HeightFogDistance
    g1.floatData[4] = 1.2;   // HeightFogSmooth
    g1.floatData[5] = 0.8;   // HeightFogDensity（强烈高度雾）
    g1.floatData[6] = 8000;  // FogBluishDistance
    g1.floatData[7] = 0.3;   // FogBluishIntensity（增强蓝色调）
    g1.floatData[8] = 0.7;   // HeightFogScatterMultiplier
    g1.floatData[9] = 1.2;   // MieDistance

    const g2 = foggyForest.propertyGroupDataList[2];
    g2.floatData[0] = 0.5;  // LightIntensity（昏暗）
    g2.colorData[1] = { r: 0.85, g: 0.9, b: 0.95, a: 1 };  // LightColor（冷白色）
  }

  // 3. 沙尘暴（黄色调、极高散射）
  const sandstorm = WeatherPreset.createFromSchema(schema, "Sandstorm");
  {
    const g0 = sandstorm.propertyGroupDataList[0];
    g0.floatData[0] = 3.5;   // MolecularDensity
    g0.floatData[1] = 1.6;   // RayleighMultiplier
    g0.floatData[2] = 2.0;   // MieMultiplier（极强散射）
    g0.colorData[3] = { r: 0.95, g: 0.8, b: 0.5, a: 1 };  // RayleighColor（黄色）
    g0.colorData[4] = { r: 0.9, g: 0.7, b: 0.4, a: 1 };   // MieColor（橙黄）

    const g1 = sandstorm.propertyGroupDataList[1];
    g1.floatData[0] = 200;   // GlobalFogDistance（超近）
    g1.floatData[1] = 0.6;   // GlobalFogSmooth
    g1.floatData[2] = 2.0;   // GlobalFogDensity（超高密度）
    g1.floatData[3] = 50;    // HeightFogDistance
    g1.floatData[4] = 1.5;   // HeightFogSmooth
    g1.floatData[5] = 1.2;   // HeightFogDensity
    g1.floatData[6] = 5000;  // FogBluishDistance
    g1.floatData[7] = 0.0;   // FogBluishIntensity（无蓝色）
    g1.floatData[8] = 0.9;   // HeightFogScatterMultiplier
    g1.floatData[9] = 1.5;   // MieDistance

    const g2 = sandstorm.propertyGroupDataList[2];
    g2.floatData[0] = 0.4;  // LightIntensity（很暗）
    g2.colorData[1] = { r: 0.9, g: 0.75, b: 0.5, a: 1 };  // LightColor（黄色）
  }

  // 添加到全局列表（带不同的过渡时间）
  azureManager.weather.globalWeatherList.push(
    new GlobalWeatherEntry(sunset, 8.0),        // 8秒过渡
    new GlobalWeatherEntry(foggyForest, 12.0),  // 12秒过渡
    new GlobalWeatherEntry(sandstorm, 10.0)     // 10秒过渡
  );

  console.log("[Config] Created custom weather presets: Sunset, FoggyForest, Sandstorm");
}

export const cubeSceneWithConfig = defineScene({
  id: "cubeSceneWithConfig",
  name: "Cube Scene (配置系统演示)",
  resources: {
    shaders: {
      atmoVertex: "./assets/shaders/atmospheric_scattering.vert.glsl",
      atmoFragment: "./assets/shaders/atmospheric_scattering.frag.glsl",
      fogVertex: "./assets/shaders/fog_scattering.vert.glsl",
      fogFragment: "./assets/shaders/fog_scattering.frag.glsl",
      depthVertex: "./assets/shaders/depth_display.vert.glsl",
      depthFragment: "./assets/shaders/depth_display.frag.glsl",
      standardVertex: "./assets/shaders/standard.vert.glsl",
      standardFragment: "./assets/shaders/standard.frag.glsl",
    },
  },
  main: async (resources) => {
    const atmoVertex = resources.get("atmoVertex") as string;
    const atmoFragment = resources.get("atmoFragment") as string;
    const fogVertex = resources.get("fogVertex") as string;
    const fogFragment = resources.get("fogFragment") as string;
    const depthVertex = resources.get("depthVertex") as string;
    const depthFragment = resources.get("depthFragment") as string;
    const standardVertex = resources.get("standardVertex") as string;
    const standardFragment = resources.get("standardFragment") as string;

    // 初始化控制器
    controller = new AtmosphereController({
      canvasParent: document.getElementById("app"),
      shaders: {
        atmoVertex,
        atmoFragment,
        fogVertex,
        fogFragment,
        depthVertex,
        depthFragment,
        standardVertex,
        standardFragment,
      },
      options: {
        autoUpdateFromSystems: true,
        enableDepthDebug: false,
        controls: true,
      },
    });
    controller.initialize();

    // 创建场景内容
    const cubeGeom = new THREE.BoxGeometry(1, 1, 1);
    const colors = [0xff6b6b, 0x4ecdc4, 0xffe66d, 0x95e1d3, 0xf38181, 0xaa96da];
    for (let i = 0; i < colors.length; i++) {
      const mat = new THREE.MeshStandardMaterial({ color: colors[i], roughness: 0.5, metalness: 0.2 });
      const mesh = new THREE.Mesh(cubeGeom, mat);
      mesh.position.set((i - 2.5) * 2, 0.5, (i % 2 === 0 ? -2 : 2));
      mesh.castShadow = true;
      controller.scene.add(mesh);
    }

    const groundGeom = new THREE.PlaneGeometry(50, 50);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x8bc34a, roughness: 0.8, metalness: 0.2 });
    const ground = new THREE.Mesh(groundGeom, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    controller.scene.add(ground);

    controller.scene.add(new THREE.GridHelper(50, 50, 0x666666, 0x888888));
    controller.scene.add(new THREE.AxesHelper(5));

    // ========== 配置系统演示 ==========

    // 1. 创建 Azure Manager
    azureManager = new AzureManager();

    // 2. 构建默认配置结构（Schema）
    azureManager.buildDefaultSchema();

    // 3. 构建内置预设（Clear, Overcast, Storm）
    //azureManager.buildExamplePresets();

    // 4. 创建自定义预设（Sunset, FoggyForest, Sandstorm）
    createCustomPresets(azureManager);

    // 5. 挂载到 Controller（自动同步参数）
    controller.attachAzureManager(azureManager);

    // 6. 配置时间系统（30秒一个昼夜，方便观察）
    azureManager.time.updateConfig({
      dayLength: 0.5,      // 30秒
      dawnTime: 6.0,
      duskTime: 18.0
    });

    // 7. 设置初始天气（Clear）
    controller.applyWeatherPreset(0);

    console.log("[Config Scene] 可用的天气预设:");
    console.log("  0: Clear (默认)");
    console.log("  1: Overcast");
    console.log("  2: Storm");
    console.log("  3: Sunset (自定义)");
    console.log("  4: FoggyForest (自定义)");
    console.log("  5: Sandstorm (自定义)");

    // ========== 天气自动切换演示 ==========

    // 5秒后 -> Sunset
    setTimeout(() => {
      console.log("[Config Scene] Switching to Sunset...");
      controller?.applyWeatherPreset(3);
    }, 5000);

    // 15秒后 -> FoggyForest
    setTimeout(() => {
      console.log("[Config Scene] Switching to FoggyForest...");
      controller?.applyWeatherPreset(4);
    }, 15000);

    // 30秒后 -> Sandstorm
    setTimeout(() => {
      console.log("[Config Scene] Switching to Sandstorm...");
      controller?.applyWeatherPreset(5);
    }, 30000);

    // 45秒后 -> 回到 Clear
    setTimeout(() => {
      console.log("[Config Scene] Switching back to Clear...");
      controller?.applyWeatherPreset(0);
    }, 45000);

    // ========== 键盘控制（可选） ==========

    const handleKeyDown = (e: KeyboardEvent) => {
      switch(e.key) {
        case '1': controller?.applyWeatherPreset(0); console.log("→ Clear"); break;
        case '2': controller?.applyWeatherPreset(1); console.log("→ Overcast"); break;
        case '3': controller?.applyWeatherPreset(2); console.log("→ Storm"); break;
        case '4': controller?.applyWeatherPreset(3); console.log("→ Sunset"); break;
        case '5': controller?.applyWeatherPreset(4); console.log("→ FoggyForest"); break;
        case '6': controller?.applyWeatherPreset(5); console.log("→ Sandstorm"); break;
        case 't':
          // 切换时间（昼夜）
          const currentTime = azureManager?.time.evaluationTime ?? 12;
          const newTime = currentTime < 12 ? 18 : 6;  // 白天 -> 黄昏，夜晚 -> 黎明
          azureManager?.time.setTime(newTime);
          console.log(`Time set to ${newTime}:00`);
          break;
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    // 渲染循环
    const loop = () => {
      animationId = requestAnimationFrame(loop);
      controller?.update();
    };
    loop();

    console.log("[Config Scene] 场景启动成功！");
    console.log("  - 按键 1-6：切换天气预设");
    console.log("  - 按键 T：切换昼夜时间");
    console.log("  - 自动演示：每15秒切换天气");

    // 清理函数
    return;
  },
  onExit: async () => {
    if (animationId) {
      cancelAnimationFrame(animationId);
      animationId = null;
    }
    controller?.dispose();
    controller = null;
    azureManager = null;
  },
});

export function startCubeSceneWithConfig() {
  return cubeSceneWithConfig();
}

