/**
 * Fox Scene - 展示GLTF模型加载（日式动漫风格 + 骨骼动画支持）
 * 优化版：减少陶瓷感，增强柔和度
 */
import * as THREE from 'three';
import { defineScene } from '../core';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

/**
 * 创建动漫风格材质（优化参数）
 */
function createAnimeToonMaterial(originalMaterial: THREE.Material, mesh: THREE.SkinnedMesh | THREE.Mesh,vertexShader:string,fragmentShader:string): THREE.ShaderMaterial {
    const material = originalMaterial as any;

    const color = material.color || new THREE.Color(0xffffff);
    const map = material.map || null;

    const uniforms = THREE.UniformsUtils.merge([
        THREE.UniformsLib.common,
        THREE.UniformsLib.lights,
        THREE.UniformsLib.fog,
        {
            uColor: { value: color },
            uLightDirection: { value: new THREE.Vector3(0, 0, 0) }, // 将在渲染循环中更新
            uLightColor: { value: new THREE.Color(0xffffff) },

            // 优化后的参数 - 减少陶瓷感
            uShadowThreshold: { value: 0.3 },        // 降低阴影阈值，让光照更柔和
            uShadowSmoothness: { value: 0.4 },      // 增加阴影平滑度
            uSpecularThreshold: { value: 0.7 },      // 提高高光阈值，减少高光面积
            uSpecularSmoothness: { value: 0.1 },     // 增加高光平滑度
            uSpecularPower: { value: 16.0 },         // 降低高光锐度，让高光更柔和
            uSpecularIntensity: { value: 0.3 },      // 降低高光强度
            uDiffuseStrength: { value: 0.9 },        // 降低漫反射强度
            uShadowIntensity: { value: 0.4 },        // 提高阴影明度，减少对比
            uAmbientStrength: { value: 0.35 },       // 增强环境光

            // 边缘光参数
            uRimThreshold: { value: 0.5 },
            uRimAmount: { value: 0.6 },
            uRimColor: { value: new THREE.Color(0x6699cc) }, // 更柔和的边缘光颜色

            uTexture: { value: map },
            uUseTexture: { value: map !== null }
        }
    ]);

    const shaderMaterial = new THREE.ShaderMaterial({
        uniforms: uniforms,
        vertexShader: vertexShader,
        fragmentShader: fragmentShader,
        lights: true,
        fog: true,
        side: material.side || THREE.FrontSide,
        transparent: material.transparent || false
    });

    return shaderMaterial;
}

let cleanupFunction: (() => void) | null = null;

export const foxScene = defineScene({
    id: 'foxScene',
    name: 'Fox Model Scene (Optimized Anime Toon Style)',
    resources: {
        gltfModels: {
            'fox': './assets/fox/scene.gltf'
        },
        shaders:{
            vertex:'./assets/shaders/fox_toon.vert.glsl',
            fragment:'./assets/shaders/fox_toon.frag.glsl',
        }
    },
    onLoadProgress: (loaded, total, percentage) => {
        console.log(`[Fox Scene] Loading progress: ${percentage}% (${loaded}/${total})`);
    },
    main: async (resources) => {
        console.log('[Fox Scene] All resources loaded!');
        console.log('[Fox Scene] Starting scene with Optimized Anime Toon Shader...');
        const vertexShader = resources.get('vertex') as string;
        const fragmentShader = resources.get('fragment') as string;
        let animationFrameId: number | null = null;
        let mixer: THREE.AnimationMixer | null = null;
        let clock: THREE.Clock | null = null;
        const customMaterials: THREE.ShaderMaterial[] = [];

        const foxGltf = resources.get('fox');
        const scene = new THREE.Scene();

        // 创建天空盒 - 使用渐变色天空
        const skyboxGeometry = new THREE.SphereGeometry(500, 32, 32);
        const skyboxMaterial = new THREE.ShaderMaterial({
            uniforms: {
                topColor: { value: new THREE.Color(0x87ceeb) },    // 天空蓝
                bottomColor: { value: new THREE.Color(0xffd7a8) }, // 温暖的桃色
                offset: { value: 33 },
                exponent: { value: 0.6 }
            },
            vertexShader: `
                varying vec3 vWorldPosition;
                void main() {
                    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                    vWorldPosition = worldPosition.xyz;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec3 topColor;
                uniform vec3 bottomColor;
                uniform float offset;
                uniform float exponent;
                varying vec3 vWorldPosition;
                void main() {
                    float h = normalize(vWorldPosition + offset).y;
                    gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
                }
            `,
            side: THREE.BackSide
        });
        const skybox = new THREE.Mesh(skyboxGeometry, skyboxMaterial);
        scene.add(skybox);

        // 添加雾效
        scene.fog = new THREE.FogExp2(0xffd7a8, 0.1); // 颜色与背景一致

        const camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        camera.position.set(5, 5, 5);
        camera.lookAt(0, 0, 0);

        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        const appElement = document.getElementById('app');
        if (appElement) {
            appElement.innerHTML = '';
            appElement.appendChild(renderer.domElement);
        }

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.target.set(0, 1, 0);
        controls.update();

        // 增强环境光，减少整体对比度
        //深蓝色
        const ambientLight = new THREE.AmbientLight(0x00004d, 0.6);
        scene.add(ambientLight);

        // 调整主光源位置，使其更自然
        //浅一点的蓝紫色
        const directionalLight = new THREE.DirectionalLight(0x3333cc, 0.9);
        directionalLight.position.set(0, 1, 1);
        directionalLight.castShadow = true;
        directionalLight.shadow.camera.left = -20;
        directionalLight.shadow.camera.right = 20;
        directionalLight.shadow.camera.top = 20;
        directionalLight.shadow.camera.bottom = -20;
        directionalLight.shadow.mapSize.width = 4096;
        directionalLight.shadow.mapSize.height = 4096;
        directionalLight.shadow.bias = -0.01; // 调整阴影偏移
        scene.add(directionalLight);

        // 添加辅助光，填充阴影区域
        //const fillLight = new THREE.DirectionalLight(0xaaccff, 0.3);
        //fillLight.position.set(-5, 3, -5);
        //scene.add(fillLight);

        console.log(foxGltf);

        if (foxGltf && foxGltf.scene) {
            const fox = foxGltf.scene;
            fox.position.set(0, 2, 0);
            fox.scale.set(1, 1, 1);
            fox.rotation.set(0,-Math.PI/2,0);
            fox.traverse((child: any) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;

                    const toonMaterial = createAnimeToonMaterial(child.material, child,vertexShader,fragmentShader);
                    child.material = toonMaterial;
                    customMaterials.push(toonMaterial);

                    console.log('[Fox Scene] Applied Optimized Toon Shader to:', child.name);
                }
            });

            scene.add(fox);
            console.log('[Fox Scene] 🎨 优化后的材质参数:');
            console.log('  ✓ 降低高光强度 (uSpecularIntensity: 0.3)');
            console.log('  ✓ 增加阴影柔和度 (uShadowSmoothness: 0.15)');
            console.log('  ✓ 提高环境光 (uAmbientStrength: 0.35)');
            console.log('  ✓ 降低高光锐度 (uSpecularPower: 16.0)');
            console.log('  ✓ 光照方向实时更新已启用');

            if (foxGltf.animations && foxGltf.animations.length > 0) {
                mixer = new THREE.AnimationMixer(fox);
                foxGltf.animations.forEach((clip, index) => {
                    const action = mixer!.clipAction(clip);
                    if (index === 0) {
                        action.play();
                        console.log(`[Fox Scene] Playing animation: ${clip.name}`);
                    }
                });
                clock = new THREE.Clock();
            }

            // 添加两个球体代替手部，方便观察效果
            const leftHandBone = fox.getObjectByName('LeftHand') || fox.getObjectByName('mixamorigLeftHand');
            const rightHandBone = fox.getObjectByName('RightHand') || fox.getObjectByName('mixamorigRightHand');

            const sphereGeometry = new THREE.SphereGeometry(0.15, 32, 32);

            // 使用自定义 Toon Shader 材质
            const leftToonMaterial = new THREE.ShaderMaterial({
                uniforms: THREE.UniformsUtils.clone({
                    ...THREE.UniformsLib.common,
                    ...THREE.UniformsLib.lights,
                    ...THREE.UniformsLib.fog,
                    uColor: { value: new THREE.Color(0xEE8E69) },
                    uLightDirection: { value: new THREE.Vector3(0, 0, 0) },
                    uLightColor: { value: new THREE.Color(0xffffff) },
                    uShadowThreshold: { value: 0.3 },
                    uShadowSmoothness: { value: 0.4 },
                    uSpecularThreshold: { value: 0.7 },
                    uSpecularSmoothness: { value: 0.1 },
                    uSpecularPower: { value: 16.0 },
                    uSpecularIntensity: { value: 0.2 },
                    uDiffuseStrength: { value: 0.9 },
                    uShadowIntensity: { value: 0.4 },
                    uAmbientStrength: { value: 0.35 },
                    uRimThreshold: { value: 0.5 },
                    uRimAmount: { value: 0.6 },
                    uRimColor: { value: new THREE.Color(0x6699cc) },
                    uTexture: { value: null },
                    uUseTexture: { value: false }
                }),
                vertexShader: vertexShader,
                fragmentShader: fragmentShader,
                lights: true,
                fog:true,
            });

            const leftSphere = new THREE.Mesh(sphereGeometry, leftToonMaterial);
            const rightSphere = new THREE.Mesh(sphereGeometry, leftToonMaterial);

            leftSphere.castShadow = true;
            rightSphere.castShadow = true;

            customMaterials.push(leftToonMaterial);
            customMaterials.push(leftToonMaterial);

            if (leftHandBone) {
                leftHandBone.add(leftSphere);
                console.log('[Fox Scene] Added left hand sphere (red) with custom shader');
            } else {
                // 左手位置（X轴负方向）
                leftSphere.position.set(-1, 2, 0);
                scene.add(leftSphere);
                console.log('[Fox Scene] Left hand bone not found, sphere placed at left position');
            }

            if (rightHandBone) {
                rightHandBone.add(rightSphere);
                console.log('[Fox Scene] Added right hand sphere (blue) with custom shader');
            } else {
                // 右手位置（X轴正方向）
                rightSphere.position.set(1, 2, 0);
                scene.add(rightSphere);
                console.log('[Fox Scene] Right hand bone not found, sphere placed at right position');
            }

        } else {
            console.error('[Fox Scene] Failed to load fox model');
        }

        const groundGeometry = new THREE.PlaneGeometry(20, 20);
        const groundMaterial = new THREE.MeshToonMaterial({
            color: 0x8bc34a,
            gradientMap: createGradientMap()
        });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        scene.add(ground);

        const gridHelper = new THREE.GridHelper(20, 20, 0x666666, 0x888888);
        scene.add(gridHelper);

        const axesHelper = new THREE.AxesHelper(5);
        scene.add(axesHelper);

        const handleResize = () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        };
        window.addEventListener('resize', handleResize);

        // 渲染循环
        const animate = () => {
            animationFrameId = requestAnimationFrame(animate);

            if (mixer && clock) {
                const delta = clock.getDelta();
                mixer.update(delta);
            }

            // ✅ 修复：更新光照方向（转换到视图空间，使光照不随相机旋转）
            const time = Date.now() * 0.001;
            let cos = Math.cos(time);
            let sin = Math.sin(time);
            directionalLight.position.set(cos * 5, 5, sin * 5);

            customMaterials.forEach(material => {
                if (material.uniforms.uLightDirection) {
                    // 计算世界空间中的光照方向（从光源指向场景中心）
                    const worldLightDir = new THREE.Vector3().subVectors(
                        new THREE.Vector3(0, 0, 0),  // 目标点（场景中心）
                        directionalLight.position     // 光源位置
                    ).normalize();

                    // 转换到视图空间（使用相机的视图矩阵的法线矩阵部分）
                    const viewLightDir = worldLightDir.clone().transformDirection(camera.matrixWorldInverse);
                    material.uniforms.uLightColor.value.copy(directionalLight.color);
                    material.uniforms.uLightDirection.value.copy(viewLightDir);
                }
            });

            controls.update();
            renderer.render(scene, camera);
        };
        animate();

        console.log('[Fox Scene] ✨ Scene setup complete with optimized shader!');

        cleanupFunction = () => {
            console.log('[Fox Scene] Cleaning up resources...');

            if (animationFrameId !== null) {
                cancelAnimationFrame(animationFrameId);
                animationFrameId = null;
            }

            window.removeEventListener('resize', handleResize);

            customMaterials.forEach(material => {
                material.dispose();
            });
            customMaterials.length = 0;

            controls.dispose();
            renderer.dispose();
            groundMaterial.dispose();
            skyboxMaterial.dispose(); // 清理天空盒材质

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

            console.log('[Fox Scene] Cleanup complete!');
        };
    },
    onExit: async () => {
        console.log('[Fox Scene] Exiting scene...');
        if (cleanupFunction) {
            cleanupFunction();
            cleanupFunction = null;
        }
    }
});

function createGradientMap(): THREE.DataTexture {
    const colors = new Uint8Array([
        70, 70, 70,
        100, 100, 100,
        150, 150, 150,
        255, 255, 255
    ]);

    const gradientMap = new THREE.DataTexture(
        colors,
        4,
        1,
        THREE.RGBFormat
    );
    gradientMap.needsUpdate = true;

    return gradientMap;
}

export function startFoxScene() {
    console.log('Starting Fox Scene with Optimized Toon Shader...');
    return foxScene();
}