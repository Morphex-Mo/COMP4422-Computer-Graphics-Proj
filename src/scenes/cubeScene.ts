/**
 * Cube Scene - 简单场景展示天空盒、雾效和Standard Shader立方体
 */
import * as THREE from 'three';
import { defineScene } from '../core';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';

let cleanupFunction: (() => void) | null = null;
let animationFrameId: number | null = null;
const customMaterials: THREE.ShaderMaterial[] = [];
export const cubeScene = defineScene({
    id: 'cubeScene',
    name: 'Cube Scene (Skybox + Fog + Standard Shader)',
    resources: {
        shaders: {
            vertex: './assets/shaders/standard.vert.glsl',
            fragment: './assets/shaders/standard.frag.glsl',
            depthVertex: './assets/shaders/depth_display.vert.glsl',
            depthFragment: './assets/shaders/depth_display.frag.glsl',
            atmoVertex: './assets/shaders/atmospheric_scattering.vert.glsl', // 新增：大气散射顶点着色器
            atmoFragment: './assets/shaders/atmospheric_scattering.frag.glsl' // 新增：大气散射片段着色器
        }
    },
    onLoadProgress: (loaded, total, percentage) => {
        console.log(`[Cube Scene] Loading progress: ${percentage}% (${loaded}/${total})`);
    },
    main: async (resources) => {
        const depthVertexShader = resources.get('depthVertex') as string;
        const depthFragmentShader = resources.get('depthFragment') as string;
        const atmoVertexShader = resources.get('atmoVertex') as string; // 大气散射顶点
        const atmoFragmentShader = resources.get('atmoFragment') as string; // 大气散射片段
        const vertexShader = resources.get('vertex') as string; // 标准立方体顶点着色器
        const fragmentShader = resources.get('fragment') as string; // 标准立方体片段着色器
        console.log('[Cube Scene] All resources loaded!');
        console.log('[Cube Scene] Starting scene...');
        // ===================== 大气散射天空盒 =====================
        // 物理参数可互动调整
        const skyParams = {
            sunPosition: new THREE.Vector3(0, 0.05, -1), // 初始太阳位置
            rayleigh: 2.0,
            turbidity: 10.0,
            mieCoefficient: 0.005,
            mieDirectionalG: 0.8,
            luminance: 1.0,
            rayleighColor: new THREE.Color(0.5, 0.7, 1.0), // Rayleigh 散射颜色（蓝色调）
            mieColor: new THREE.Color(1.0, 0.9, 0.8)       // Mie 散射颜色（暖色调）
        };

        const scene = new THREE.Scene();

        const skyboxGeometry = new THREE.SphereGeometry(500, 32, 32);
        const skyboxMaterial = new THREE.ShaderMaterial({
            uniforms: {
                sunPosition: { value: skyParams.sunPosition.clone() },
                rayleigh: { value: skyParams.rayleigh },
                turbidity: { value: skyParams.turbidity },
                mieCoefficient: { value: skyParams.mieCoefficient },
                mieDirectionalG: { value: skyParams.mieDirectionalG },
                custom_luminance: { value: skyParams.luminance },
                rayleighColor: { value: skyParams.rayleighColor.clone() },
                mieColor: { value: skyParams.mieColor.clone() }
            },
            vertexShader: atmoVertexShader,
            fragmentShader: atmoFragmentShader,
            side: THREE.BackSide,
            depthWrite: false
        });
        const skybox = new THREE.Mesh(skyboxGeometry, skyboxMaterial);
        scene.add(skybox);
        console.log('[Cube Scene] Using atmospheric scattering skybox (Rayleigh + Mie)');

        // ===================== 雾效 =====================
        //scene.fog = new THREE.Fog(0xffd7a8, 5, 25);

        const camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        camera.position.set(8, 5, 8);
        camera.lookAt(0, 0, 0);

        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.BasicShadowMap;

        const appElement = document.getElementById('app');
        if (appElement) {
            appElement.innerHTML = '';
            appElement.appendChild(renderer.domElement);
        }

        // 创建深度纹理渲染目标
        const renderTarget = new THREE.WebGLRenderTarget(
            window.innerWidth,
            window.innerHeight,
            {
                minFilter: THREE.LinearFilter,
                magFilter: THREE.LinearFilter,
                format: THREE.RGBAFormat,
                stencilBuffer: false
            }
        );
        renderTarget.depthTexture = new THREE.DepthTexture(
            window.innerWidth,
            window.innerHeight
        );
        renderTarget.depthTexture.format = THREE.DepthFormat;
        renderTarget.depthTexture.type = THREE.UnsignedIntType;

        // 创建后处理 Composer
        const composer = new EffectComposer(renderer, renderTarget);

        // 添加普通渲染 Pass
        const renderPass = new RenderPass(scene, camera);
        composer.addPass(renderPass);

        // 创建深度显示 Shader
        const depthDisplayShader = {
            uniforms: {
                tDiffuse: { value: null },
                tDepth: { value: null },
                cameraNear: { value: camera.near },
                cameraFar: { value: camera.far },
                showDepth: { value: false },
                depthRange: { value: 20.0 } // 深度可视化范围
            },
            vertexShader: depthVertexShader,
            fragmentShader: depthFragmentShader
        };

        // 添加深度显示 Pass
        const depthPass = new ShaderPass(depthDisplayShader);
        depthPass.uniforms['tDepth'].value = renderTarget.depthTexture;
        depthPass.renderToScreen = true;
        composer.addPass(depthPass);

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.target.set(0, 0, 0);
        controls.update();

        // 环境光
        const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
        scene.add(ambientLight);

        // 方向光（初始位置与太阳位置同步）
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.9);
        // 初始方向光位置根据sunPosition设置（反向，因为光从太阳照向场景）
        const initialLightPos = skyParams.sunPosition.clone().normalize().multiplyScalar(-20);
        directionalLight.position.copy(initialLightPos);
        directionalLight.castShadow = true;
        directionalLight.shadow.camera.left = -30;
        directionalLight.shadow.camera.right = 30;
        directionalLight.shadow.camera.top = 30;
        directionalLight.shadow.camera.bottom = -30;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.mapSize.set(2048, 2048);
        directionalLight.shadow.bias = 0;
        scene.add(directionalLight);

        // 创建Standard Shader材质的函数
        const createStandardCubeMaterial = (color: THREE.Color): THREE.ShaderMaterial => {
            const uniforms = THREE.UniformsUtils.merge([
                THREE.UniformsLib.common,
                THREE.UniformsLib.lights,
                THREE.UniformsLib.fog,
                {
                    uColor: { value: color },
                    uLightDirection: { value: new THREE.Vector3(0, 0, 0) },
                    uLightColor: { value: new THREE.Color(0xffffff) },
                    uShadowThreshold: { value: 0.3 },
                    uShadowSmoothness: { value: 0.4 },
                    uSpecularThreshold: { value: 0.7 },
                    uSpecularSmoothness: { value: 0.1 },
                    uSpecularPower: { value: 16.0 },
                    uSpecularIntensity: { value: 0.3 },
                    uDiffuseStrength: { value: 0.9 },
                    uShadowIntensity: { value: 0.4 },
                    uAmbientStrength: { value: 0.35 },
                    uRimThreshold: { value: 0.5 },
                    uRimAmount: { value: 0.6 },
                    uRimColor: { value: new THREE.Color(0x6699cc) },
                    uTexture: { value: null },
                    uUseTexture: { value: false }
                }
            ]);

            return new THREE.ShaderMaterial({
                uniforms: uniforms,
                vertexShader: vertexShader,
                fragmentShader: fragmentShader,
                lights: true,
                fog: true,
            });
        };

        // 创建不同距离和颜色的立方体
        const cubeGeometry = new THREE.BoxGeometry(1, 1, 1);

        // 定义立方体配置：位置、颜色、大小
        const cubeConfigs = [
            // 近处的立方体
            { position: new THREE.Vector3(-2, 0.5, 2), color: 0xff6b6b, scale: 1 },
            { position: new THREE.Vector3(2, 0.5, 2), color: 0x4ecdc4, scale: 1 },
            { position: new THREE.Vector3(0, 0.5, 0), color: 0xffe66d, scale: 1.2 },

            // 中距离的立方体
            { position: new THREE.Vector3(-4, 0.75, -3), color: 0x95e1d3, scale: 1.5 },
            { position: new THREE.Vector3(4, 0.75, -3), color: 0xf38181, scale: 1.5 },
            { position: new THREE.Vector3(0, 1, -5), color: 0xaa96da, scale: 2 },

            // 远处的立方体
            { position: new THREE.Vector3(-6, 1, -8), color: 0xfcbad3, scale: 2 },
            { position: new THREE.Vector3(6, 1, -8), color: 0xa8e6cf, scale: 2 },
            { position: new THREE.Vector3(0, 1.5, -12), color: 0xffd3b6, scale: 3 },

            // 更远的立方体（用于测试雾效）
            { position: new THREE.Vector3(-3, 1, -15), color: 0xffaaa5, scale: 2.5 },
            { position: new THREE.Vector3(3, 1, -15), color: 0xff8b94, scale: 2.5 },
        ];

        cubeConfigs.forEach((config, index) => {
            const material = createStandardCubeMaterial(new THREE.Color(config.color));
            const cube = new THREE.Mesh(cubeGeometry, material);

            cube.position.copy(config.position);
            cube.scale.setScalar(config.scale);
            cube.castShadow = true;
            cube.receiveShadow = false;

            scene.add(cube);
            customMaterials.push(material);

            console.log(`[Cube Scene] Added cube ${index + 1} at distance ${config.position.length().toFixed(2)}`);
        });

        // 添加一个使用默认材质的立方体作为对比
        const defaultMaterial = new THREE.MeshStandardMaterial({
            color: 0xff9500,
            roughness: 0.5,
            metalness: 0.2
        });
        const defaultCube = new THREE.Mesh(cubeGeometry, defaultMaterial);
        defaultCube.position.set(-2, 0.5, -2);
        defaultCube.scale.setScalar(1);
        defaultCube.castShadow = true;
        defaultCube.receiveShadow = true;
        scene.add(defaultCube);
        console.log('[Cube Scene] Added default material cube at (-2, 0.5, -2) for comparison');

        // 地面
        const groundGeometry = new THREE.PlaneGeometry(50, 50);
        const groundMaterial = new THREE.MeshStandardMaterial({
            color: 0x8bc34a,
            roughness: 0.8,
            metalness: 0.2
        });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        scene.add(ground);

        // 网格辅助线
        const gridHelper = new THREE.GridHelper(50, 50, 0x666666, 0x888888);
        scene.add(gridHelper);

        // 坐标轴辅助线
        const axesHelper = new THREE.AxesHelper(5);
        scene.add(axesHelper);

        // ===================== 键盘交互：深度/太阳/散射参数 =====================
        let showDepth = false; // 深度图显示开关（迁移位置以与交互逻辑整合）

        const updateSkyUniforms = () => {
            skyboxMaterial.uniforms.sunPosition.value.copy(skyParams.sunPosition);
            skyboxMaterial.uniforms.rayleigh.value = skyParams.rayleigh;
            skyboxMaterial.uniforms.turbidity.value = skyParams.turbidity;
            skyboxMaterial.uniforms.mieCoefficient.value = skyParams.mieCoefficient;
            skyboxMaterial.uniforms.mieDirectionalG.value = skyParams.mieDirectionalG;
            skyboxMaterial.uniforms.custom_luminance.value = skyParams.luminance;
            skyboxMaterial.uniforms.rayleighColor.value.copy(skyParams.rayleighColor);
            skyboxMaterial.uniforms.mieColor.value.copy(skyParams.mieColor);

            // 同步方向光位置（光从太阳位置照向场景中心，因此取反向）
            const lightPos = skyParams.sunPosition.clone().multiplyScalar(20).normalize();
            directionalLight.position.copy(lightPos);
        };

        const handleKeyDown = (event: KeyboardEvent) => {
            const key = event.key.toLowerCase();
            console.log("keydown:", key);
            let changed = false;
            switch (key) {
                case 'd':
                case 'D':
                    showDepth = !showDepth;
                    depthPass.uniforms['showDepth'].value = showDepth;
                    console.log(`[Cube Scene] Depth display: ${showDepth ? 'ON' : 'OFF'}`);
                    break;
                case 'arrowup': // 提升太阳高度
                    skyParams.sunPosition.y = Math.min(skyParams.sunPosition.y + 0.05, 1.0);
                    changed = true;
                    console.log('[Cube Scene] Sun height ↑', skyParams.sunPosition.y.toFixed(2));
                    break;
                case 'arrowdown': // 降低太阳高度
                    skyParams.sunPosition.y = Math.max(skyParams.sunPosition.y - 0.05, -0.2);
                    changed = true;
                    console.log('[Cube Scene] Sun height ↓', skyParams.sunPosition.y.toFixed(2));
                    break;
                case 'arrowleft': // 绕Y轴逆时针旋转太阳方向
                    {
                        const angle = 0.05;
                        const cos = Math.cos(angle);
                        const sin = Math.sin(angle);
                        const x = skyParams.sunPosition.x;
                        const z = skyParams.sunPosition.z;
                        skyParams.sunPosition.x = cos * x - sin * z;
                        skyParams.sunPosition.z = sin * x + cos * z;
                        changed = true;
                        console.log('[Cube Scene] Sun azimuth ←', skyParams.sunPosition.x.toFixed(2), skyParams.sunPosition.z.toFixed(2));
                    }
                    break;
                case 'arrowright': // 绕Y轴顺时针旋转太阳方向
                    {
                        const angle = -0.05;
                        const cos = Math.cos(angle);
                        const sin = Math.sin(angle);
                        const x = skyParams.sunPosition.x;
                        const z = skyParams.sunPosition.z;
                        skyParams.sunPosition.x = cos * x - sin * z;
                        skyParams.sunPosition.z = sin * x + cos * z;
                        changed = true;
                        console.log('[Cube Scene] Sun azimuth →', skyParams.sunPosition.x.toFixed(2), skyParams.sunPosition.z.toFixed(2));
                    }
                    break;
                default:
                    break;
            }
            switch (key) {
                case 't': // 增加浑浊度
                    skyParams.turbidity = Math.min(skyParams.turbidity + 1.0, 25.0);
                    changed = true;
                    console.log('[Cube Scene] Turbidity +', skyParams.turbidity);
                    break;
                case 'g': // 减少浑浊度
                    skyParams.turbidity = Math.max(skyParams.turbidity - 1.0, 1.0);
                    changed = true;
                    console.log('[Cube Scene] Turbidity -', skyParams.turbidity);
                    break;
                case 'r': // 增加 Rayleigh
                    skyParams.rayleigh = Math.min(skyParams.rayleigh + 0.2, 4.0);
                    changed = true;
                    console.log('[Cube Scene] Rayleigh +', skyParams.rayleigh.toFixed(2));
                    break;
                case 'f': // 减少 Rayleigh
                    skyParams.rayleigh = Math.max(skyParams.rayleigh - 0.2, 0.2);
                    changed = true;
                    console.log('[Cube Scene] Rayleigh -', skyParams.rayleigh.toFixed(2));
                    break;
                case 'y': // 增加 Rayleigh 蓝色分量
                    skyParams.rayleighColor.b = Math.min(skyParams.rayleighColor.b + 0.1, 1.0);
                    changed = true;
                    console.log('[Cube Scene] Rayleigh Blue +', skyParams.rayleighColor.b.toFixed(2));
                    break;
                case 'h': // 减少 Rayleigh 蓝色分量
                    skyParams.rayleighColor.b = Math.max(skyParams.rayleighColor.b - 0.1, 0.0);
                    changed = true;
                    console.log('[Cube Scene] Rayleigh Blue -', skyParams.rayleighColor.b.toFixed(2));
                    break;
                case 'u': // 增加 Mie 红色分量（暖色调）
                    skyParams.mieColor.r = Math.min(skyParams.mieColor.r + 0.1, 1.0);
                    changed = true;
                    console.log('[Cube Scene] Mie Red +', skyParams.mieColor.r.toFixed(2));
                    break;
                case 'j': // 减少 Mie 红色分量
                    skyParams.mieColor.r = Math.max(skyParams.mieColor.r - 0.1, 0.0);
                    changed = true;
                    console.log('[Cube Scene] Mie Red -', skyParams.mieColor.r.toFixed(2));
                    break;
                case 'i': // 增加 Mie 整体亮度
                    skyParams.mieColor.r = Math.min(skyParams.mieColor.r + 0.1, 1.0);
                    skyParams.mieColor.g = Math.min(skyParams.mieColor.g + 0.1, 1.0);
                    skyParams.mieColor.b = Math.min(skyParams.mieColor.b + 0.1, 1.0);
                    changed = true;
                    console.log('[Cube Scene] Mie Brightness +',
                        `R:${skyParams.mieColor.r.toFixed(2)} G:${skyParams.mieColor.g.toFixed(2)} B:${skyParams.mieColor.b.toFixed(2)}`);
                    break;
                case 'k': // 减少 Mie 整体亮度
                    skyParams.mieColor.r = Math.max(skyParams.mieColor.r - 0.1, 0.0);
                    skyParams.mieColor.g = Math.max(skyParams.mieColor.g - 0.1, 0.0);
                    skyParams.mieColor.b = Math.max(skyParams.mieColor.b - 0.1, 0.0);
                    changed = true;
                    console.log('[Cube Scene] Mie Brightness -',
                        `R:${skyParams.mieColor.r.toFixed(2)} G:${skyParams.mieColor.g.toFixed(2)} B:${skyParams.mieColor.b.toFixed(2)}`);
                    break;
                default:
                    break;
            }
            if (changed) {
                updateSkyUniforms();
            }
        };
        window.addEventListener('keydown', handleKeyDown);

        const handleResize = () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
            composer.setSize(window.innerWidth, window.innerHeight);
            renderTarget.setSize(window.innerWidth, window.innerHeight);
        };
        window.addEventListener('resize', handleResize);

        // 渲染循环
        const animate = () => {
            animationFrameId = requestAnimationFrame(animate);


            // 更新所有材质的光照信息
            customMaterials.forEach(material => {
                if (material.uniforms.uLightDirection) {
                    const worldLightDir = new THREE.Vector3().subVectors(
                        new THREE.Vector3(0, 0, 0),
                        directionalLight.position
                    ).normalize();

                    const viewLightDir = worldLightDir.clone().transformDirection(camera.matrixWorldInverse);
                    material.uniforms.uLightColor.value.copy(directionalLight.color);
                    material.uniforms.uLightDirection.value.copy(viewLightDir);
                }
            });

            controls.update();
            composer.render();
        };
        animate();

        console.log('[Cube Scene] ✨ Scene setup complete!');
        console.log(`[Cube Scene] Total cubes: ${cubeConfigs.length}`);
        console.log('[Cube Scene] Fog range: 5 to 25 units');

        cleanupFunction = () => {
            console.log('[Cube Scene] Cleaning up resources...');

            if (animationFrameId !== null) {
                cancelAnimationFrame(animationFrameId);
                animationFrameId = null;
            }

            window.removeEventListener('resize', handleResize);
            window.removeEventListener('keydown', handleKeyDown);

            customMaterials.forEach(material => {
                material.dispose();
            });
            customMaterials.length = 0;

            controls.dispose();
            renderer.dispose();
            composer.dispose();
            renderTarget.dispose();
            if (renderTarget.depthTexture) {
                renderTarget.depthTexture.dispose();
            }
            groundMaterial.dispose();
            skyboxMaterial.dispose();
            cubeGeometry.dispose();
            defaultMaterial.dispose();

            scene.traverse((object: any) => {
                if (object.geometry) {
                    object.geometry.dispose();
                }
                if (object.material) {
                    if (Array.isArray(object.material)) {
                        object.material.forEach((material: any) => material.dispose());
                    } else {
                        object.material.dispose();
                    }
                }
            });

            while (scene.children.length > 0) {
                scene.remove(scene.children[0]);
            }

            if (appElement) {
                appElement.innerHTML = '';
            }

            console.log('[Cube Scene] Cleanup complete!');
        };
    },
    onExit: async () => {
        console.log('[Cube Scene] Exiting scene...');
        if (cleanupFunction) {
            cleanupFunction();
            cleanupFunction = null;
        }
    }
});

export function startCubeScene() {
    console.log('Starting Cube Scene...');
    return cubeScene();
}
