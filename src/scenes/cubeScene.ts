/**
 * 使用 AtmosphereController 的新版本场景，只保留立方体与地面演示。
 * 不再手写 skyParams 与键盘事件，所有参数可通过 controller API 或 AzureManager 预设/时间驱动。
 */
import * as THREE from "three";
import {defineScene} from "../core";
import {AtmosphereController} from "../utils/atmosphere/AtmosphereController";
import {AzureManager} from "../utils/manager";

let controller: AtmosphereController | null = null;
let azureManager: AzureManager | null = null;
let animationId: number | null = null;

export const cubeScene = defineScene({
  id: "cubeScene",
  name: "Cube Scene (AtmosphereController)",
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

    // 示例：创建立方体阵列（使用标准材质或自定义 shader）
    const cubeGeom = new THREE.BoxGeometry(1, 1, 1);
    const colors = [0xff6b6b, 0x4ecdc4, 0xffe66d, 0x95e1d3, 0xf38181, 0xaa96da];
    for (let i = 0; i < colors.length; i++) {
      const mat = new THREE.MeshStandardMaterial({ color: colors[i], roughness: 0.5, metalness: 0.2 });
      const mesh = new THREE.Mesh(cubeGeom, mat);
      mesh.position.set((i - 2) * 2, 0.5, (i % 2 === 0 ? -2 : 2));
      mesh.castShadow = true;
      controller.scene.add(mesh);
    }

    // 地面
    const groundGeom = new THREE.PlaneGeometry(50, 50);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x8bc34a, roughness: 0.8, metalness: 0.2 });
    const ground = new THREE.Mesh(groundGeom, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    controller.scene.add(ground);

    // 帮助线
    controller.scene.add(new THREE.GridHelper(50, 50, 0x666666, 0x888888));
    controller.scene.add(new THREE.AxesHelper(5));

    // （可选）挂载 Azure 时间 + 天气系统
    azureManager = new AzureManager();
    azureManager.buildDefaultSchema();
    //azureManager.buildExamplePresets();
    controller.attachAzureManager(azureManager);

    // 设置时间循环与日长，便于观察光照随时间变化（例如 1 分钟一个昼夜）
    azureManager.time.updateConfig({ dayLength: 0.4, dawnTime: 6.0, duskTime: 18.0 });

    // 渲染循环（交给 controller 内部根据 Azure 时间/天气更新太阳与光照）
    const loop = () => {
      animationId = requestAnimationFrame(loop);
      controller?.update();
    };
    loop();

    console.log("[Cube Scene] AtmosphereController initialized.");
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

export function startCubeScene() {
  return cubeScene();
}