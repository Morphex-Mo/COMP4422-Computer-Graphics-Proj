/**
 * Fox Scene - 展示GLTF模型加载
 */
import * as THREE from 'three';
import { defineScene } from '../core';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
/**
 * Fox场景定义
 */
export const foxScene = defineScene({
    id: 'foxScene',
    name: 'Fox Model Scene',
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
        console.log('[Fox Scene] Starting scene...');

        // 获取加载的fox模型
        const foxGltf = resources.get('fox');

        // 创建场景
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x87ceeb); // 天蓝色背景

        // 创建相机
        const camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        camera.position.set(5, 5, 5);
        camera.lookAt(0, 0, 0);

        // 创建渲染器
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        const appElement = document.getElementById('app');
        if (appElement) {
            // 清空容器
            appElement.innerHTML = '';
            appElement.appendChild(renderer.domElement);
        }

        // 添加轨道控制器
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.target.set(0, 1, 0);
        controls.update();

        // 添加环境光
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(ambientLight);

        // 添加方向光
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10, 20, 10);
        directionalLight.castShadow = true;
        directionalLight.shadow.camera.left = -10;
        directionalLight.shadow.camera.right = 10;
        directionalLight.shadow.camera.top = 10;
        directionalLight.shadow.camera.bottom = -10;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        scene.add(directionalLight);
        console.log(foxGltf);
        // 添加fox模型到场景
        if (foxGltf && foxGltf.scene) {
            const fox = foxGltf.scene;

            // 调整fox的位置和大小
            fox.position.set(0, 2, 0);
            fox.scale.set(1, 1, 1); // 根据实际大小调整

            // 启用阴影
            fox.traverse((child: any) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });

            scene.add(fox);
            console.log('[Fox Scene] Fox model added to scene');

            // 如果模型包含动画，播放第一个动画
            /*if (foxGltf.animations && foxGltf.animations.length > 0) {
                const mixer = new THREE.AnimationMixer(fox);
                const action = mixer.clipAction(foxGltf.animations[0]);
                action.play();
                console.log(`[Fox Scene] Playing animation: ${foxGltf.animations[0].name}`);

                // 在渲染循环中更新动画
                const clock = new THREE.Clock();
                const animate = () => {
                    requestAnimationFrame(animate);

                    const delta = clock.getDelta();
                    mixer.update(delta);

                    controls.update();
                    renderer.render(scene, camera);
                };
                animate();
            } else */{
                // 没有动画时的普通渲染循环
                const animate = () => {
                    requestAnimationFrame(animate);
                    controls.update();
                    renderer.render(scene, camera);
                };
                animate();
            }
        } else {
            console.error('[Fox Scene] Failed to load fox model');
        }

        // 创建地面
        const groundGeometry = new THREE.PlaneGeometry(20, 20);
        const groundMaterial = new THREE.MeshStandardMaterial({
            color: 0x3a7d44,
            roughness: 0.8,
            metalness: 0.2
        });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        scene.add(ground);

        // 添加网格辅助线
        const gridHelper = new THREE.GridHelper(20, 20);
        scene.add(gridHelper);

        // 添加坐标轴辅助线
        const axesHelper = new THREE.AxesHelper(5);
        scene.add(axesHelper);

        // 窗口大小调整处理
        const handleResize = () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        };
        window.addEventListener('resize', handleResize);

        console.log('[Fox Scene] Scene setup complete!');
    },
    onExit: () => {
        console.log('[Fox Scene] Exiting scene...');
        // 清理资源
        window.removeEventListener('resize', () => {});
    }
});

/**
 * 启动Fox场景的便捷函数
 */
export function startFoxScene() {
    console.log('Starting Fox Scene...');
    return foxScene();
}

