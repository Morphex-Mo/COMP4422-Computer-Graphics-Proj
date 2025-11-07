/**
 * 场景加载器使用示例
 */

import * as THREE from 'three';
import { defineScene, createLevelLoader, createLoadingUI } from '../core/SceneLoader';

/**
 * 示例1: 使用 defineScene 定义场景
 */
export const level1 = defineScene({
    id: 'level1',
    name: '第一关 - 基础场景',
    resources: {
        textures: {
            'groundTexture': '/textures/ground.jpg',
            'wallTexture': '/textures/wall.jpg'
        },
        // gltfModels: {
        //     'player': '/models/player.gltf',
        //     'enemy': '/models/enemy.gltf'
        // },
        // shaders: {
        //     'customVertex': '/shaders/custom.vert',
        //     'customFragment': '/shaders/custom.frag'
        // }
    },
    onLoadProgress: (loaded, total, percentage) => {
        console.log(`[Level1] Loading progress: ${percentage}% (${loaded}/${total})`);
    },
    main: async (resources) => {
        console.log('[Level1] All resources loaded!');
        console.log('[Level1] Starting scene...');

        // 获取加载的资源
        const groundTexture = resources.get('groundTexture');
        const wallTexture = resources.get('wallTexture');

        // 创建场景
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x1a1a2e);

        // 创建相机
        const camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        camera.position.set(0, 5, 10);
        camera.lookAt(0, 0, 0);

        // 创建渲染器
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);

        const appElement = document.getElementById('app');
        if (appElement) {
            // 清空容器
            appElement.innerHTML = '';
            appElement.appendChild(renderer.domElement);
        }

        // 添加光源
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(5, 10, 5);
        scene.add(directionalLight);

        // 如果纹理加载成功，创建带纹理的地面
        if (groundTexture) {
            const geometry = new THREE.PlaneGeometry(20, 20);
            const material = new THREE.MeshStandardMaterial({
                map: groundTexture
            });
            const ground = new THREE.Mesh(geometry, material);
            ground.rotation.x = -Math.PI / 2;
            scene.add(ground);
        } else {
            // 否则创建简单的地面
            const geometry = new THREE.PlaneGeometry(20, 20);
            const material = new THREE.MeshStandardMaterial({
                color: 0x555555
            });
            const ground = new THREE.Mesh(geometry, material);
            ground.rotation.x = -Math.PI / 2;
            scene.add(ground);
        }

        // 添加一些立方体
        for (let i = 0; i < 5; i++) {
            const geometry = new THREE.BoxGeometry(1, 1, 1);
            const material = new THREE.MeshStandardMaterial({
                color: Math.random() * 0xffffff
            });
            const cube = new THREE.Mesh(geometry, material);
            cube.position.set(
                (Math.random() - 0.5) * 10,
                0.5,
                (Math.random() - 0.5) * 10
            );
            scene.add(cube);
        }

        // 动画循环
        function animate() {
            requestAnimationFrame(animate);
            renderer.render(scene, camera);
        }
        animate();

        // 窗口大小调整
        window.addEventListener('resize', () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        });

        console.log('[Level1] Scene initialized successfully!');
    },
    onExit: () => {
        console.log('[Level1] Exiting scene...');
        // 清理资源
    }
});

/**
 * 示例2: 使用 createLevelLoader 包装关卡函数
 */
export const level2 = createLevelLoader(
    {
        textures: {
            'skyTexture': '/textures/sky.jpg'
        },
        // cubeTextures: {
        //     'skybox': [
        //         '/textures/skybox/px.jpg',
        //         '/textures/skybox/nx.jpg',
        //         '/textures/skybox/py.jpg',
        //         '/textures/skybox/ny.jpg',
        //         '/textures/skybox/pz.jpg',
        //         '/textures/skybox/nz.jpg'
        //     ]
        // }
    },
    (resources) => {
        console.log('[Level2] Resources loaded:', resources);

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        const renderer = new THREE.WebGLRenderer({ antialias: true });

        renderer.setSize(window.innerWidth, window.innerHeight);
        const appElement = document.getElementById('app');
        if (appElement) {
            appElement.innerHTML = '';
            appElement.appendChild(renderer.domElement);
        }

        camera.position.z = 5;

        // 创建一些几何体
        const geometry = new THREE.TorusKnotGeometry(1, 0.3, 100, 16);
        const material = new THREE.MeshNormalMaterial();
        const torusKnot = new THREE.Mesh(geometry, material);
        scene.add(torusKnot);

        function animate() {
            requestAnimationFrame(animate);
            torusKnot.rotation.x += 0.01;
            torusKnot.rotation.y += 0.01;
            renderer.render(scene, camera);
        }
        animate();

        console.log('[Level2] Scene initialized!');
    },
    {
        id: 'level2',
        name: '第二关 - 高级场景',
        onProgress: (percentage) => {
            console.log(`[Level2] Loading: ${percentage}%`);
        }
    }
);

/**
 * 示例3: 带进度条的场景加载
 */
export const level3WithUI = defineScene({
    id: 'level3',
    name: '第三关 - 带UI进度条',
    resources: {
        textures: {
            'texture1': '/textures/texture1.jpg',
            'texture2': '/textures/texture2.jpg'
        }
    },
    onLoadProgress: (loaded, total, percentage) => {
        // 这个回调会自动更新UI
        console.log(`[Level3] Progress: ${percentage}%`);
    },
    main: async (resources) => {
        console.log('[Level3] Scene started with UI!');

        // 场景逻辑...
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x2a2a4e);

        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.z = 5;

        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);

        const appElement = document.getElementById('app');
        if (appElement) {
            appElement.innerHTML = '';
            appElement.appendChild(renderer.domElement);
        }

        // 添加一些内容
        const geometry = new THREE.SphereGeometry(1, 32, 32);
        const material = new THREE.MeshBasicMaterial({ color: 0x00ff88, wireframe: true });
        const sphere = new THREE.Mesh(geometry, material);
        scene.add(sphere);

        function animate() {
            requestAnimationFrame(animate);
            sphere.rotation.x += 0.005;
            sphere.rotation.y += 0.01;
            renderer.render(scene, camera);
        }
        animate();
    }
});

/**
 * 创建UI并加载带进度条的场景
 */
export function loadLevel3WithUI() {
    const loadingUI = createLoadingUI('app');

    const level = defineScene({
        id: 'level3_ui',
        name: '第三关 - 带UI',
        resources: {
            textures: {
                'tex1': '/textures/t1.jpg',
                'tex2': '/textures/t2.jpg',
                'tex3': '/textures/t3.jpg'
            }
        },
        onLoadProgress: (loaded, total, percentage) => {
            loadingUI.update(percentage);
        },
        main: async (resources) => {
            loadingUI.remove();
            console.log('[Level3 UI] Scene loaded!');

            // 初始化场景...
        }
    });

    return level();
}

/**
 * 导出便捷函数来启动不同关卡
 */
export function startLevel1() {
    console.log('Starting Level 1...');
    return level1();
}

export function startLevel2() {
    console.log('Starting Level 2...');
    return level2();
}

export function startLevel3() {
    console.log('Starting Level 3...');
    return loadLevel3WithUI();
}

