import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { AtmosphereParams, AtmosphereControllerOptions, PartialAtmosphereParams } from "./types";
import { computeRayleigh, computeMie, computeMieG } from "./shader-utils";
import {AzureManager} from "../manager";
 // 可选，如果使用时间与天气系统

/**
 * 完全接管：天空盒 + 雾散射后处理 + 深度RT + 光照 + 参数同步
 * 使用方式：
 * const controller = new AtmosphereController({
 *   canvasParent: document.getElementById('app'),
 *   shaders: { atmoVertex, atmoFragment, fogVertex, fogFragment, depthVertex, depthFragment, standardVertex, standardFragment },
 *   options: { autoUpdateFromSystems: true }
 * });
 * controller.initialize();
 * （可选）controller.attachAzureManager(azureManager);
 * 在你的循环里：controller.update();
 */
export class AtmosphereController {
  // ---- 外部依赖与配置 ----
  private canvasParent: HTMLElement | null;
  private shaders: {
    atmoVertex: string;
    atmoFragment: string;
    fogVertex: string;
    fogFragment: string;
    depthVertex?: string;
    depthFragment?: string;
    standardVertex?: string;
    standardFragment?: string;
  };
  private options: AtmosphereControllerOptions;

  // ---- Three 基础 ----
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  public composer: EffectComposer;
  private renderPass: RenderPass;
  private fogPass: ShaderPass;
  private depthPass?: ShaderPass;
  private depthRenderTarget: THREE.WebGLRenderTarget;
  private controls?: OrbitControls;

  // ---- 光照与实体 ----
  public directionalLight: THREE.DirectionalLight;
  public ambientLight: THREE.AmbientLight;
  private skybox: THREE.Mesh;
  private skyboxMaterial: THREE.ShaderMaterial;

  // ---- 自定义着色材质缓存（标准立方体等） ----
  public customMaterials: THREE.ShaderMaterial[] = [];

  // ---- 大气参数状态 ----
  public params: AtmosphereParams;

  // ---- Azure Manager（可选） ----
  private azureManager?: AzureManager;

  // ---- 生命周期 ----
  private disposed = false;

  // ---- 构造 ----
  constructor(cfg: {
    canvasParent?: HTMLElement | null;
    shaders: AtmosphereController["shaders"];
    options?: AtmosphereControllerOptions;
    initialParams?: PartialAtmosphereParams;
  }) {
    this.canvasParent = cfg.canvasParent ?? null;
    this.shaders = cfg.shaders;
    this.options = {
      enableDepthDebug: false,
      skyRadius: 500,
      autoUpdateFromSystems: false,
      controls: true,
      ...(cfg.options || {}),
    };

    // 初始参数（参考你的原始 skyParams）
    this.params = {
      sunPosition: new THREE.Vector3(0, 0.05, -1),
      kr: 8400,
      km: 1200,
      wavelength: new THREE.Vector3(680, 550, 450),
      molecularDensity: 5.545,
      rayleigh: 0.5,
      mie: 1.0,
      mieDirectionalG: 0.75,
      scattering: 10.0,
      luminance: 0.1,
      exposure: 2.0,
      rayleighColor: new THREE.Color(1, 1, 1),
      mieColor: new THREE.Color(1, 1, 1),
      globalFogDistance: 50,
      globalFogSmooth: 0.01,
      globalFogDensity: 1.0,
      heightFogDistance: 100.0,
      heightFogSmooth: 1.0,
      heightFogDensity: 0.0,
      heightFogStart: 0.0,
      heightFogEnd: 1.0,
      fogBluishDistance: 1228899.0,
      fogBluishIntensity: 0.0,
      heightFogScatterMultiplier: 0.5,
      mieDistance: 1.0,
    };

    if (cfg.initialParams) {
      this.overrideParameters(cfg.initialParams);
    }

    // 基本 Three 场景
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.set(8, 5, 8);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;

    this.depthRenderTarget = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      format: THREE.RGBAFormat,
      depthBuffer: true,
      stencilBuffer: false,
    });
    this.depthRenderTarget.depthTexture = new THREE.DepthTexture(window.innerWidth, window.innerHeight);
    this.depthRenderTarget.depthTexture.format = THREE.DepthFormat;
    this.depthRenderTarget.depthTexture.type = THREE.UnsignedInt248Type;

    this.composer = new EffectComposer(this.renderer);
    this.renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(this.renderPass);

    // 光照
    this.ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    this.scene.add(this.ambientLight);

    this.directionalLight = new THREE.DirectionalLight(0xffffff, 0.9);
    this.directionalLight.castShadow = true;
    this.directionalLight.shadow.mapSize.set(2048, 2048);
    this.scene.add(this.directionalLight);

    // 事件
    window.addEventListener("resize", this.handleResize);
  }

  initialize() {
    if (this.canvasParent) {
      this.canvasParent.innerHTML = "";
      this.canvasParent.appendChild(this.renderer.domElement);
    }

    if (this.options.controls) {
      this.controls = new OrbitControls(this.camera, this.renderer.domElement);
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.05;
      this.controls.target.set(0, 0, 0);
      this.controls.update();
    }

    this.buildSkybox();
    this.buildFogPass();
    if (this.options.enableDepthDebug && this.shaders.depthVertex && this.shaders.depthFragment) {
      this.buildDepthPass();
    }
    this.updateAllUniforms(true);
  }

  attachAzureManager(manager: AzureManager) {
    this.azureManager = manager;
    // 自动同步：在 weather 更新后读出属性写入 this.params 再刷新 uniforms
    // 这里直接在 update() 中执行（autoUpdateFromSystems）
  }

  // ---- 外部调用 API ----
  setTime(hours: number) {
    if (this.azureManager) {
      this.azureManager.time.setTime(hours);
    } else {
      // 没有时间系统时可直接根据 hours 调太阳高度
      // 简单映射：-1..1 -> y
      const elevation = Math.sin((hours / 24) * Math.PI * 2);
      this.params.sunPosition.y = elevation;
      this.updateSunDirection();
      this.updateAllUniforms();
    }
  }

  playTimeline(dayLengthMinutes: number) {
    if (this.azureManager) {
      this.azureManager.time.updateConfig({ dayLength: dayLengthMinutes });
    }
  }

  pauseTimeline() {
    if (this.azureManager) {
      this.azureManager.time.updateConfig({ dayLength: 0 });
    }
  }

  setSunAngles(elevationRadians: number, azimuthRadians: number) {
    // 将球坐标转换到向量（Z 指向 -1 初始）
    const r = 1;
    const y = Math.sin(elevationRadians);
    const horiz = Math.cos(elevationRadians);
    const x = horiz * Math.sin(azimuthRadians);
    const z = horiz * Math.cos(azimuthRadians);
    this.params.sunPosition.set(x, y, z);
    this.updateSunDirection();
    this.updateAllUniforms();
  }

  applyWeatherPreset(index: number) {
    if (!this.azureManager) return;
    this.azureManager.weather.setGlobalWeatherByIndex(index, performance.now() / 1000);
  }

  overrideParameters(partial: PartialAtmosphereParams) {
    for (const k in partial) {
      const key = k as keyof PartialAtmosphereParams;
      const val = partial[key];
      if (val == null) continue;
      if (val instanceof THREE.Vector3 && key === "sunPosition") {
        (this.params.sunPosition as THREE.Vector3).copy(val);
      } else if (val instanceof THREE.Color) {
        (this.params as any)[key].copy(val);
      } else if (typeof val === "object" && (key === "rayleighColor" || key === "mieColor")) {
        const c = this.params[key as "rayleighColor" | "mieColor"];
        c.setRGB((val as any).r, (val as any).g, (val as any).b);
      } else {
        (this.params as any)[key] = val;
      }
    }
    this.updateSunDirection();
    this.updateAllUniforms();
  }

  toggleDepthDebug() {
    if (this.depthPass) {
      const current = this.depthPass.uniforms.showDepth.value;
      this.depthPass.uniforms.showDepth.value = !current;
    }
  }

  update() {
    if (this.disposed) return;
    // 驱动时间与天气
    if (this.azureManager) {
      this.azureManager.update();
      if (this.options.autoUpdateFromSystems) {
        // 从 weather schema 拿值映射到 params
        this.pullFromWeatherSystem();
      }
    }

    // 渲染前更新矩阵与 uniforms
    this.updateFogMatrices();
    this.renderDepthTexture();
    this.updateCustomMaterialsLighting();

    if (this.controls) this.controls.update();
    this.composer.render();
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;

    window.removeEventListener("resize", this.handleResize);

    this.customMaterials.forEach(m => m.dispose());
    this.skyboxMaterial.dispose();
    this.skybox.geometry.dispose();

    this.depthRenderTarget.dispose();
    if (this.depthRenderTarget.depthTexture) this.depthRenderTarget.depthTexture.dispose();

    this.composer.dispose();
    this.renderer.dispose();

    this.scene.traverse(obj => {
      if ((obj as any).geometry) (obj as any).geometry.dispose();
      if ((obj as any).material) {
        const mat = (obj as any).material;
        if (Array.isArray(mat)) mat.forEach(m => m.dispose());
        else mat.dispose();
      }
    });

    if (this.canvasParent) this.canvasParent.innerHTML = "";
  }

  // ---- 内部构建 ----
  private buildSkybox() {
    const geo = new THREE.SphereGeometry(this.options.skyRadius!, 32, 32);
    this.skyboxMaterial = new THREE.ShaderMaterial({
      uniforms: {
        sunPosition: { value: this.params.sunPosition.clone().normalize() },
        kr: { value: this.params.kr },
        km: { value: this.params.km },
        rayleighCoef: { value: computeRayleigh(this.params) },
        mieCoef: { value: computeMie(this.params) },
        mieG: { value: computeMieG(this.params) },
        scattering: { value: this.params.scattering },
        custom_luminance: { value: this.params.luminance },
        exposure: { value: this.params.exposure },
        rayleighColor: { value: this.params.rayleighColor.clone() },
        mieColor: { value: this.params.mieColor.clone() },
      },
      vertexShader: this.shaders.atmoVertex,
      fragmentShader: this.shaders.atmoFragment,
      side: THREE.BackSide,
      depthWrite: false,
    });
    this.skybox = new THREE.Mesh(geo, this.skyboxMaterial);
    this.scene.add(this.skybox);
  }

  private buildFogPass() {
    const fogShader = {
      uniforms: {
        tDiffuse: { value: null },
        tDepth: { value: this.depthRenderTarget.depthTexture },
        cameraNear: { value: this.camera.near },
        cameraFar: { value: this.camera.far },
        inverseProjectionMatrix: { value: new THREE.Matrix4() },
        inverseViewMatrix: { value: new THREE.Matrix4() },

        sunDirection: { value: this.params.sunPosition.clone().normalize() },
        moonDirection: { value: this.params.sunPosition.clone().normalize().negate() },

        mieDistance: { value: this.params.mieDistance },
        kr: { value: this.params.kr },
        km: { value: this.params.km },
        rayleighCoef: { value: computeRayleigh(this.params) },
        mieCoef: { value: computeMie(this.params) },
        mieG: { value: computeMieG(this.params) },
        scattering: { value: this.params.scattering },
        skyLuminance: { value: this.params.luminance },
        exposure: { value: this.params.exposure },
        rayleighColor: { value: this.params.rayleighColor.clone() },
        mieColor: { value: this.params.mieColor.clone() },

        globalFogDistance: { value: this.params.globalFogDistance },
        globalFogSmooth: { value: this.params.globalFogSmooth },
        globalFogDensity: { value: this.params.globalFogDensity },
        heightFogDistance: { value: this.params.heightFogDistance },
        heightFogSmooth: { value: this.params.heightFogSmooth },
        heightFogDensity: { value: this.params.heightFogDensity },
        heightFogStart: { value: this.params.heightFogStart },
        heightFogEnd: { value: this.params.heightFogEnd },
        fogBluishDistance: { value: this.params.fogBluishDistance },
        fogBluishIntensity: { value: this.params.fogBluishIntensity },
        heightFogScatterMultiplier: { value: this.params.heightFogScatterMultiplier },
      },
      vertexShader: this.shaders.fogVertex,
      fragmentShader: this.shaders.fogFragment,
    };
    this.fogPass = new ShaderPass(fogShader);
    this.fogPass.renderToScreen = true;
    this.composer.addPass(this.fogPass);
  }

  private buildDepthPass() {
    const depthShader = {
      uniforms: {
        tDiffuse: { value: null },
        tDepth: { value: this.depthRenderTarget.depthTexture },
        cameraNear: { value: this.camera.near },
        cameraFar: { value: this.camera.far },
        showDepth: { value: false },
        depthRange: { value: 20.0 },
      },
      vertexShader: this.shaders.depthVertex!,
      fragmentShader: this.shaders.depthFragment!,
    };
    this.depthPass = new ShaderPass(depthShader);
    // 不直接显示，让雾Pass最终输出；如需调试可以放在雾之前
    // this.composer.addPass(this.depthPass);
  }

  // ---- Uniform 更新 ----
  private updateAllUniforms(force = false) {
    // Skybox
    const normalizedSun = this.params.sunPosition.clone().normalize();
    const mieG = computeMieG(this.params);
    const rayleighCoef = computeRayleigh(this.params);
    const mieCoef = computeMie(this.params);

    const sU = this.skyboxMaterial.uniforms;
    sU.sunPosition.value.copy(normalizedSun);
    sU.kr.value = this.params.kr;
    sU.km.value = this.params.km;
    sU.rayleighCoef.value.copy(rayleighCoef);
    sU.mieCoef.value.copy(mieCoef);
    sU.mieG.value.copy(mieG);
    sU.scattering.value = this.params.scattering;
    sU.custom_luminance.value = this.params.luminance;
    sU.exposure.value = this.params.exposure;
    sU.rayleighColor.value.copy(this.params.rayleighColor);
    sU.mieColor.value.copy(this.params.mieColor);

    // Fog Pass
    const fU = this.fogPass.uniforms;
    fU.sunDirection.value.copy(this.transformSunForFog(normalizedSun));
    fU.moonDirection.value.copy(this.transformSunForFog(normalizedSun).negate());
    fU.mieDistance.value = this.params.mieDistance;
    fU.kr.value = this.params.kr;
    fU.km.value = this.params.km;
    fU.rayleighCoef.value.copy(rayleighCoef);
    fU.mieCoef.value.copy(mieCoef);
    fU.mieG.value.copy(mieG);
    fU.scattering.value = this.params.scattering;
    fU.skyLuminance.value = this.params.luminance;
    fU.exposure.value = this.params.exposure;
    fU.rayleighColor.value.copy(this.params.rayleighColor);
    fU.mieColor.value.copy(this.params.mieColor);
    fU.globalFogDistance.value = this.params.globalFogDistance;
    fU.globalFogSmooth.value = this.params.globalFogSmooth;
    fU.globalFogDensity.value = this.params.globalFogDensity;
    fU.heightFogDistance.value = this.params.heightFogDistance;
    fU.heightFogSmooth.value = this.params.heightFogSmooth;
    fU.heightFogDensity.value = this.params.heightFogDensity;
    fU.heightFogStart.value = this.params.heightFogStart;
    fU.heightFogEnd.value = this.params.heightFogEnd;
    fU.fogBluishDistance.value = this.params.fogBluishDistance;
    fU.fogBluishIntensity.value = this.params.fogBluishIntensity;
    fU.heightFogScatterMultiplier.value = this.params.heightFogScatterMultiplier;

    // Light (位置根据 sun)
    this.directionalLight.position.copy(normalizedSun.clone().multiplyScalar(20));
  }

  private transformSunForFog(dir: THREE.Vector3): THREE.Vector3 {
    // 保持与你原场景中对 sunDir 的反转一致
    return new THREE.Vector3(-dir.x, dir.y, -dir.z);
  }

  private updateSunDirection() {
    // 可在天气/时间驱动时更改 sunPosition -> 这里只保证其变化后处理
  }

  private updateFogMatrices() {
    this.fogPass.uniforms.inverseProjectionMatrix.value.copy(this.camera.projectionMatrixInverse);
    this.fogPass.uniforms.inverseViewMatrix.value.copy(this.camera.matrixWorld);
  }

  private renderDepthTexture() {
    this.renderer.setRenderTarget(this.depthRenderTarget);
    this.renderer.clear();
    this.renderer.render(this.scene, this.camera);
    this.renderer.setRenderTarget(null);
  }

  private updateCustomMaterialsLighting() {
    const worldLightDir = new THREE.Vector3().subVectors(new THREE.Vector3(0, 0, 0), this.directionalLight.position).normalize();
    const viewLightDir = worldLightDir.clone().transformDirection(this.camera.matrixWorldInverse);
    this.customMaterials.forEach(mat => {
      if ((mat.uniforms as any).uLightDirection) {
        (mat.uniforms as any).uLightDirection.value.copy(viewLightDir);
        (mat.uniforms as any).uLightColor.value.copy(this.directionalLight.color);
      }
    });
  }

    private pullFromWeatherSystem() {
        if (!this.azureManager) return;
        const groups = this.azureManager.weather.weatherPropertyGroupList;
        if (groups.length < 3) return;

        // Scattering
        {
            const sc = groups[0].weatherPropertyList;
            this.params.molecularDensity = sc[0].floatOutput;
            this.params.rayleigh = sc[1].floatOutput;
            this.params.mie = sc[2].floatOutput;

            // 容错：若 colorOutput 未被正确写入，回落到当前 params 颜色
            const rc = sc[3]?.colorOutput ?? { r: this.params.rayleighColor.r, g: this.params.rayleighColor.g, b: this.params.rayleighColor.b };
            const mc = sc[4]?.colorOutput ?? { r: this.params.mieColor.r, g: this.params.mieColor.g, b: this.params.mieColor.b };

            this.params.rayleighColor.setRGB(rc.r, rc.g, rc.b);
            this.params.mieColor.setRGB(mc.r, mc.g, mc.b);
        }

        // Fog
        {
            const fg = groups[1].weatherPropertyList;
            this.params.globalFogDistance = fg[0].floatOutput;
            this.params.globalFogSmooth = fg[1].floatOutput;
            this.params.globalFogDensity = fg[2].floatOutput;
            this.params.heightFogDistance = fg[3].floatOutput;
            this.params.heightFogSmooth = fg[4].floatOutput;
            this.params.heightFogDensity = fg[5].floatOutput;
            this.params.fogBluishDistance = fg[6].floatOutput;
            this.params.fogBluishIntensity = fg[7].floatOutput;
            this.params.heightFogScatterMultiplier = fg[8].floatOutput;
            this.params.mieDistance = fg[9].floatOutput;
        }

        // Directional Light
        {
            const lg = groups[2].weatherPropertyList;
            this.directionalLight.intensity = lg[0].floatOutput;
            const lc = lg[1]?.colorOutput ?? { r: this.directionalLight.color.r, g: this.directionalLight.color.g, b: this.directionalLight.color.b };
            this.directionalLight.color.setRGB(lc.r, lc.g, lc.b);
        }

        this.updateAllUniforms();
    }

  // ---- 事件处理 ----
  private handleResize = () => {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.composer.setSize(window.innerWidth, window.innerHeight);
    this.depthRenderTarget.setSize(window.innerWidth, window.innerHeight);
  };
}