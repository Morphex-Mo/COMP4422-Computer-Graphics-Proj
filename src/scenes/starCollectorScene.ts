/**
 * Star Collector Scene 《星星收藏家》
 * 剧本视觉实现：30秒时间线
 * 0-5s  深蓝夜空下狐狸坐在山顶，微微呼吸，抬头望星
 * 6-12s 第一颗星从高空缓慢落下到左爪，落下瞬间闪光
 * 13-20s 狐狸把左爪贴在胸前，星星微光脉动，头微侧
 * 21-27s 第二颗星落在右爪，狐狸尾巴轻轻卷起，笑意更明显
 * 28-30s 镜头拉远，第三颗星出现并与另外两颗环绕，显示文字“今晚的宝藏”
 *
 * 说明：
 * - 禁用 OrbitControls，摄像机按脚本动画
 * - 使用小型山地+星空渐变背景
 * - 使用狐模型 Toon Shader
 * - 星星为发光球体，含简单闪烁与脉动动画
 * - 预留音效钩子 (TODO 注释)
 */
import * as THREE from 'three';
import {defineScene} from '../core';
// 新增：引入可调大气与天气系统
import {AtmosphereController} from '../utils/atmosphere/AtmosphereController';
import {AzureManager} from '../utils/manager';
import {buildingPresets} from '../utils/presets/myPresets';
// 新增导入 OrbitControls 以便调试摄像机
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';

// 资源清理引用
let cleanup: (() => void) | null = null;

// 时间线辅助：简单事件状态结构
interface FallingStar {
    mesh: THREE.Mesh;
    glow: THREE.Mesh; // 外层柔光
    startPos: THREE.Vector3;
    targetBone?: THREE.Object3D | null;
    targetPos: THREE.Vector3; // 捕获最终位置（世界坐标）
    fallStart: number; // 秒
    fallEnd: number;   // 秒
    caught: boolean;   // 是否已到达
    pulseStart?: number; // 脉动开始时间
    hoverOffset?: THREE.Vector3; // 悬浮偏移
}

export const starCollectorScene = defineScene({
    id: 'starCollectorScene',
    name: 'Star Collector – Fox On Mountain Under Night Sky',
    resources: {
        gltfModels: {
            fox: './assets/fox/scene.gltf',
            treeSource: './assets/hill-tree/scene.gltf' // 新增树资源（内含树模型）
        },
        shaders: {
            // Toon
            foxVertex: './assets/shaders/fox_toon.vert.glsl',
            foxFragment: './assets/shaders/fox_toon.frag.glsl',
            // 大气与雾
            atmoVertex: './assets/shaders/atmospheric_scattering.vert.glsl',
            atmoFragment: './assets/shaders/atmospheric_scattering.frag.glsl',
            fogVertex: './assets/shaders/fog_scattering.vert.glsl',
            fogFragment: './assets/shaders/fog_scattering.frag.glsl',
            depthVertex: './assets/shaders/depth_display.vert.glsl',
            depthFragment: './assets/shaders/depth_display.frag.glsl',
            standardVertex: './assets/shaders/standard.vert.glsl',
            standardFragment: './assets/shaders/standard.frag.glsl'
        }
    },
    onLoadProgress: (loaded, total, percentage) => {
        console.log(`[StarCollector] 加载进度: ${percentage}% (${loaded}/${total})`);
    },
    main: async (resources) => {
        console.log('[StarCollector] 场景启动');
        const foxGltf = resources.get('fox');
        const treeGltf = resources.get('treeSource'); // 获取树模型
        const foxVertex = resources.get('foxVertex') as string;
        const foxFragment = resources.get('foxFragment') as string;
        // 新增：获取大气相关着色器
        const atmoVertex = resources.get('atmoVertex') as string;
        const atmoFragment = resources.get('atmoFragment') as string;
        const fogVertex = resources.get('fogVertex') as string;
        const fogFragment = resources.get('fogFragment') as string;
        const depthVertex = resources.get('depthVertex') as string;
        const depthFragment = resources.get('depthFragment') as string;
        const standardVertex = resources.get('standardVertex') as string;
        const standardFragment = resources.get('standardFragment') as string;

        // 使用 AtmosphereController 代替手动天空与灯光/renderer
        const app = document.getElementById('app');
        const controller = new AtmosphereController({
            canvasParent: app,
            shaders: { atmoVertex, atmoFragment, fogVertex, fogFragment, depthVertex, depthFragment, standardVertex, standardFragment },
            options: { autoUpdateFromSystems: true, controls: false, enableDepthDebug: false }
        });
        controller.initialize();
        // 夜间基调：降低主光强度与颜色偏冷蓝

        // Azure 天气系统接入并设置为静止午夜（深夜星空）
        const azureManager = new AzureManager();
        azureManager.buildDefaultSchema(); // 基础 schema
        buildingPresets(azureManager);      // 引入 Fogness 预设
        // 使用首个全局天气作为当前天气
        if (azureManager.weather.globalWeatherList.length > 1) {
            azureManager.weather.currentWeatherPreset = azureManager.weather.globalWeatherList[1].preset!;
        }
        controller.attachAzureManager(azureManager);
        controller.directionalLight.shadow.bias=-0.005;
        // 冻结昼夜循环：dayLength=0 防止时间推进
        azureManager.time.updateConfig({ dayLength: 0.0, dawnTime: 6.0, duskTime: 18.0 });
        azureManager.time.setTime(20.0); // 午夜
        // 强制夜空参数：提高星空亮度
        controller.overrideParameters({ starFieldIntensity: 1.0, exposure: 2.2, mie: 0.8, rayleigh: 0.4 });

        // 使用 controller 的 scene/camera/renderer
        const scene = controller.scene;
        const camera = controller.camera;
        // 调试摄像机相关变量
        let debugControls: OrbitControls | null = null;
        let debugCameraEnabled = false; // 是否处于可调试模式

        function enableDebugCamera() {
            if (debugControls) return;
            debugControls = new OrbitControls(camera, controller.renderer.domElement);
            debugControls.enableDamping = true;
            debugControls.dampingFactor = 0.05;
            debugControls.target.set(0, 2, 0);
            debugControls.update();
            debugCameraEnabled = true;
            console.log('[StarCollector][Debug] 摄像机调试模式已开启 (按 C 关闭)');
            showDebugHint(true);
        }
        function disableDebugCamera() {
            if (!debugControls) return;
            debugControls.dispose();
            debugControls = null;
            debugCameraEnabled = false;
            console.log('[StarCollector][Debug] 摄像机调试模式已关闭 (按 C 开启)');
            showDebugHint(false);
        }
        function toggleDebugCamera() {
            if (debugCameraEnabled) disableDebugCamera(); else enableDebugCamera();
        }

        // 简单的屏幕提示
        let debugHintDiv: HTMLDivElement | null = null;
        function showDebugHint(visible: boolean) {
            if (!app) return;
            if (!debugHintDiv) {
                debugHintDiv = document.createElement('div');
                debugHintDiv.style.position = 'absolute';
                debugHintDiv.style.bottom = '10px';
                debugHintDiv.style.right = '10px';
                debugHintDiv.style.padding = '6px 10px';
                debugHintDiv.style.background = 'rgba(0,0,0,0.45)';
                debugHintDiv.style.color = '#fff';
                debugHintDiv.style.fontSize = '12px';
                debugHintDiv.style.fontFamily = 'monospace';
                debugHintDiv.style.borderRadius = '4px';
                debugHintDiv.style.pointerEvents = 'none';
                app.appendChild(debugHintDiv);
            }
            debugHintDiv.textContent = 'Debug Camera ON (C to toggle)';
            debugHintDiv.style.opacity = visible ? '1' : '0';
        }

        function handleKey(e: KeyboardEvent) {
            if (e.code === 'KeyC') {
                toggleDebugCamera();
            }
        }
        window.addEventListener('keydown', handleKey);

        // 强化夜空蓝色与雾散射淡化（覆写参数）
        controller.overrideParameters({
            starFieldIntensity: 1.0,
            exposure: 2.3,
            mie: 0.7,
            rayleigh: 0.45,
            rayleighColor: new THREE.Color(0.15, 0.35, 0.75),
            mieColor: new THREE.Color(0.25, 0.45, 0.65),
            globalFogDensity: 0.8,
            globalFogDistance: 60
        });

        // 山地生成 (使用完整算法)
        const NoiseModule = require('noisejs');
        const FIXED_CENTER_HEIGHT = 0.5; // 固定原点高度
        const FLAT_RADIUS = 8.0; // 平坦区域半径
        function createMountain(size: number, segments: number, heightScale: number, noiseScale: number) {
            // 保留完整算法并降低高度使其更平
            const geometry = new THREE.PlaneGeometry(size, size, segments, segments);
            geometry.rotateX(-Math.PI / 2);
            const hillBox = new THREE.Box3();
            const vertices = geometry.attributes.position.array as Float32Array;
            const noise = new NoiseModule.Noise(Math.random()); // 统一使用一个噪声实例避免每顶点重建
            for (let i = 0; i < vertices.length; i += 3) {
                const x = vertices[i];
                const z = vertices[i + 2];
                const y = vertices[i + 1];
                const vector = new THREE.Vector3(x, y, z);
                if (hillBox.containsPoint(vector)) continue;
                
                // 计算到原点的距离
                const distToCenter = Math.sqrt(x * x + z * z);
                
                // 中心区域固定高度
                if (distToCenter < FLAT_RADIUS) {
                    vertices[i + 1] = FIXED_CENTER_HEIGHT;
                } else {
                    // 降低高频贡献并整体压缩高度
                    const terrainHeight = (
                        noise.perlin2(x * noiseScale, z * noiseScale) * 0.8 +
                        noise.perlin2(x * noiseScale * 2, z * noiseScale * 2) * 0.25 +
                        noise.perlin2(x * noiseScale * 4, z * noiseScale * 4) * 0.08
                    ) * heightScale;
                    
                    // 平滑过渡区域（半径8-12之间）
                    if (distToCenter < FLAT_RADIUS + 4) {
                        const blendFactor = (distToCenter - FLAT_RADIUS) / 4.0;
                        vertices[i + 1] = FIXED_CENTER_HEIGHT * (1 - blendFactor) + terrainHeight * blendFactor;
                    } else {
                        vertices[i + 1] = terrainHeight;
                    }
                }
            }
            // 平滑
            const tempVertices = (vertices as any).slice();
            const side = segments + 1;
            for (let i = 0; i < vertices.length; i += 3) {
                const idx = i / 3; const gx = idx % side; const gy = Math.floor(idx / side);
                if (gx > 0 && gx < segments && gy > 0 && gy < segments) {
                    const neighbors = [idx - 1, idx + 1, idx - side, idx + side];
                    let avg = 0; for (const n of neighbors) avg += tempVertices[n * 3 + 1];
                    avg /= neighbors.length;
                    vertices[i + 1] = (vertices[i + 1] + avg * 2) / 3;
                }
            }
            geometry.computeVertexNormals();
            const colors: number[] = []; const color = new THREE.Color();
            for (let i = 0; i < vertices.length; i += 3) {
                const vy = vertices[i + 1];
                if (vy < heightScale * 0.15) color.setHex(0x5F624A); else color.setHex(0xA6765F);
                colors.push(color.r, color.g, color.b);
            }
            geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(colors), 3));
            const material = new THREE.MeshPhongMaterial({ vertexColors: true });
            const land = new THREE.Mesh(geometry, material);
            land.position.y = -4;
            land.receiveShadow = true;
            scene.add(land);
            // 使用固定的中心高度
            centerGroundHeight = FIXED_CENTER_HEIGHT - 4;
            return land;
        }
        let centerGroundHeight = 0;
        const mountainMesh = createMountain(100, 150, 10, 0.04); // 高度缩放减小到 10 使更平

        // 树散布：基于地形顶点采样
        function sampleHeightOnMountain(x: number, z: number): number {
            const posAttr = mountainMesh.geometry.getAttribute('position') as THREE.BufferAttribute;
            let closestY = 0; let minDist = Infinity;
            for (let i = 0; i < posAttr.count; i++) {
                const vx = posAttr.getX(i);
                const vy = posAttr.getY(i);
                const vz = posAttr.getZ(i);
                const d = (vx - x) * (vx - x) + (vz - z) * (vz - z);
                if (d < minDist) { minDist = d; closestY = vy; }
            }
            return closestY - 4; // compensate land.position.y
        }

        function scatterTrees(source: any, count: number) {
            if (!source || !source.scene) { console.warn('[StarCollector] 树模型未找到'); return; }
            const root = source.scene;
            const treeGroup = new THREE.Group();
            for (let i = 0; i < count; i++) {
                // 避开中心区域给狐狸留空间
                let x = 0, z = 0; let attempts = 0;
                const radiusLimit = 100 * 0.45;
                do {
                    x = (Math.random() - 0.5) * radiusLimit * 2;
                    z = (Math.random() - 0.5) * radiusLimit * 2;
                    attempts++;
                } while (Math.sqrt(x * x + z * z) < 25 && attempts < 200); // 中心空 25
                const y = sampleHeightOnMountain(x, z);
                // 克隆树
                const treeClone = root.clone(true);
                treeClone.traverse((c: any) => {
                    if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; }
                });
                const s = 0.6 + Math.random() * 0.6; // 缩放
                treeClone.scale.set(s, s, s);
                treeClone.position.set(x, y, z);
                treeClone.rotation.y = Math.random() * Math.PI * 2;
                treeGroup.add(treeClone);
            }
            {
                const treeClone = root.clone(true);
                treeClone.traverse((c: any) => {
                    if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; }
                });
                const s = 2.1; // 缩放
                treeClone.scale.set(s, s, s);
                treeClone.position.set(0,0,0);
                treeClone.rotation.y = 0;
                treeGroup.add(treeClone);
            }
            scene.add(treeGroup);
            console.log(`[StarCollector] 已散布树木数量: ${count}`);
        }
        if (treeGltf) scatterTrees(treeGltf, 55); // 放置 25 棵树

        // 狐狸模型加载与 Toon 材质 —— 不再维护本地 customMaterials 列表（controller 内部统一处理）
        let mixer: THREE.AnimationMixer | null = null;
        let clock: THREE.Clock | null = null;
        let foxRoot: THREE.Object3D | null = null;
        let leftHand: THREE.Object3D | null = null;
        let rightHand: THREE.Object3D | null = null;
        let tailBone: THREE.Object3D | null = null;

        function createToon(mat: THREE.Material): THREE.ShaderMaterial {
            const base: any = mat;
            const uniforms = THREE.UniformsUtils.merge([
                THREE.UniformsLib.common,
                THREE.UniformsLib.lights,
                THREE.UniformsLib.fog,
                {
                    uColor: { value: (base.color || new THREE.Color(0xffffff)) },
                    uLightDirection: { value: new THREE.Vector3() },
                    uLightColor: { value: new THREE.Color(0xffffff) },
                    uShadowThreshold: { value: 0.3 },
                    uShadowSmoothness: { value: 0.4 },
                    uSpecularThreshold: { value: 0.7 },
                    uSpecularSmoothness: { value: 0.1 },
                    uSpecularPower: { value: 16.0 },
                    uSpecularIntensity: { value: 0.25 },
                    uDiffuseStrength: { value: 0.9 },
                    uShadowIntensity: { value: 0.4 },
                    uAmbientStrength: { value: 0.35 },
                    uRimThreshold: { value: 0.5 },
                    uRimAmount: { value: 0.6 },
                    uRimColor: { value: new THREE.Color(0x6699cc) },
                    uTexture: { value: base.map || null },
                    uUseTexture: { value: !!base.map }
                }
            ]);
            const shader = new THREE.ShaderMaterial({
                uniforms,
                vertexShader: foxVertex,
                fragmentShader: foxFragment,
                lights: true,
                fog: true,
                transparent: base.transparent || false,
                side: base.side || THREE.FrontSide
            });
            controller.customMaterials.push(shader); // 关键：注册给大气控制器做光照方向更新
            return shader;
        }

        let foxBaseY = 0; // 狐狸的基准高度（用于呼吸动画）
        if (foxGltf && foxGltf.scene) {
            foxRoot = foxGltf.scene;
            foxBaseY = centerGroundHeight + 3; // 记录基准高度
            foxRoot.position.set(0, foxBaseY, 0); // 更平的地形上略微抬高
            foxRoot.scale.set(1, 1, 1);
            foxRoot.rotation.set(0, -Math.PI / 2, 0);
            foxRoot.traverse((child: any) => {
                if (child.isMesh) {
                    child.castShadow = true; child.receiveShadow = true;
                    child.material = createToon(child.material); // 内联调用移除冗余 toon 变量
                }
                // 记录骨骼
                if (!leftHand && (child.name === 'LeftHand' || child.name === 'mixamorigLeftHand')) leftHand = child;
                if (!rightHand && (child.name === 'RightHand' || child.name === 'mixamorigRightHand')) rightHand = child;
                if (!tailBone && /tail/i.test(child.name)) tailBone = child;
            });
            scene.add(foxRoot);
        } else {
            console.warn('[StarCollector] 狐狸模型未加载成功');
        }

        // 星星创建函数
        function createStar(color = 0xffffaa, radius = 0.25): FallingStar {
            const geo = new THREE.SphereGeometry(radius, 24, 24);
            const mat = new THREE.MeshStandardMaterial({ color, emissive: new THREE.Color(color), emissiveIntensity: 1.5, roughness: 0.4, metalness: 0.0 });
            const mesh = new THREE.Mesh(geo, mat); mesh.castShadow = true;
            // 柔光层
            const glowGeo = new THREE.SphereGeometry(radius * 2.2, 16, 16);
            const glowMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending });
            const glow = new THREE.Mesh(glowGeo, glowMat);
            mesh.add(glow);
            scene.add(mesh);
            return {
                mesh,
                glow,
                startPos: new THREE.Vector3(0, 18, 0),
                targetPos: new THREE.Vector3(),
                fallStart: 0,
                fallEnd: 0,
                caught: false
            };
        }

        // 星星状态集合
        let star1: FallingStar | null = null;
        let star2: FallingStar | null = null;
        let star3: FallingStar | null = null;

        // 文字覆盖层
        const overlay = document.createElement('div');
        overlay.style.position = 'absolute';
        overlay.style.top = '40%';
        overlay.style.left = '50%';
        overlay.style.transform = 'translate(-50%, -50%)';
        overlay.style.padding = '12px 24px';
        overlay.style.background = 'rgba(0,0,0,0.3)';
        overlay.style.borderRadius = '8px';
        overlay.style.color = '#ffffff';
        overlay.style.fontFamily = '"Microsoft YaHei", sans-serif';
        overlay.style.fontSize = '32px';
        overlay.style.letterSpacing = '2px';
        overlay.style.opacity = '0';
        overlay.style.transition = 'opacity 1.5s ease';
        overlay.textContent = '今晚的宝藏';
        if (app) app.appendChild(overlay);

        // 简单缓动函数
        function easeInOutQuad(t: number) { return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; }
        function easeOutQuad(t: number) { return t * (2 - t); }

        // 调整摄像机初始位置对准狐狸
        const foxTargetY = centerGroundHeight + 1.5; // 狐狸头部高度
        // 环绕动画起始位置（侧面）
        camera.position.set(10, foxTargetY + 3, 0);
        camera.lookAt(0, foxTargetY, 0);

        const startTime = performance.now();
        let animationFrameId: number | null = null;

        // 摄像机环绕动画参数
        const ORBIT_DURATION = 7.0; // 环绕5秒
        const ORBIT_RADIUS = 15;
        const ORBIT_HEIGHT = foxTargetY + 2.5;
        // 最终位置：狐狸后方偏下
        const FINAL_CAM_POS = new THREE.Vector3(0, foxTargetY - 0.5, -15);
        const FINAL_LOOK_AT = new THREE.Vector3(0, foxTargetY + 0.3, 0);

        // 摄像机拉远参数（时间线向后推移5秒）
        const cameraPullStart = 33; // 28 + 5
        const cameraPullEnd = 35;   // 30 + 5

        function getBoneWorldPos(bone: THREE.Object3D | null, fallback: THREE.Vector3): THREE.Vector3 {
            if (!bone) return fallback.clone();
            const p = new THREE.Vector3();
            bone.getWorldPosition(p);
            return p;
        }

        function animate() {
            animationFrameId = requestAnimationFrame(animate);
            const elapsed = (performance.now() - startTime) / 1000; // s

            // ===== 摄像机环绕动画（0-5秒） =====
            if (elapsed < ORBIT_DURATION) {
                const orbitProgress = elapsed / ORBIT_DURATION;
                // 环绕角度：从90度（侧面）逆时针转到180度（后方）
                const angle = orbitProgress * Math.PI; // 90° -> 180°
                const camX = Math.cos(angle) * ORBIT_RADIUS;
                const camZ = Math.sin(angle) * ORBIT_RADIUS;
                camera.position.set(camX, ORBIT_HEIGHT, camZ);
                camera.lookAt(0, foxTargetY, 0);
            } else if (elapsed >= ORBIT_DURATION && elapsed < ORBIT_DURATION + 1.0) {
                // 5-6秒：平滑过渡到最终位置（后方偏下）
                const transitionProgress = elapsed - ORBIT_DURATION;
                const eased = easeInOutQuad(transitionProgress);
                camera.position.lerpVectors(
                    new THREE.Vector3(Math.cos(Math.PI) * ORBIT_RADIUS, ORBIT_HEIGHT, Math.sin(Math.PI) * ORBIT_RADIUS),
                    FINAL_CAM_POS,
                    eased
                );
                const lookAtPos = new THREE.Vector3().lerpVectors(
                    new THREE.Vector3(0, foxTargetY, 0),
                    FINAL_LOOK_AT,
                    eased
                );
                camera.lookAt(lookAtPos);
            }

            // Fox 呼吸等保持，即使调试摄像机也可保留角色微动画
            if (foxRoot) {
                const breathe = Math.sin(elapsed * 2) * 0.02;
                foxRoot.position.y = foxBaseY + breathe; // 使用记录的基准高度
                // 头部倾斜延后5秒（18-25s）
                if (!debugCameraEnabled && elapsed >= 18 && elapsed <= 25) {
                    foxRoot.rotation.z = Math.sin((elapsed - 18) * 1.5) * 0.08;
                } else if (!debugCameraEnabled) {
                    foxRoot.rotation.z *= 0.9;
                }
            }

            if (mixer && clock) mixer.update(clock.getDelta());

            // 星星与剧本逻辑：只有在非调试模式下才驱动（时间线延后5秒）
            if (!debugCameraEnabled) {
                // 星星生成逻辑
                // 第一颗星 11-17s 下落（原6-12s + 5s）
                if (elapsed >= 11 && !star1) {
                    star1 = createStar(0xffddaa, 0.28);
                    star1.fallStart = 11; star1.fallEnd = 17;
                    star1.targetBone = leftHand;
                    star1.startPos.set(0, 20, 0);
                    star1.targetPos.copy(getBoneWorldPos(leftHand, new THREE.Vector3(-0.4, 1.4, 0)));
                    console.log('[StarCollector] ✨ 第一颗星出现');
                    // TODO 播放星星出现音效
                }
                // 第二颗星 26-32s 下落（原21-27s + 5s）
                if (elapsed >= 26 && !star2) {
                    star2 = createStar(0xffeeaa, 0.24);
                    star2.fallStart = 26; star2.fallEnd = 32;
                    star2.targetBone = rightHand;
                    star2.startPos.set(2, 22, -1);
                    star2.targetPos.copy(getBoneWorldPos(rightHand, new THREE.Vector3(0.4, 1.4, 0)));
                    console.log('[StarCollector] ✨ 第二颗星出现');
                    // TODO 播放第二颗星出现音效

                    if (foxGltf.animations?.length) {
                        mixer = new THREE.AnimationMixer(foxRoot);
                        const action = mixer.clipAction(foxGltf.animations[0]);
                        action.play();
                        clock = new THREE.Clock();
                    }
                }
                // 第三颗星 33s 悬浮出现（原28s + 5s）
                if (elapsed >= 33 && !star3) {
                    star3 = createStar(0xffffcc, 0.22);
                    star3.startPos.set(0, 2.2, 0.8);
                    star3.targetPos.copy(star3.startPos);
                    star3.caught = true; // 直接悬浮
                    star3.hoverOffset = new THREE.Vector3();
                    console.log('[StarCollector] ✨ 第三颗星出现');
                    // TODO 播放第三颗星出现音效
                }

                // 更新星星下落 & 状态
                [star1, star2].forEach(star => {
                    if (!star) return;
                    if (!star.caught) {
                        const t = (elapsed - star.fallStart) / (star.fallEnd - star.fallStart);
                        const clamped = Math.min(Math.max(t, 0), 1);
                        const eased = easeOutQuad(clamped);
                        const current = new THREE.Vector3().lerpVectors(star.startPos, star.targetPos, eased);
                        star.mesh.position.copy(current);
                        // 下落过程旋转
                        star.mesh.rotation.y += 0.05;
                        star.mesh.rotation.x += 0.03;
                        if (clamped >= 1 && !star.caught) {
                            star.caught = true;
                            star.pulseStart = elapsed;
                            // 捕获闪光：瞬时放大并开始消失动画
                            star.mesh.scale.set(2.0, 2.0, 2.0);
                            console.log('[StarCollector] ⭐ 星星捕获');
                            // TODO 播放捕获音效 (bling)
                        }
                    } else {
                        // 捕获后：闪光缩小消失（0.6秒内）
                        const collectTime = elapsed - (star.pulseStart || elapsed);
                        if (collectTime < 0.6) {
                            // 闪光阶段 0-0.2s：放大并增强发光
                            if (collectTime < 0.2) {
                                const flashProgress = collectTime / 0.2;
                                star.mesh.scale.setScalar(2.0 + flashProgress * 0.5);
                                (star.mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = 3.0 + flashProgress * 2.0;
                                (star.glow.material as THREE.MeshBasicMaterial).opacity = 0.6;
                            } else {
                                // 缩小消失阶段 0.2-0.6s
                                const fadeProgress = (collectTime - 0.2) / 0.4;
                                const scale = 2.5 * (1 - fadeProgress);
                                star.mesh.scale.setScalar(Math.max(scale, 0.01));
                                (star.mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = 5.0 * (1 - fadeProgress);
                                (star.glow.material as THREE.MeshBasicMaterial).opacity = 0.6 * (1 - fadeProgress);
                            }
                        } else {
                            // 完全消失后移除
                            star.mesh.visible = false;
                        }
                    }
                });

                // 移除原胸口移动逻辑（星星直接消失）

                // 尾巴卷动（32s后，即第二颗星收集完成后，原27s + 5s）
                if (tailBone && elapsed >= 32) {
                    const t = (elapsed - 32) / 3.0; // 3秒内卷起
                    const curlAmount = Math.min(t, 1.0);
                    tailBone.rotation.x = Math.sin(curlAmount * Math.PI) * 0.5;
                }

                // 第三颗星环绕（33-35s，原28-30s + 5s）+ 三星排布
                if (star3) {
                    const base = star3.targetPos.clone();
                    const orbitT = Math.max(elapsed - 33, 0);
                    star3.mesh.position.set(
                        base.x + Math.sin(orbitT * 2) * 0.6,
                        base.y + Math.sin(orbitT * 3) * 0.25 + 0.1,
                        base.z + Math.cos(orbitT * 2) * 0.6
                    );
                    star3.mesh.rotation.y += 0.04;
                    (star3.mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = 1.6 + Math.sin(orbitT * 5) * 0.5;
                    // 让已存在星星稍微围绕形成三角
                    if (star1 && star1.mesh.visible) star1.mesh.position.x = -0.5 + Math.sin(orbitT * 2) * 0.1;
                    if (star2 && star2.mesh.visible) star2.mesh.position.x = 0.5 + Math.cos(orbitT * 2) * 0.1;
                }

                // 摄像机拉远（33-35s，原28-30s + 5s）
                if (elapsed >= cameraPullStart && elapsed <= cameraPullEnd) {
                    const t = (elapsed - cameraPullStart) / (cameraPullEnd - cameraPullStart);
                    const eased = easeInOutQuad(Math.min(Math.max(t, 0), 1));
                    camera.position.lerpVectors(FINAL_CAM_POS, new THREE.Vector3(0, foxTargetY + 4, -18), eased);
                    camera.lookAt(0, foxTargetY, 0);
                }

                // 文本显示 (33s 后渐显，原28s + 5s)
                if (elapsed >= 33) {
                    overlay.style.opacity = '1';
                }
            } else {
                // 调试模式：允许自由控制摄像机，不执行脚本镜头变换
                if (debugControls) debugControls.update();
            }

            controller.update();
        }
        animate();
        console.log('[StarCollector] 初始化完成 (AtmosphereController + Azure 夜空)');

        cleanup = () => {
            if (animationFrameId) { cancelAnimationFrame(animationFrameId); animationFrameId = null; }
            window.removeEventListener('keydown', handleKey);
            disableDebugCamera();
            controller.dispose();
            if (overlay && overlay.parentElement) overlay.parentElement.removeChild(overlay);
            if (debugHintDiv && debugHintDiv.parentElement) debugHintDiv.parentElement.removeChild(debugHintDiv);
            console.log('[StarCollector] 资源清理完成');
        };
    },
    onExit: () => {
        console.log('[StarCollector] 退出场景');
        if (cleanup) { cleanup(); cleanup = null; }
    }
});

export function startStarCollectorScene() {
    console.log('=== 启动星星收藏家场景 ===');
    return starCollectorScene();
}