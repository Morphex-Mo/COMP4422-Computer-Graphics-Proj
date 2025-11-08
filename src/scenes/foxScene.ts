/**
 * Fox Scene - 展示GLTF模型加载（日式动漫风格 + 骨骼动画支持）
 * 优化版：减少陶瓷感，增强柔和度
 */
import * as THREE from 'three';
import { defineScene } from '../core';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

/**
 * 日式动漫风格Shader（优化版 - 减少陶瓷感）
 */
const animeToonShader = {
    vertexShader: `
        #include <common>
        #include <normal_pars_vertex>
        #ifdef USE_SKINNING
            #include <skinning_pars_vertex>
        #endif
        
        #ifdef USE_MORPHTARGETS
            #include <morphtarget_pars_vertex>
        #endif
        varying vec3 vViewPosition;
        varying vec2 vUv;
        #include <envmap_pars_vertex>
        #include <shadowmap_pars_vertex>
        void main() {
            vUv = uv;
            
            // 初始化位置和法线
            vec3 transformed = vec3(position);
            vec3 objectNormal = vec3(normal);
            
            #ifdef USE_MORPHTARGETS
                // 应用Morph Targets
                #include <morphtarget_vertex>
                #include <morphnormal_vertex>
            #endif
            
            #ifdef USE_SKINNING
                // 应用骨骼动画变换
                #include <skinbase_vertex>
                #include <skinning_vertex>
                #include <skinnormal_vertex>
            #endif
            
            // 将法线转换到视图空间
            vNormal = normalize(normalMatrix * objectNormal);
            
            // 计算顶点在视图空间中的位置
            vec4 mvPosition = modelViewMatrix * vec4(transformed, 1.0);
            vViewPosition = -mvPosition.xyz;
            
            
            gl_Position = projectionMatrix * mvPosition;
            #include <worldpos_vertex>
            #include <defaultnormal_vertex>
            #include <shadowmap_vertex>
            #include <envmap_vertex>
        }
    `,

    fragmentShader: `
        #include <common>
        #include <packing>
        #include <lights_pars_begin>
        #include <normal_pars_fragment>
        #include <envmap_pars_fragment>
        #include <shadowmap_pars_fragment>
        #include <shadowmask_pars_fragment>
        
        uniform vec3 uColor;
        uniform vec3 uLightDirection;
        uniform vec3 uLightColor;
        uniform float uShadowThreshold;
        uniform float uShadowSmoothness;
        uniform float uSpecularThreshold;
        uniform float uSpecularSmoothness;
        uniform float uSpecularPower;
        uniform float uDiffuseStrength;
        uniform float uRimThreshold;
        uniform float uRimAmount;
        uniform vec3 uRimColor;
        uniform sampler2D uTexture;
        uniform bool uUseTexture;
        uniform float uShadowIntensity;
        uniform float uAmbientStrength; // 新增：环境光强度
        uniform float uSpecularIntensity; // 新增：高光强度
        
        varying vec3 vViewPosition;
        varying vec2 vUv;
        
        // 自定义阴影计算函数
        float getAnimeShadow() {
            float shadow = 1.0;

            #ifdef USE_SHADOWMAP
            #if NUM_DIR_LIGHT_SHADOWS > 0
            shadow = getShadowMask();
            #endif
            #endif

            return mix(uShadowIntensity, 1.0, shadow);
        }

        // 平滑阶跃函数 - 减少硬边陶瓷感
        float smoothAnimeStep(float edge, float smoothness, float x) {
            return smoothstep(edge - smoothness, edge + smoothness, x);
        }

        // 多级柔和阶跃函数
        float multiSmoothStep(float threshold1, float threshold2, float smoothness, float x) {
            if (x > threshold2) {
                return smoothstep(threshold2 - smoothness, threshold2 + smoothness, x);
            } else if (x > threshold1) {
                return mix(0.5, 0.8, smoothstep(threshold1 - smoothness, threshold1 + smoothness, x));
            } else {
                return mix(0.3, 0.5, smoothstep(threshold1 - smoothness * 2.0, threshold1, x));
            }
        }

        void main() {
            vec3 normal = normalize(vNormal);
            vec3 viewDir = normalize(vViewPosition);

            // 光照方向（从物体指向光源）
            vec3 lightDir = normalize(-uLightDirection);
            
            // 基础颜色（纹理或纯色）
            vec3 baseColor = uColor;
            if (uUseTexture) {
                vec4 texColor = texture2D(uTexture, vUv);
                baseColor *= texColor.rgb;
            }
            
            // 获取阴影值
            float shadow = getAnimeShadow();

            // 漫反射光照 - 使用柔和的多级阶跃
            float NdotL = dot(normal, lightDir);
            
            // 使用更柔和的光照计算，减少硬边
            float lightIntensity = multiSmoothStep(
                uShadowThreshold - uShadowSmoothness,
                uShadowThreshold + uShadowSmoothness,
                0.1, // 增加平滑度
                NdotL
            );

            // 应用阴影
            lightIntensity *= shadow;
            
            // 应用漫反射强度控制
            vec3 diffuse = baseColor * uLightColor * lightIntensity * uDiffuseStrength;
            
            // 高光 - 减少陶瓷感
            vec3 halfDir = normalize(lightDir + viewDir);
            float NdotH = max(dot(normal, halfDir), 0.0);

            // 使用更柔和的高光计算
            float specularBase = pow(NdotH, uSpecularPower);
            float specularIntensity = smoothAnimeStep(
                uSpecularThreshold, 
                uSpecularSmoothness * 2.0, // 增加高光柔和度
                specularBase
            ) * lightIntensity * uSpecularIntensity; // 添加强度控制
            
            // 高光颜色更接近基础色，减少塑料感
            vec3 specular = mix(baseColor * 0.5, vec3(1.0), 0.3) * specularIntensity * 0.4;

            // 边缘光 - 更柔和的边缘效果
            float rimDot = 1.0 - dot(viewDir, normal);
            float rimIntensity = rimDot * pow(max(NdotL, 0.0), uRimThreshold);
            rimIntensity = smoothAnimeStep(uRimAmount, 0.1, rimIntensity) * lightIntensity;
            vec3 rim = uRimColor * rimIntensity * 0.3; // 降低边缘光强度
            
            // 环境光 - 增强环境光，减少死黑区域
            vec3 ambient = baseColor * mix(uAmbientStrength, uAmbientStrength * 1.5, shadow);
            
            // 组合所有光照
            vec3 finalColor = ambient + diffuse + specular + rim;
            
            gl_FragColor = vec4(finalColor, 1.0);
        }
    `
};

/**
 * 创建动漫风格材质（优化参数）
 */
function createAnimeToonMaterial(originalMaterial: THREE.Material, mesh: THREE.SkinnedMesh | THREE.Mesh): THREE.ShaderMaterial {
    const material = originalMaterial as any;

    const color = material.color || new THREE.Color(0xffffff);
    const map = material.map || null;

    const uniforms = THREE.UniformsUtils.merge([
        THREE.UniformsLib.common,
        THREE.UniformsLib.lights,
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
        vertexShader: animeToonShader.vertexShader,
        fragmentShader: animeToonShader.fragmentShader,
        lights: true,
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
        }
    },
    onLoadProgress: (loaded, total, percentage) => {
        console.log(`[Fox Scene] Loading progress: ${percentage}% (${loaded}/${total})`);
    },
    main: async (resources) => {
        console.log('[Fox Scene] All resources loaded!');
        console.log('[Fox Scene] Starting scene with Optimized Anime Toon Shader...');

        let animationFrameId: number | null = null;
        let mixer: THREE.AnimationMixer | null = null;
        let clock: THREE.Clock | null = null;
        const customMaterials: THREE.ShaderMaterial[] = [];

        const foxGltf = resources.get('fox');
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0xffd7a8);

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
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(ambientLight);

        // 调整主光源位置，使其更自然
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.9);
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

            fox.traverse((child: any) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;

                    const toonMaterial = createAnimeToonMaterial(child.material, child);
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
                    uColor: { value: new THREE.Color(0xff0000) },
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
                }),
                vertexShader: animeToonShader.vertexShader,
                fragmentShader: animeToonShader.fragmentShader,
                lights: true
            });

            const rightToonMaterial = new THREE.ShaderMaterial({
                uniforms: THREE.UniformsUtils.clone({
                    ...THREE.UniformsLib.common,
                    ...THREE.UniformsLib.lights,
                    uColor: { value: new THREE.Color(0x0000ff) },
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
                }),
                vertexShader: animeToonShader.vertexShader,
                fragmentShader: animeToonShader.fragmentShader,
                lights: true
            });

            const leftSphere = new THREE.Mesh(sphereGeometry, leftToonMaterial);
            const rightSphere = new THREE.Mesh(sphereGeometry, rightToonMaterial);

            leftSphere.castShadow = true;
            rightSphere.castShadow = true;

            customMaterials.push(leftToonMaterial);
            customMaterials.push(rightToonMaterial);

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

            // ✅ 修复：正确更新光照方向
            customMaterials.forEach(material => {
                if (material.uniforms.uLightDirection) {
                    let time = Date.now() * 0.1*3.14159/180;
                    let cos = Math.cos(time);
                    let sin = Math.sin(time);
                    directionalLight.position.set(cos, 1, sin);
                    // 光照方向应该是从光源指向场景中心的方向
                    const lightDir = new THREE.Vector3().subVectors(
                        new THREE.Vector3(0, 0, 0),  // 目标点（场景中心）
                        directionalLight.position     // 光源位置
                    ).normalize();
                    material.uniforms.uLightDirection.value.copy(lightDir);
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