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
            atmoVertex: './assets/shaders/atmospheric_scattering.vert.glsl',
            atmoFragment: './assets/shaders/atmospheric_scattering.frag.glsl',
            fogVertex: './assets/shaders/fog_scattering.vert.glsl',
            fogFragment: './assets/shaders/fog_scattering.frag.glsl'
        }
    },
    onLoadProgress: (loaded, total, percentage) => {
        console.log(`[Cube Scene] Loading progress: ${percentage}% (${loaded}/${total})`);
    },
    main: async (resources) => {
        const depthVertexShader = resources.get('depthVertex') as string;
        const depthFragmentShader = resources.get('depthFragment') as string;
        const atmoVertexShader = resources.get('atmoVertex') as string;
        const atmoFragmentShader = resources.get('atmoFragment') as string;
        const fogVertexShader = resources.get('fogVertex') as string;
        const fogFragmentShader = resources.get('fogFragment') as string;
        const vertexShader = resources.get('vertex') as string;
        const fragmentShader = resources.get('fragment') as string;
        console.log('[Cube Scene] All resources loaded!');
        console.log('[Cube Scene] Starting scene...');
        // ===================== 大气散射天空盒 =====================
        // 物理参数可互动调整 (基于 Azure Sky 的物理模型)
        const skyParams = {
            sunPosition: new THREE.Vector3(0, 0.05, -1), // 初始太阳位置
            // Azure Sky 使用 Kr 和 Km 作为高度（米），而不是系数
            kr: 8400.0,  // Rayleigh 散射高度（米）
            km: 1200.0,  // Mie 散射高度（米）
            // 波长参数（用于计算 Rayleigh 和 Mie）
            wavelength: new THREE.Vector3(680.0, 550.0, 450.0), // nm
            molecularDensity: 2.545, // 分子密度系数
            rayleigh: 1.5,  // Rayleigh 散射倍数
            mie: 1.0,       // Mie 散射倍数
            mieDirectionalG: 0.75, // Mie 方向性因子
            scattering: 15.0,  // 散射强度倍数（Azure 默认）
            luminance: 0.1,    // 天空亮度（无太阳/月亮时）
            exposure: 2.0,     // 曝光值
            rayleighColor: new THREE.Color(1.0, 1.0, 1.0), // Rayleigh 散射颜色
            mieColor: new THREE.Color(1.0, 1.0, 1.0),      // Mie 散射颜色
            // 雾气参数（Azure Sky 尺度）
            globalFogDistance: 1000.0,  // Azure 默认全局雾气距离
            globalFogSmooth: 0.25,      // Azure 默认平滑过渡
            globalFogDensity: 1.0,      // 全局雾气密度
            heightFogDistance: 100.0,   // 高度雾气距离
            heightFogSmooth: 1.0,       // 高度雾气平滑
            heightFogDensity: 0.0,      // 高度雾气密度
            heightFogStart: 0.0,        // 高度雾气起始高度
            heightFogEnd: 100.0,        // 高度雾气结束高度
            fogBluishDistance: 12288.0, // Azure 默认雾气蓝色距离
            fogBluishIntensity: 0.15,   // Azure 默认雾气蓝色强度
            heightFogScatterMultiplier: 0.5, // 高度雾气散射倍数
            mieDistance: 1.0            // Mie 距离控制
        };

        const scene = new THREE.Scene();

        // Azure Sky 风格的 Rayleigh 系数计算
        const computeRayleigh = (): THREE.Vector3 => {
            const lambda = skyParams.wavelength.clone().multiplyScalar(1e-9); // 转换为米
            const n = 1.0003; // 空气折射率
            const pn = 0.035; // 标准空气去极化因子
            const n2 = n * n;
            const N = skyParams.molecularDensity * 1e25;
            const temp = (8.0 * Math.PI * Math.PI * Math.PI * ((n2 - 1.0) * (n2 - 1.0))) /
                         (3.0 * N) * ((6.0 + 3.0 * pn) / (6.0 - 7.0 * pn));

            return new THREE.Vector3(
                temp / Math.pow(lambda.x, 4.0),
                temp / Math.pow(lambda.y, 4.0),
                temp / Math.pow(lambda.z, 4.0)
            ).multiplyScalar(skyParams.rayleigh);
        };

        // Azure Sky 风格的 Mie 系数计算
        const computeMie = (): THREE.Vector3 => {
            const k = new THREE.Vector3(686.0, 678.0, 682.0);
            const c = (0.6544 * 5.0 - 0.6510) * 10.0 * 1e-9;

            return new THREE.Vector3(
                434.0 * c * Math.PI * Math.pow((4.0 * Math.PI) / skyParams.wavelength.x, 2.0) * k.x,
                434.0 * c * Math.PI * Math.pow((4.0 * Math.PI) / skyParams.wavelength.y, 2.0) * k.y,
                434.0 * c * Math.PI * Math.pow((4.0 * Math.PI) / skyParams.wavelength.z, 2.0) * k.z
            ).multiplyScalar(skyParams.mie);
        };

        // Azure Sky 风格的 Mie G 参数计算
        const computeMieG = (): THREE.Vector3 => {
            const g = skyParams.mieDirectionalG;
            return new THREE.Vector3(
                1.0 - g * g,
                1.0 + g * g,
                2.0 * g
            );
        };

        const skyboxGeometry = new THREE.SphereGeometry(500, 32, 32);
        const skyboxMaterial = new THREE.ShaderMaterial({
            uniforms: {
                sunPosition: { value: skyParams.sunPosition.clone() },
                kr: { value: skyParams.kr },
                km: { value: skyParams.km },
                rayleighCoef: { value: computeRayleigh() },
                mieCoef: { value: computeMie() },
                mieG: { value: computeMieG() },
                scattering: { value: skyParams.scattering },
                custom_luminance: { value: skyParams.luminance },
                exposure: { value: skyParams.exposure },
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

        // 创建独立的深度渲染目标（只用于采样，不参与后处理的写入，避免反馈循环）
        const depthRenderTarget = new THREE.WebGLRenderTarget(
            window.innerWidth,
            window.innerHeight,
            {
                minFilter: THREE.NearestFilter,
                magFilter: THREE.NearestFilter,
                format: THREE.RGBAFormat,
                stencilBuffer: false,
                depthBuffer: true
            }
        );
        depthRenderTarget.depthTexture = new THREE.DepthTexture(
            window.innerWidth,
            window.innerHeight
        );
        depthRenderTarget.depthTexture.format = THREE.DepthFormat;
        depthRenderTarget.depthTexture.type = THREE.UnsignedInt248Type;

        // 创建后处理 Composer（使用内部的 ping-pong 目标，不与深度RT共享）
        const composer = new EffectComposer(renderer);

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

        // 添加深度显示 Pass（读取独立的深度纹理）
        const depthPass = new ShaderPass(depthDisplayShader);
        depthPass.uniforms['tDepth'].value = depthRenderTarget.depthTexture;
        depthPass.renderToScreen = false; // 不直接渲染到屏幕，让雾气Pass处理
        //composer.addPass(depthPass);

        // 创建雾气散射 Shader
        const fogScatteringShader = {
            uniforms: {
                tDiffuse: { value: null },
                tDepth: { value: depthRenderTarget.depthTexture },
                cameraNear: { value: camera.near },
                cameraFar: { value: camera.far },
                inverseProjectionMatrix: { value: new THREE.Matrix4() },
                inverseViewMatrix: { value: new THREE.Matrix4() },
                sunDirection: { value: skyParams.sunPosition.clone().normalize() },
                moonDirection: { value: new THREE.Vector3(0, -0.5, -1).normalize() },
                mieDistance: { value: skyParams.mieDistance },
                kr: { value: skyParams.kr },
                km: { value: skyParams.km },
                rayleighCoef: { value: computeRayleigh() },
                mieCoef: { value: computeMie() },
                mieG: { value: computeMieG() },
                scattering: { value: skyParams.scattering },
                skyLuminance: { value: skyParams.luminance },
                exposure: { value: skyParams.exposure },
                rayleighColor: { value: skyParams.rayleighColor.clone() },
                mieColor: { value: skyParams.mieColor.clone() },
                globalFogDistance: { value: skyParams.globalFogDistance },
                globalFogSmooth: { value: skyParams.globalFogSmooth },
                globalFogDensity: { value: skyParams.globalFogDensity },
                heightFogDistance: { value: skyParams.heightFogDistance },
                heightFogSmooth: { value: skyParams.heightFogSmooth },
                heightFogDensity: { value: skyParams.heightFogDensity },
                heightFogStart: { value: skyParams.heightFogStart },
                heightFogEnd: { value: skyParams.heightFogEnd },
                fogBluishDistance: { value: skyParams.fogBluishDistance },
                fogBluishIntensity: { value: skyParams.fogBluishIntensity },
                heightFogScatterMultiplier: { value: skyParams.heightFogScatterMultiplier }
            },
            vertexShader: fogVertexShader,
            fragmentShader: fogFragmentShader
        };
        // 添加雾气散射 Pass
        const fogPass = new ShaderPass(fogScatteringShader);
        fogPass.uniforms['tDepth'].value = depthRenderTarget.depthTexture;

        fogPass.renderToScreen = true; // 修改为true以显示在屏幕上
        composer.addPass(fogPass);

        console.log('[Cube Scene] Fog scattering pass added to post-processing pipeline');

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
            skyboxMaterial.uniforms.kr.value = skyParams.kr;
            skyboxMaterial.uniforms.km.value = skyParams.km;
            skyboxMaterial.uniforms.rayleighCoef.value.copy(computeRayleigh());
            skyboxMaterial.uniforms.mieCoef.value.copy(computeMie());
            skyboxMaterial.uniforms.mieG.value.copy(computeMieG());
            skyboxMaterial.uniforms.scattering.value = skyParams.scattering;
            skyboxMaterial.uniforms.custom_luminance.value = skyParams.luminance;
            skyboxMaterial.uniforms.exposure.value = skyParams.exposure;
            skyboxMaterial.uniforms.rayleighColor.value.copy(skyParams.rayleighColor);
            skyboxMaterial.uniforms.mieColor.value.copy(skyParams.mieColor);

            // 更新雾气散射参数
            const sunDir = skyParams.sunPosition.clone().normalize();
            fogPass.uniforms.sunDirection.value.copy(sunDir);
            fogPass.uniforms.kr.value = skyParams.kr;
            fogPass.uniforms.km.value = skyParams.km;
            fogPass.uniforms.rayleighCoef.value.copy(computeRayleigh());
            fogPass.uniforms.mieCoef.value.copy(computeMie());
            fogPass.uniforms.mieG.value.copy(computeMieG());
            fogPass.uniforms.scattering.value = skyParams.scattering;
            fogPass.uniforms.skyLuminance.value = skyParams.luminance;
            fogPass.uniforms.exposure.value = skyParams.exposure;
            fogPass.uniforms.rayleighColor.value.copy(skyParams.rayleighColor);
            fogPass.uniforms.mieColor.value.copy(skyParams.mieColor);
            fogPass.uniforms.globalFogDistance.value = skyParams.globalFogDistance;
            fogPass.uniforms.globalFogSmooth.value = skyParams.globalFogSmooth;
            fogPass.uniforms.globalFogDensity.value = skyParams.globalFogDensity;
            fogPass.uniforms.heightFogDistance.value = skyParams.heightFogDistance;
            fogPass.uniforms.heightFogSmooth.value = skyParams.heightFogSmooth;
            fogPass.uniforms.heightFogDensity.value = skyParams.heightFogDensity;
            fogPass.uniforms.heightFogStart.value = skyParams.heightFogStart;
            fogPass.uniforms.heightFogEnd.value = skyParams.heightFogEnd;
            fogPass.uniforms.fogBluishDistance.value = skyParams.fogBluishDistance;
            fogPass.uniforms.fogBluishIntensity.value = skyParams.fogBluishIntensity;
            fogPass.uniforms.heightFogScatterMultiplier.value = skyParams.heightFogScatterMultiplier;

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
                case 't': // 增加 Scattering 强度
                    skyParams.scattering = Math.min(skyParams.scattering + 1.0, 30.0);
                    changed = true;
                    console.log('[Cube Scene] Scattering +', skyParams.scattering.toFixed(1));
                    break;
                case 'g': // 减少 Scattering 强度
                    skyParams.scattering = Math.max(skyParams.scattering - 1.0, 1.0);
                    changed = true;
                    console.log('[Cube Scene] Scattering -', skyParams.scattering.toFixed(1));
                    break;
                case 'r': // 增加 Rayleigh 倍数
                    skyParams.rayleigh = Math.min(skyParams.rayleigh + 0.1, 4.0);
                    changed = true;
                    console.log('[Cube Scene] Rayleigh Multiplier +', skyParams.rayleigh.toFixed(2));
                    break;
                case 'f': // 减少 Rayleigh 倍数
                    skyParams.rayleigh = Math.max(skyParams.rayleigh - 0.1, 0.1);
                    changed = true;
                    console.log('[Cube Scene] Rayleigh Multiplier -', skyParams.rayleigh.toFixed(2));
                    break;
                case 'e': // 增加 Exposure
                    skyParams.exposure = Math.min(skyParams.exposure + 0.1, 5.0);
                    changed = true;
                    console.log('[Cube Scene] Exposure +', skyParams.exposure.toFixed(2));
                    break;
                case 'q': // 减少 Exposure
                    skyParams.exposure = Math.max(skyParams.exposure - 0.1, 0.1);
                    changed = true;
                    console.log('[Cube Scene] Exposure -', skyParams.exposure.toFixed(2));
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
                case '1': // 增加全局雾气距离
                    skyParams.globalFogDistance = Math.min(skyParams.globalFogDistance + 100.0, 5000.0);
                    changed = true;
                    console.log('[Cube Scene] Global Fog Distance +', skyParams.globalFogDistance.toFixed(0));
                    break;
                case '2': // 减少全局雾气距离
                    skyParams.globalFogDistance = Math.max(skyParams.globalFogDistance - 100.0, 100.0);
                    changed = true;
                    console.log('[Cube Scene] Global Fog Distance -', skyParams.globalFogDistance.toFixed(0));
                    break;
                case '3': // 增加全局雾气密度
                    skyParams.globalFogDensity = Math.min(skyParams.globalFogDensity + 0.1, 2.0);
                    changed = true;
                    console.log('[Cube Scene] Global Fog Density +', skyParams.globalFogDensity.toFixed(2));
                    break;
                case '4': // 减少全局雾气密度
                    skyParams.globalFogDensity = Math.max(skyParams.globalFogDensity - 0.1, 0.0);
                    changed = true;
                    console.log('[Cube Scene] Global Fog Density -', skyParams.globalFogDensity.toFixed(2));
                    break;
                case '5': // 增加高度雾气密度
                    skyParams.heightFogDensity = Math.min(skyParams.heightFogDensity + 0.1, 2.0);
                    changed = true;
                    console.log('[Cube Scene] Height Fog Density +', skyParams.heightFogDensity.toFixed(2));
                    break;
                case '6': // 减少高度雾气密度
                    skyParams.heightFogDensity = Math.max(skyParams.heightFogDensity - 0.1, 0.0);
                    changed = true;
                    console.log('[Cube Scene] Height Fog Density -', skyParams.heightFogDensity.toFixed(2));
                    break;
                case '7': // 增加高度雾气起始高度
                    skyParams.heightFogStart = Math.min(skyParams.heightFogStart + 5.0, 100.0);
                    changed = true;
                    console.log('[Cube Scene] Height Fog Start +', skyParams.heightFogStart.toFixed(1));
                    break;
                case '8': // 减少高度雾气起始高度
                    skyParams.heightFogStart = Math.max(skyParams.heightFogStart - 5.0, -50.0);
                    changed = true;
                    console.log('[Cube Scene] Height Fog Start -', skyParams.heightFogStart.toFixed(1));
                    break;
                case '9': // 增加高度雾气结束高度
                    skyParams.heightFogEnd = Math.min(skyParams.heightFogEnd + 10.0, 500.0);
                    changed = true;
                    console.log('[Cube Scene] Height Fog End +', skyParams.heightFogEnd.toFixed(1));
                    break;
                case '0': // 减少高度雾气结束高度
                    skyParams.heightFogEnd = Math.max(skyParams.heightFogEnd - 10.0, 10.0);
                    changed = true;
                    console.log('[Cube Scene] Height Fog End -', skyParams.heightFogEnd.toFixed(1));
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
            depthRenderTarget.setSize(window.innerWidth, window.innerHeight);
        };
        window.addEventListener('resize', handleResize);

        // 渲染循环
        const animate = () => {
            animationFrameId = requestAnimationFrame(animate);

            // 更新雾气散射的矩阵
            fogPass.uniforms.inverseProjectionMatrix.value.copy(camera.projectionMatrixInverse);
            fogPass.uniforms.inverseViewMatrix.value.copy(camera.matrixWorld); // 注意：Three.js中这是世界矩阵



            // 先单独渲染一遍场景到深度渲染目标（只用于采样）
            renderer.setRenderTarget(depthRenderTarget);
            renderer.clear();
            renderer.render(scene, camera);
            renderer.setRenderTarget(null);

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
            depthRenderTarget.dispose();
            if (depthRenderTarget.depthTexture) {
                depthRenderTarget.depthTexture.dispose();
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
