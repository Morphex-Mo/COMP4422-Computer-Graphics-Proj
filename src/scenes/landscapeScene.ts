import { defineScene } from '../core';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
const NoiseModule = require('noisejs');
let simpleTestCleanup = null;
let animationFrameId=null;

export const landscapeScene = defineScene({
    id: 'landscape_scene',
    name: '环境场景',
    resources: {
        gltfModels: {
            'hill': './assets/hill-tree/scene.gltf'
        },
    },
    onLoadProgress: (loaded, total, percentage) => {
        console.log(`[landscapeScene] 加载进度: ${percentage}%`);
    },
    main: async (resources) => {
        console.log('[landscapeScene] 场景开始！');
        console.log('[landscapeScene] 已加载资源数量:', resources.size);
        
        const hillGltf = resources.get('hill');

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

        // 控制器
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;

        // 添加光源
        const ambientLight = new THREE.AmbientLight(0xffffff, 1);
        scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(5, 10, 7);
        scene.add(directionalLight);

        //导入模型
        const hillBox = new THREE.Box3();
        if (hillGltf && hillGltf.scene) {
            const hill = hillGltf.scene;
            hillBox.setFromObject(hill);
            hillBox.min[1] = -Infinity;
            hillBox.max[1] = Infinity;
            scene.add(hill);
        }

        /**生成山地
        size  地形大小
        segments 细分段数
        heightScale 高度缩放因子
        noiseScale 噪声缩放因子
        */
        function createMountain(size:number , segments:number, heightScale:number, noiseScale:number) {

            // 创建平面几何体作为地形基础
            const geometry = new THREE.PlaneGeometry(size, size, segments, segments);
            geometry.rotateX(-Math.PI / 2);
            
            // 使用柏林噪声修改顶点高度
            const vertices = geometry.attributes.position.array;
            for (let i = 0; i < vertices.length; i += 3) {
                const x = vertices[i];
                const z = vertices[i + 2];
                const y = vertices[i + 1];
                const vector = new THREE.Vector3(x,y,z);
                if(hillBox.containsPoint(vector)) continue;
                // 使用柏林噪声计算高度
                // 可以叠加多层噪声获得更复杂的地形
                const noise = new NoiseModule.Noise(Math.random());
                const height = (
                    noise.perlin2(x * noiseScale, z * noiseScale) * 1.0 +
                    noise.perlin2(x * noiseScale * 2, z * noiseScale * 2) * 0.3 +  // 降低高频权重
                    noise.perlin2(x * noiseScale * 4, z * noiseScale * 4) * 0.1   // 进一步降低高频影响
                ) * heightScale;
                
                vertices[i + 1] = height; // 设置Y轴高度
            }


            //平滑化
            const tempVertices = vertices.slice(); // 复制当前顶点数据
            
            for (let i = 0; i < vertices.length; i += 3) {
                // 计算当前顶点索引
                const idx = i / 3;
                const x = idx % (segments + 1);
                const y = Math.floor(idx / (segments + 1));
                
                // 只处理内部顶点，边界顶点不处理
                if (x > 0 && x < segments && y > 0 && y < segments) {
                    // 计算周围4个相邻顶点的索引
                    const neighbors = [
                        idx - 1,                // 左
                        idx + 1,                // 右
                        idx - (segments + 1),   // 上
                        idx + (segments + 1)    // 下
                    ];
                    
                    // 计算平均高度
                    let avgHeight = 0;
                    for (const n of neighbors) {
                        avgHeight += tempVertices[n * 3 + 1];
                    }
                    avgHeight /= neighbors.length;
                    
                    // 混合原始高度和平均高度（保留部分原始特征）
                    vertices[i + 1] = (vertices[i + 1] + avgHeight * 2) / 3;
                }
            }


            // 重新计算几何体的法向量，使光照正确
            geometry.computeVertexNormals();

            const material = new THREE.MeshPhongMaterial({
                color: 0x64694d,
                flatShading: false,
            });
            const land = new THREE.Mesh(geometry , material)
            land.position.y = -4;
            scene.add(land);
        }
        createMountain(200 , 30, 30 , 0.01);

        // 动画循环
        let time = 0;
        function animate() {
            requestAnimationFrame(animate);
            time += 0.01;

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

        console.log('[landscape] 场景初始化完成！');

        // 存储清理函数供onExit使用
        simpleTestCleanup = () => {
            console.log('[landscape] 清理资源...');

            // 停止渲染循环
            if (animationFrameId !== null) {
                cancelAnimationFrame(animationFrameId);
                animationFrameId = null;
            }

            // 移除事件监听器
            window.removeEventListener('resize', onWindowResize);

            // 清理Three.js资源
            renderer.dispose();

            // 清理几何体和材质
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

            // 清空场景
            while (scene.children.length > 0) {
                scene.remove(scene.children[0]);
            }

            // 清空DOM容器
            if (appElement) {
                appElement.innerHTML = '';
            }

            console.log('[landscape] 清理完成！');
        };
    },
    onExit: () => {
        console.log('[landscape] 退出场景');

        // 调用清理函数
        if (simpleTestCleanup) {
            simpleTestCleanup();
            simpleTestCleanup = null;
        }
    }
});

/**
 * 启动简单测试场景
 */
export function startlandscapeScene() {
    console.log('=== 启动环境场景 ===');
    return landscapeScene();
}
