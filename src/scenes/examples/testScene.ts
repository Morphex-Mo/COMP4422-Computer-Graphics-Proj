/**
 * 简单的资源加载测试示例
 */

import { defineScene, createLoadingUI } from '../../core';
import * as THREE from 'three';

/**
 * 简单测试场景 - 不需要任何外部资源文件
 */
export const simpleTestScene = defineScene({
    id: 'simple_test',
    name: '简单测试场景',
    resources: {
        // 空资源列表 - 用于测试不加载任何资源的情况
    },
    onLoadProgress: (loaded, total, percentage) => {
        console.log(`[SimpleTest] 加载进度: ${percentage}%`);
    },
    main: async (resources) => {
        console.log('[SimpleTest] 场景开始！');
        console.log('[SimpleTest] 已加载资源数量:', resources.size);

        // 创建基础Three.js场景
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x1a1a2e);

        // 创建相机
        const camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        camera.position.set(0, 3, 8);
        camera.lookAt(0, 0, 0);

        // 创建渲染器
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);

        const appElement = document.getElementById('app');
        if (appElement) {
            appElement.innerHTML = '';
            appElement.appendChild(renderer.domElement);
        }

        // 添加光源
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(5, 10, 7);
        scene.add(directionalLight);

        // 创建简单的几何体
        const geometries = [
            new THREE.BoxGeometry(1, 1, 1),
            new THREE.SphereGeometry(0.7, 32, 32),
            new THREE.ConeGeometry(0.7, 1.5, 32),
            new THREE.TorusGeometry(0.6, 0.2, 16, 100),
            new THREE.TetrahedronGeometry(0.8)
        ];

        const colors = [0x00ff88, 0xff0088, 0x0088ff, 0xffaa00, 0xff00ff];

        const meshes: THREE.Mesh[] = [];

        for (let i = 0; i < 5; i++) {
            const geometry = geometries[i];
            const material = new THREE.MeshStandardMaterial({
                color: colors[i],
                metalness: 0.3,
                roughness: 0.4
            });
            const mesh = new THREE.Mesh(geometry, material);

            // 圆形排列
            const angle = (i / 5) * Math.PI * 2;
            const radius = 3;
            mesh.position.set(
                Math.cos(angle) * radius,
                0,
                Math.sin(angle) * radius
            );

            scene.add(mesh);
            meshes.push(mesh);
        }

        // 添加网格地面
        const gridHelper = new THREE.GridHelper(10, 10, 0x444444, 0x222222);
        scene.add(gridHelper);

        // 添加坐标轴辅助
        const axesHelper = new THREE.AxesHelper(5);
        scene.add(axesHelper);

        // 动画循环
        let time = 0;
        function animate() {
            requestAnimationFrame(animate);

            time += 0.01;

            // 旋转所有几何体
            meshes.forEach((mesh, index) => {
                mesh.rotation.x += 0.01;
                mesh.rotation.y += 0.01;

                // 添加上下浮动效果
                const offset = index * (Math.PI * 2 / 5);
                mesh.position.y = Math.sin(time + offset) * 0.5;
            });

            renderer.render(scene, camera);
        }
        animate();

        // 窗口大小调整
        function onWindowResize() {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        }
        window.addEventListener('resize', onWindowResize);

        // 添加控制提示
        const infoDiv = document.createElement('div');
        infoDiv.style.cssText = `
            position: fixed;
            top: 20px;
            left: 20px;
            color: white;
            font-family: Arial, sans-serif;
            font-size: 14px;
            background: rgba(0, 0, 0, 0.7);
            padding: 15px;
            border-radius: 5px;
            pointer-events: none;
        `;
        infoDiv.innerHTML = `
            <h3 style="margin: 0 0 10px 0;">简单测试场景</h3>
            <p style="margin: 5px 0;">✓ 场景加载成功</p>
            <p style="margin: 5px 0;">✓ Three.js 正常运行</p>
            <p style="margin: 5px 0;">✓ 动画系统正常</p>
        `;
        appElement?.appendChild(infoDiv);

        console.log('[SimpleTest] 场景初始化完成！');
    },
    onExit: () => {
        console.log('[SimpleTest] 退出场景');
    }
});

/**
 * 启动简单测试场景
 */
export function startSimpleTest() {
    console.log('=== 启动简单测试场景 ===');
    return simpleTestScene();
}

/**
 * 带加载UI的测试场景
 */
export function startTestWithUI() {
    console.log('=== 启动带UI的测试场景 ===');

    const loadingUI = createLoadingUI('app');

    const testScene = defineScene({
        id: 'test_with_ui',
        name: '带UI测试场景',
        resources: {
            // 空资源 - 快速测试
        },
        onLoadProgress: (loaded, total, percentage) => {
            loadingUI.update(percentage);
        },
        main: async (_resources) => {
            // 模拟一点延迟，让用户看到加载完成的效果
            await new Promise(resolve => setTimeout(resolve, 500));
            loadingUI.remove();

            // 启动相同的测试场景
            await simpleTestScene.call(null);
        }
    });

    return testScene();
}

