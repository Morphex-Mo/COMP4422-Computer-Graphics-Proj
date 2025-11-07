/**
 * 使用共享相机和渲染器配置的场景示例
 */

import * as THREE from 'three';
import { defineScene } from '../core/SceneLoader';
import {
    GlobalSceneUtils,
    SceneEnvironmentPresets,
    applySceneEnvironment
} from '../core/SceneConfig';

/**
 * 初始化全局配置（在应用启动时调用一次）
 */
export function initializeGlobalConfig() {
    GlobalSceneUtils.initializeWithPresets('default', 'highQuality');
    console.log('[GlobalConfig] Initialized with default camera and high quality renderer');
}

/**
 * 场景1 - 使用共享相机和渲染器
 */
export const sharedScene1 = defineScene({
    id: 'shared_scene_1',
    name: '共享配置场景 1',
    resources: {
        // 可以添加资源
    },
    main: async (resources) => {
        console.log('[SharedScene1] Starting with shared camera and renderer...');

        // 创建场景
        const scene = new THREE.Scene();

        // 应用预设环境
        applySceneEnvironment(scene, SceneEnvironmentPresets.default);

        // 获取全局相机和渲染器
        const camera = GlobalSceneUtils.getCamera();
        const renderer = GlobalSceneUtils.getRenderer();

        // 重置相机到初始位置
        GlobalSceneUtils.resetCamera();

        // 将渲染器附加到容器
        GlobalSceneUtils.attachToContainer('app');

        // 添加一些内容
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshStandardMaterial({ color: 0x00ff88 });
        const cube = new THREE.Mesh(geometry, material);
        scene.add(cube);

        // 添加地面
        const groundGeometry = new THREE.PlaneGeometry(20, 20);
        const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x555555 });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        scene.add(ground);

        // 动画循环
        function animate() {
            requestAnimationFrame(animate);
            cube.rotation.x += 0.01;
            cube.rotation.y += 0.01;
            renderer.render(scene, camera);
        }
        animate();

        console.log('[SharedScene1] Scene initialized with shared config!');
    },
    onExit: () => {
        console.log('[SharedScene1] Exiting...');
    }
});

/**
 * 场景2 - 使用相同的共享相机和渲染器
 */
export const sharedScene2 = defineScene({
    id: 'shared_scene_2',
    name: '共享配置场景 2',
    resources: {},
    main: async (resources) => {
        console.log('[SharedScene2] Starting with shared camera and renderer...');

        // 创建场景
        const scene = new THREE.Scene();

        // 应用不同的环境预设
        applySceneEnvironment(scene, SceneEnvironmentPresets.daylight);

        // 获取全局相机和渲染器（和场景1使用同一个）
        const camera = GlobalSceneUtils.getCamera();
        const renderer = GlobalSceneUtils.getRenderer();

        // 重置相机到初始位置
        GlobalSceneUtils.resetCamera();

        // 将渲染器附加到容器
        GlobalSceneUtils.attachToContainer('app');

        // 添加不同的内容
        const geometry = new THREE.TorusKnotGeometry(1, 0.3, 100, 16);
        const material = new THREE.MeshStandardMaterial({
            color: 0xff6600,
            metalness: 0.5,
            roughness: 0.2
        });
        const torusKnot = new THREE.Mesh(geometry, material);
        scene.add(torusKnot);

        // 添加地面
        const groundGeometry = new THREE.PlaneGeometry(20, 20);
        const groundMaterial = new THREE.MeshStandardMaterial({
            color: 0x88cc88,
            metalness: 0.1,
            roughness: 0.8
        });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        scene.add(ground);

        // 动画循环
        function animate() {
            requestAnimationFrame(animate);
            torusKnot.rotation.x += 0.005;
            torusKnot.rotation.y += 0.01;
            renderer.render(scene, camera);
        }
        animate();

        console.log('[SharedScene2] Scene initialized with shared config!');
        console.log('[SharedScene2] Notice: Same camera perspective as Scene 1!');
    },
    onExit: () => {
        console.log('[SharedScene2] Exiting...');
    }
});

/**
 * 场景3 - 使用共享配置，不同的环境
 */
export const sharedScene3 = defineScene({
    id: 'shared_scene_3',
    name: '共享配置场景 3 - 夜晚',
    resources: {},
    main: async (resources) => {
        console.log('[SharedScene3] Starting with shared camera and renderer...');

        const scene = new THREE.Scene();

        // 应用夜晚环境
        applySceneEnvironment(scene, SceneEnvironmentPresets.night);

        const camera = GlobalSceneUtils.getCamera();
        const renderer = GlobalSceneUtils.getRenderer();

        GlobalSceneUtils.resetCamera();
        GlobalSceneUtils.attachToContainer('app');

        // 添加发光球体
        const sphereGeometry = new THREE.SphereGeometry(1, 32, 32);
        const sphereMaterial = new THREE.MeshStandardMaterial({
            color: 0x00aaff,
            emissive: 0x0066aa,
            emissiveIntensity: 0.5
        });
        const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
        sphere.position.y = 1;
        scene.add(sphere);

        // 添加点光源
        const pointLight = new THREE.PointLight(0x00aaff, 2, 10);
        pointLight.position.copy(sphere.position);
        scene.add(pointLight);

        // 添加地面
        const groundGeometry = new THREE.PlaneGeometry(20, 20);
        const groundMaterial = new THREE.MeshStandardMaterial({
            color: 0x222233,
            metalness: 0.8,
            roughness: 0.3
        });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        scene.add(ground);

        // 动画循环
        function animate() {
            requestAnimationFrame(animate);
            sphere.position.x = Math.sin(Date.now() * 0.001) * 3;
            sphere.position.z = Math.cos(Date.now() * 0.001) * 3;
            pointLight.position.copy(sphere.position);
            renderer.render(scene, camera);
        }
        animate();

        console.log('[SharedScene3] Scene initialized with night environment!');
    },
    onExit: () => {
        console.log('[SharedScene3] Exiting...');
    }
});

// 导出便捷启动函数
export function startSharedScene1() {
    console.log('Starting Shared Scene 1...');
    return sharedScene1();
}

export function startSharedScene2() {
    console.log('Starting Shared Scene 2...');
    return sharedScene2();
}

export function startSharedScene3() {
    console.log('Starting Shared Scene 3...');
    return sharedScene3();
}

