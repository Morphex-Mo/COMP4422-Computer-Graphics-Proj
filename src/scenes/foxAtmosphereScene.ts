/**
 * Fox Atmosphere Scene - 结合AtmosphereController天空系统和Fox模型
 * 特性：
 * - Azure Sky动态天空和雾效系统
 * - Fox GLTF模型加载
 * - 日式动漫风格Toon Shader
 * - 骨骼动画支持
 * - 时间系统驱动的星空和光照变化
 */
import * as THREE from "three";
import {defineScene} from "../core";
import {AtmosphereController} from "../utils/atmosphere/AtmosphereController";
import {AzureManager} from "../utils/manager";
import {buildingPresets} from "../utils/presets/myPresets";

let controller: AtmosphereController | null = null;
let azureManager: AzureManager | null = null;
let animationId: number | null = null;
let mixer: THREE.AnimationMixer | null = null;
let clock: THREE.Clock | null = null;
const customMaterials: THREE.ShaderMaterial[] = [];

/**
 * 创建动漫风格材质
 */
function createAnimeToonMaterial(
    originalMaterial: THREE.Material,
    mesh: THREE.SkinnedMesh | THREE.Mesh,
    vertexShader: string,
    fragmentShader: string
): THREE.ShaderMaterial {
    const material = originalMaterial as any;

    const color = material.color || new THREE.Color(0xffffff);
    const map = material.map || null;

    const uniforms = THREE.UniformsUtils.merge([
        THREE.UniformsLib.common,
        THREE.UniformsLib.lights,
        THREE.UniformsLib.fog,
        {
            uColor: {value: color},
            uLightDirection: {value: new THREE.Vector3(0, 0, 0)},
            uLightColor: {value: new THREE.Color(0xffffff)},

            // 优化后的参数
            uShadowThreshold: {value: 0.3},
            uShadowSmoothness: {value: 0.4},
            uSpecularThreshold: {value: 0.7},
            uSpecularSmoothness: {value: 0.1},
            uSpecularPower: {value: 16.0},
            uSpecularIntensity: {value: 0.3},
            uDiffuseStrength: {value: 0.9},
            uShadowIntensity: {value: 0.4},
            uAmbientStrength: {value: 0.35},

            // 边缘光参数
            uRimThreshold: {value: 0.5},
            uRimAmount: {value: 0.6},
            uRimColor: {value: new THREE.Color(0x6699cc)},

            uTexture: {value: map},
            uUseTexture: {value: map !== null},
        },
    ]);

    const shaderMaterial = new THREE.ShaderMaterial({
        uniforms: uniforms,
        vertexShader: vertexShader,
        fragmentShader: fragmentShader,
        lights: true,
        fog: true,
        side: material.side || THREE.FrontSide,
        transparent: material.transparent || false,
    });

    return shaderMaterial;
}

function createGradientMap(): THREE.DataTexture {
    const colors = new Uint8Array([
        70, 70, 70,
        100, 100, 100,
        150, 150, 150,
        255, 255, 255,
    ]);

    const gradientMap = new THREE.DataTexture(colors, 4, 1, THREE.RGBFormat);
    gradientMap.needsUpdate = true;

    return gradientMap;
}

export const foxAtmosphereScene = defineScene({
    id: "foxAtmosphereScene",
    name: "Fox + Atmosphere (Fogness Sky)",
    resources: {
        gltfModels: {
            fox: "./assets/fox/scene.gltf",
        },
        shaders: {
            atmoVertex: "./assets/shaders/atmospheric_scattering.vert.glsl",
            atmoFragment: "./assets/shaders/atmospheric_scattering.frag.glsl",
            fogVertex: "./assets/shaders/fog_scattering.vert.glsl",
            fogFragment: "./assets/shaders/fog_scattering.frag.glsl",
            depthVertex: "./assets/shaders/depth_display.vert.glsl",
            depthFragment: "./assets/shaders/depth_display.frag.glsl",
            standardVertex: "./assets/shaders/standard.vert.glsl",
            standardFragment: "./assets/shaders/standard.frag.glsl",
            foxToonVertex: "./assets/shaders/fox_toon.vert.glsl",
            foxToonFragment: "./assets/shaders/fox_toon.frag.glsl",
        },
    },
    onLoadProgress: (loaded, total, percentage) => {
        console.log(`[Fox Atmosphere] Loading: ${percentage}% (${loaded}/${total})`);
    },
    main: async (resources) => {
        console.log("[Fox Atmosphere] Starting scene...");

        const atmoVertex = resources.get("atmoVertex") as string;
        const atmoFragment = resources.get("atmoFragment") as string;
        const fogVertex = resources.get("fogVertex") as string;
        const fogFragment = resources.get("fogFragment") as string;
        const depthVertex = resources.get("depthVertex") as string;
        const depthFragment = resources.get("depthFragment") as string;
        const standardVertex = resources.get("standardVertex") as string;
        const standardFragment = resources.get("standardFragment") as string;
        const foxToonVertex = resources.get("foxToonVertex") as string;
        const foxToonFragment = resources.get("foxToonFragment") as string;
        const foxGltf = resources.get("fox");

        // 初始化AtmosphereController
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
        controller.directionalLight.shadow.bias=-0.005;
        controller.initialize();

        // 加载Fox模型
        if (foxGltf && foxGltf.scene) {
            const fox = foxGltf.scene;
            fox.position.set(0, 0, 0);
            fox.scale.set(1, 1, 1);
            fox.rotation.set(0, -Math.PI / 2, 0);

            fox.traverse((child: any) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;

                    const toonMaterial = createAnimeToonMaterial(
                        child.material,
                        child,
                        foxToonVertex,
                        foxToonFragment
                    );
                    child.material = toonMaterial;
                    customMaterials.push(toonMaterial);

                    console.log("[Fox Atmosphere] Applied Toon Shader to:", child.name);
                }
            });

            controller.scene.add(fox);
            console.log("[Fox Atmosphere] Fox model added to scene");

            // 设置动画
            if (foxGltf.animations && foxGltf.animations.length > 0) {
                mixer = new THREE.AnimationMixer(fox);
                foxGltf.animations.forEach((clip, index) => {
                    const action = mixer!.clipAction(clip);
                    if (index === 0) {
                        action.play();
                        console.log(`[Fox Atmosphere] Playing animation: ${clip.name}`);
                    }
                });
                clock = new THREE.Clock();
            }

            // 添加手部球体
            const leftHandBone = fox.getObjectByName("LeftHand") || fox.getObjectByName("mixamorigLeftHand");
            const rightHandBone = fox.getObjectByName("RightHand") || fox.getObjectByName("mixamorigRightHand");

            const sphereGeometry = new THREE.SphereGeometry(0.15, 32, 32);

            const sphereToonMaterial = new THREE.ShaderMaterial({
                uniforms: THREE.UniformsUtils.clone({
                    ...THREE.UniformsLib.common,
                    ...THREE.UniformsLib.lights,
                    ...THREE.UniformsLib.fog,
                    uColor: {value: new THREE.Color(0xee8e69)},
                    uLightDirection: {value: new THREE.Vector3(0, 0, 0)},
                    uLightColor: {value: new THREE.Color(0xffffff)},
                    uShadowThreshold: {value: 0.3},
                    uShadowSmoothness: {value: 0.4},
                    uSpecularThreshold: {value: 0.7},
                    uSpecularSmoothness: {value: 0.1},
                    uSpecularPower: {value: 16.0},
                    uSpecularIntensity: {value: 0.2},
                    uDiffuseStrength: {value: 0.9},
                    uShadowIntensity: {value: 0.4},
                    uAmbientStrength: {value: 0.35},
                    uRimThreshold: {value: 0.5},
                    uRimAmount: {value: 0.6},
                    uRimColor: {value: new THREE.Color(0x6699cc)},
                    uTexture: {value: null},
                    uUseTexture: {value: false},
                }),
                vertexShader: foxToonVertex,
                fragmentShader: foxToonFragment,
                lights: true,
                fog: true,
            });

            const leftSphere = new THREE.Mesh(sphereGeometry, sphereToonMaterial);
            const rightSphere = new THREE.Mesh(sphereGeometry, sphereToonMaterial);

            leftSphere.castShadow = true;
            rightSphere.castShadow = true;

            customMaterials.push(sphereToonMaterial);

            if (leftHandBone) {
                leftHandBone.add(leftSphere);
            } else {
                leftSphere.position.set(-1, 2, 0);
                controller.scene.add(leftSphere);
            }

            if (rightHandBone) {
                rightHandBone.add(rightSphere);
            } else {
                rightSphere.position.set(1, 2, 0);
                controller.scene.add(rightSphere);
            }
        } else {
            console.error("[Fox Atmosphere] Failed to load fox model");
        }

        // 添加地面
        const groundGeom = new THREE.PlaneGeometry(50, 50);
        const groundMat = new THREE.MeshToonMaterial({
            color: 0x8bc34a,
            gradientMap: createGradientMap(),
        });
        const ground = new THREE.Mesh(groundGeom, groundMat);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        controller.scene.add(ground);

        // 添加帮助线
        controller.scene.add(new THREE.AxesHelper(5));

        // 挂载Azure天气系统
        azureManager = new AzureManager();
        azureManager.buildDefaultSchema();
        controller.attachAzureManager(azureManager);
        buildingPresets(azureManager);

        // 设置为Fogness预设
        azureManager.weather.currentWeatherPreset = azureManager.weather.globalWeatherList[1].preset!;

        // 设置时间循环（1分钟一个昼夜，方便观察星空变化）
        azureManager.time.updateConfig({dayLength: 1.0, dawnTime: 6.0, duskTime: 18.0});
        azureManager.time.setTime(0); // 从午夜开始，可以看到星空

        console.log("[Fox Atmosphere] Azure Manager initialized with Fogness preset");
        console.log("[Fox Atmosphere] Time system started (1 min/day)");

        // 渲染循环
        const loop = () => {
            animationId = requestAnimationFrame(loop);

            // 更新动画
            if (mixer && clock) {
                const delta = clock.getDelta();
                mixer.update(delta);
            }

            // 更新Toon材质的光照方向
            if (controller && controller.directionalLight) {
                const worldLightDir = new THREE.Vector3()
                    .subVectors(new THREE.Vector3(0, 0, 0), controller.directionalLight.position)
                    .normalize();
                const viewLightDir = worldLightDir
                    .clone()
                    .transformDirection(controller.camera.matrixWorldInverse);

                customMaterials.forEach((mat) => {
                    if (mat.uniforms.uLightDirection) {
                        mat.uniforms.uLightDirection.value.copy(viewLightDir);
                        mat.uniforms.uLightColor.value.copy(controller!.directionalLight.color);
                    }
                });
            }

            controller?.update();
        };
        loop();

        console.log("[Fox Atmosphere] Scene setup complete!");
        console.log("  ✓ Fogness sky with dynamic stars");
        console.log("  ✓ Fox model with Toon Shader");
        console.log("  ✓ Time-driven lighting (watch the stars appear at night!)");
    },
    onExit: async () => {
        console.log("[Fox Atmosphere] Cleaning up...");

        if (animationId) {
            cancelAnimationFrame(animationId);
            animationId = null;
        }

        customMaterials.forEach((material) => {
            material.dispose();
        });
        customMaterials.length = 0;

        mixer = null;
        clock = null;

        controller?.dispose();
        controller = null;
        azureManager = null;

        console.log("[Fox Atmosphere] Cleanup complete!");
    },
});

export function startFoxAtmosphereScene() {
    console.log("Starting Fox Atmosphere Scene...");
    return foxAtmosphereScene();
}

