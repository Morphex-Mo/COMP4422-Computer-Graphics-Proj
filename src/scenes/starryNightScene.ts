/**
 * Starry Night Scene - 专门用于观察和调试星空效果
 * 特性：
 * - 多种闪烁模式（随机、呼吸、脉冲）
 * - 实时参数调整（通过键盘控制）
 * - 性能监控
 */
import * as THREE from 'three';
import { defineScene } from '../core';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

interface StarConfig {
    count: number;
    minSize: number;
    maxSize: number;
    minSpeed: number;
    maxSpeed: number;
    minIntensity: number;
    maxIntensity: number;
}

// 添加流星接口
interface ShootingStar {
    mesh: THREE.Mesh;
    trail: THREE.Line;
    velocity: THREE.Vector3;
    lifetime: number;
    age: number;
    startPos: THREE.Vector3;
}

let cleanupFunction: (() => void) | null = null;

export const starryNightScene = defineScene({
    id: 'starryNightScene',
    name: 'Starry Night - Star Twinkle Demo',
    resources: {},
    onLoadProgress: (loaded, total, percentage) => {
        console.log(`[Starry Night] Loading: ${percentage}%`);
    },
    main: async () => {
        console.log('[Starry Night] Starting starry night scene...');
        
        let animationFrameId: number | null = null;
        const scene = new THREE.Scene();
        
        // 配置参数
        const config: StarConfig = {
            count: 8000,
            minSize: 0.8,
            maxSize: 4,
            minSpeed: 0.5,
            maxSpeed: 3.5,
            minIntensity: 0.3,
            maxIntensity: 1.0
        };
        
        // 流星数组
        const shootingStars: ShootingStar[] = [];
        const MAX_SHOOTING_STARS = 10;
        
        // 创建深邃的夜空背景
        const skyboxGeometry = new THREE.SphereGeometry(500, 32, 32);
        const skyboxMaterial = new THREE.ShaderMaterial({
            uniforms: {
                topColor: { value: new THREE.Color(0x000428) },    // 深蓝黑色
                bottomColor: { value: new THREE.Color(0x004e92) }, // 午夜蓝
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
        
        // ✨ 创建星星系统
        const starsGeometry = new THREE.BufferGeometry();
        const positions = new Float32Array(config.count * 3);
        const colors = new Float32Array(config.count * 3);
        const sizes = new Float32Array(config.count);
        const twinkleSpeed = new Float32Array(config.count);
        const twinklePhase = new Float32Array(config.count);
        const twinkleIntensity = new Float32Array(config.count);
        const twinkleMode = new Float32Array(config.count); // 0: 随机, 1: 呼吸, 2: 脉冲
        
        for (let i = 0; i < config.count; i++) {
            // 球形分布
            const radius = 300 + Math.random() * 150;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            
            positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
            positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
            positions[i * 3 + 2] = radius * Math.cos(phi);
            
            // 只在上半球
            if (positions[i * 3 + 1] < 0) {
                positions[i * 3 + 1] = Math.abs(positions[i * 3 + 1]);
            }
            
            // 星星颜色（模拟不同温度的恒星）
            const temp = Math.random();
            if (temp < 0.3) {
                // 蓝白色（高温）
                colors[i * 3] = 0.8 + Math.random() * 0.2;
                colors[i * 3 + 1] = 0.9 + Math.random() * 0.1;
                colors[i * 3 + 2] = 1.0;
            } else if (temp < 0.7) {
                // 白色（中温）
                const c = 0.9 + Math.random() * 0.1;
                colors[i * 3] = c;
                colors[i * 3 + 1] = c;
                colors[i * 3 + 2] = c;
            } else {
                // 橙黄色（低温）
                colors[i * 3] = 1.0;
                colors[i * 3 + 1] = 0.8 + Math.random() * 0.2;
                colors[i * 3 + 2] = 0.6 + Math.random() * 0.2;
            }
            
            // 星星属性
            sizes[i] = config.minSize + Math.random() * (config.maxSize - config.minSize);
            twinkleSpeed[i] = config.minSpeed + Math.random() * (config.maxSpeed - config.minSpeed);
            twinklePhase[i] = Math.random() * Math.PI * 2;
            twinkleIntensity[i] = config.minIntensity + Math.random() * (config.maxIntensity - config.minIntensity);
            twinkleMode[i] = Math.floor(Math.random() * 3); // 随机分配闪烁模式
        }
        
        starsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        starsGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        starsGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        starsGeometry.setAttribute('twinkleSpeed', new THREE.BufferAttribute(twinkleSpeed, 1));
        starsGeometry.setAttribute('twinklePhase', new THREE.BufferAttribute(twinklePhase, 1));
        starsGeometry.setAttribute('twinkleIntensity', new THREE.BufferAttribute(twinkleIntensity, 1));
        starsGeometry.setAttribute('twinkleMode', new THREE.BufferAttribute(twinkleMode, 1));
        
        const starsMaterial = new THREE.PointsMaterial({
            size: 3,
            vertexColors: true,
            transparent: true,
            opacity: 1.0,
            blending: THREE.AdditiveBlending,
            sizeAttenuation: true,
            map: createAdvancedStarTexture()
        });
        
        const stars = new THREE.Points(starsGeometry, starsMaterial);
        scene.add(stars);

        // ✨ 创建流星生成函数
        const createShootingStar = () => {
            if (shootingStars.length >= MAX_SHOOTING_STARS) {
                console.log('[Starry Night] Max shooting stars reached');
                return;
            }

            // 随机起始位置（在天空的上半部分）
            const startRadius = 350 + Math.random() * 100;
            const startTheta = Math.random() * Math.PI * 2;
            const startPhi = Math.random() * Math.PI * 0.3; // 上半球的上部

            const startPos = new THREE.Vector3(
                startRadius * Math.sin(startPhi) * Math.cos(startTheta),
                startRadius * Math.cos(startPhi),
                startRadius * Math.sin(startPhi) * Math.sin(startTheta)
            );

            // 流星本体（发光球体）
            const geometry = new THREE.SphereGeometry(2, 16, 16);
            const material = new THREE.MeshBasicMaterial({
                color: 0xffffff,
                transparent: true,
                opacity: 1.0,
                blending: THREE.AdditiveBlending
            });
            const mesh = new THREE.Mesh(geometry, material);
            mesh.position.copy(startPos);

            // 添加发光效果
            const glowGeometry = new THREE.SphereGeometry(4, 16, 16);
            const glowMaterial = new THREE.MeshBasicMaterial({
                color: 0x88ccff,
                transparent: true,
                opacity: 0.4,
                blending: THREE.AdditiveBlending
            });
            const glow = new THREE.Mesh(glowGeometry, glowMaterial);
            mesh.add(glow);

            scene.add(mesh);

            // 流星尾迹
            const trailPoints = [];
            for (let i = 0; i < 20; i++) {
                trailPoints.push(startPos.clone());
            }
            const trailGeometry = new THREE.BufferGeometry().setFromPoints(trailPoints);
            const trailMaterial = new THREE.LineBasicMaterial({
                color: 0xffffff,
                transparent: true,
                opacity: 0.8,
                blending: THREE.AdditiveBlending,
                linewidth: 2
            });
            const trail = new THREE.Line(trailGeometry, trailMaterial);
            scene.add(trail);

            // 速度方向（向下且略微倾斜）
            const velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 50,  // X方向随机
                -80 - Math.random() * 40,     // Y方向向下（快速）
                (Math.random() - 0.5) * 50   // Z方向随机
            );

            const shootingStar: ShootingStar = {
                mesh,
                trail,
                velocity,
                lifetime: 2.5 + Math.random() * 1.5, // 2.5-4秒生命周期
                age: 0,
                startPos: startPos.clone()
            };

            shootingStars.push(shootingStar);
            console.log(`[Starry Night] ⭐ 流星生成! 当前流星数: ${shootingStars.length}`);
        };

        // 相机设置
        const camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        camera.position.set(0, 5, 10);
        camera.lookAt(0, 0, 0);
        
        // 渲染器
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
        controls.autoRotate = true;
        controls.autoRotateSpeed = 0.5;
        
        // UI 信息显示
        const infoDiv = document.createElement('div');
        infoDiv.style.position = 'absolute';
        infoDiv.style.top = '10px';
        infoDiv.style.left = '10px';
        infoDiv.style.color = 'white';
        infoDiv.style.fontFamily = 'monospace';
        infoDiv.style.fontSize = '14px';
        infoDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        infoDiv.style.padding = '10px';
        infoDiv.style.borderRadius = '5px';
        infoDiv.innerHTML = `
            <strong>🌟 Starry Night Demo</strong><br>
            Stars: ${config.count}<br>
            <br>
            <strong>⌨️ 控制说明：</strong><br>
            [Space] 切换自动旋转<br>
            [R] 随机化星星属性<br>
            <br>
            <strong>✨ 闪烁模式：</strong><br>
            [A] 随机复杂闪烁<br>
            [B] 呼吸效果（平滑）<br>
            [C] 脉冲效果（快速）<br>
            [D] 强烈闪烁（超亮）<br>
            <br>
            <strong>⭐ 流星效果：</strong><br>
            [M] 生成一颗流星<br>
            [N] 生成流星雨（5颗）<br>
            <br>
            <span id="current-mode" style="color: #00ff88;">当前模式: 混合模式</span><br>
            <span id="shooting-star-count" style="color: #88ccff;">流星数量: 0</span>
        `;
        appElement?.appendChild(infoDiv);
        
        // 键盘控制
        const handleKeyPress = (e: KeyboardEvent) => {
            const modeSpan = document.getElementById('current-mode');
            
            if (e.code === 'Space') {
                controls.autoRotate = !controls.autoRotate;
                console.log('[Starry Night] Auto-rotate:', controls.autoRotate);
            } else if (e.code === 'KeyR') {
                // 随机化星星属性
                for (let i = 0; i < config.count; i++) {
                    twinkleSpeed[i] = config.minSpeed + Math.random() * (config.maxSpeed - config.minSpeed);
                    twinklePhase[i] = Math.random() * Math.PI * 2;
                    twinkleIntensity[i] = config.minIntensity + Math.random() * (config.maxIntensity - config.minIntensity);
                }
                starsGeometry.getAttribute('twinkleSpeed').needsUpdate = true;
                starsGeometry.getAttribute('twinklePhase').needsUpdate = true;
                starsGeometry.getAttribute('twinkleIntensity').needsUpdate = true;
                console.log('[Starry Night] Randomized star properties');
            } else if (e.code === 'KeyA') {
                // 模式 A: 随机复杂闪烁
                twinkleMode.fill(0);
                starsGeometry.getAttribute('twinkleMode').needsUpdate = true;
                if (modeSpan) modeSpan.textContent = '当前模式: A - 随机复杂闪烁';
                console.log('[Starry Night] Mode A: Random Complex Twinkle');
            } else if (e.code === 'KeyB') {
                // 模式 B: 呼吸效果
                twinkleMode.fill(1);
                starsGeometry.getAttribute('twinkleMode').needsUpdate = true;
                if (modeSpan) modeSpan.textContent = '当前模式: B - 呼吸效果（平滑）';
                console.log('[Starry Night] Mode B: Breathing');
            } else if (e.code === 'KeyC') {
                // 模式 C: 脉冲效果
                twinkleMode.fill(2);
                starsGeometry.getAttribute('twinkleMode').needsUpdate = true;
                if (modeSpan) modeSpan.textContent = '当前模式: C - 脉冲效果（快速）';
                console.log('[Starry Night] Mode C: Pulse');
            } else if (e.code === 'KeyD') {
                // 模式 D: 强烈闪烁
                twinkleMode.fill(3);
                starsGeometry.getAttribute('twinkleMode').needsUpdate = true;
                if (modeSpan) modeSpan.textContent = '当前模式: D - 强烈闪烁（超亮）';
                console.log('[Starry Night] Mode D: Intense Twinkle');
            } else if (e.code === 'KeyM') {
                // 生成单颗流星
                createShootingStar();
            } else if (e.code === 'KeyN') {
                // 生成流星雨
                console.log('[Starry Night] 🌠 流星雨开始!');
                for (let i = 0; i < 5; i++) {
                    setTimeout(() => {
                        createShootingStar();
                    }, i * 200); // 每200ms生成一颗
                }
            }
        };
        window.addEventListener('keydown', handleKeyPress);
        
        // 窗口调整
        const handleResize = () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        };
        window.addEventListener('resize', handleResize);
        
        // 渲染循环
        const animate = () => {
            animationFrameId = requestAnimationFrame(animate);
            
            const time = Date.now() * 0.001;
            const delta = 0.016; // 约60fps
            
            const sizesArray = starsGeometry.getAttribute('size').array as Float32Array;
            const twinkleSpeedArray = starsGeometry.getAttribute('twinkleSpeed').array as Float32Array;
            const twinklePhaseArray = starsGeometry.getAttribute('twinklePhase').array as Float32Array;
            const twinkleIntensityArray = starsGeometry.getAttribute('twinkleIntensity').array as Float32Array;
            const twinkleModeArray = starsGeometry.getAttribute('twinkleMode').array as Float32Array;
            
            // ✨ 高级闪烁算法（增强版）
            for (let i = 0; i < config.count; i++) {
                const speed = twinkleSpeedArray[i];
                const phase = twinklePhaseArray[i];
                const intensity = twinkleIntensityArray[i];
                const mode = twinkleModeArray[i];
                const baseSize = config.minSize + (i % 4) * 0.8;
                
                let twinkle: number;
                
                if (mode === 0) {
                    // 模式 A: 随机复杂闪烁（增强版）
                    const main = Math.sin(time * speed + phase) * 0.5 + 0.5;
                    const fast = Math.sin(time * speed * 4 + phase * 2) * 0.3 + 0.7;
                    const slow = Math.sin(time * 0.4 + phase * 0.5) * 0.3 + 0.7;
                    twinkle = main * fast * slow * intensity;
                } else if (mode === 1) {
                    // 模式 B: 呼吸效果（更明显）
                    const breath = Math.sin(time * speed * 0.6 + phase) * 0.5 + 0.5;
                    twinkle = Math.pow(breath, 1.5) * intensity;
                } else if (mode === 2) {
                    // 模式 C: 脉冲效果（更快速）
                    const pulse = Math.sin(time * speed * 3 + phase);
                    twinkle = (pulse > 0 ? Math.pow(pulse, 2) : 0) * intensity;
                } else {
                    // 模式 D: 强烈闪烁（超亮，快速变化）
                    const intense = Math.abs(Math.sin(time * speed * 5 + phase));
                    const flash = Math.random() > 0.95 ? 1.5 : 1.0;
                    twinkle = Math.pow(intense, 0.5) * intensity * flash;
                }
                
                sizesArray[i] = baseSize * (0.2 + twinkle * 2.3);
            }
            
            starsGeometry.getAttribute('size').needsUpdate = true;

            // ⭐ 更新流星
            const shootingStarCountSpan = document.getElementById('shooting-star-count');
            for (let i = shootingStars.length - 1; i >= 0; i--) {
                const star = shootingStars[i];
                star.age += delta;

                // 更新位置
                star.mesh.position.add(star.velocity.clone().multiplyScalar(delta));

                // 更新尾迹
                const trailPositions = star.trail.geometry.attributes.position.array as Float32Array;
                for (let j = trailPositions.length - 3; j >= 3; j -= 3) {
                    trailPositions[j] = trailPositions[j - 3];
                    trailPositions[j + 1] = trailPositions[j - 2];
                    trailPositions[j + 2] = trailPositions[j - 1];
                }
                trailPositions[0] = star.mesh.position.x;
                trailPositions[1] = star.mesh.position.y;
                trailPositions[2] = star.mesh.position.z;
                star.trail.geometry.attributes.position.needsUpdate = true;

                // 计算生命进度
                const lifeProgress = star.age / star.lifetime;

                // 更新透明度（逐渐消失）
                const opacity = Math.max(0, 1 - lifeProgress);
                (star.mesh.material as THREE.MeshBasicMaterial).opacity = opacity;
                (star.trail.material as THREE.LineBasicMaterial).opacity = opacity * 0.8;

                // 如果生命周期结束，移除流星
                if (star.age >= star.lifetime) {
                    scene.remove(star.mesh);
                    scene.remove(star.trail);
                    star.mesh.geometry.dispose();
                    (star.mesh.material as THREE.Material).dispose();
                    star.trail.geometry.dispose();
                    (star.trail.material as THREE.Material).dispose();
                    shootingStars.splice(i, 1);
                    console.log(`[Starry Night] 流星消失! 剩余: ${shootingStars.length}`);
                }
            }

            // 更新UI显示
            if (shootingStarCountSpan) {
                shootingStarCountSpan.textContent = `流星数量: ${shootingStars.length}`;
            }
            
            controls.update();
            renderer.render(scene, camera);
        };
        
        animate();
        console.log('[Starry Night] ✨ Scene ready!');
        
        // 清理函数
        cleanupFunction = () => {
            console.log('[Starry Night] Cleaning up...');
            
            if (animationFrameId !== null) {
                cancelAnimationFrame(animationFrameId);
            }
            
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('keydown', handleKeyPress);

            // 清理所有流星
            shootingStars.forEach(star => {
                scene.remove(star.mesh);
                scene.remove(star.trail);
                star.mesh.geometry.dispose();
                (star.mesh.material as THREE.Material).dispose();
                star.trail.geometry.dispose();
                (star.trail.material as THREE.Material).dispose();
            });
            shootingStars.length = 0;
            
            controls.dispose();
            renderer.dispose();
            skyboxMaterial.dispose();
            starsMaterial.dispose();
            starsGeometry.dispose();
            
            scene.traverse((object: any) => {
                if (object.geometry) object.geometry.dispose();
                if (object.material) {
                    if (Array.isArray(object.material)) {
                        object.material.forEach((m: any) => m.dispose());
                    } else {
                        object.material.dispose();
                    }
                }
            });
            
            if (appElement) {
                appElement.innerHTML = '';
            }
            
            console.log('[Starry Night] Cleanup complete!');
        };
    },
    onExit: async () => {
        console.log('[Starry Night] Exiting...');
        if (cleanupFunction) {
            cleanupFunction();
            cleanupFunction = null;
        }
    }
});

/**
 * 创建高级星星纹理（带光晕和星芒效果）
 */
function createAdvancedStarTexture(): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return new THREE.Texture();
    
    const centerX = 64;
    const centerY = 64;
    
    // 外层光晕
    const outerGlow = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 64);
    outerGlow.addColorStop(0, 'rgba(255, 255, 255, 1)');
    outerGlow.addColorStop(0.1, 'rgba(255, 255, 255, 0.9)');
    outerGlow.addColorStop(0.3, 'rgba(255, 255, 255, 0.5)');
    outerGlow.addColorStop(0.6, 'rgba(255, 255, 255, 0.1)');
    outerGlow.addColorStop(1, 'rgba(255, 255, 255, 0)');
    
    ctx.fillStyle = outerGlow;
    ctx.fillRect(0, 0, 128, 128);
    
    // 添加十字星芒效果
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(centerX, 0);
    ctx.lineTo(centerX, 128);
    ctx.moveTo(0, centerY);
    ctx.lineTo(128, centerY);
    ctx.stroke();
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    
    return texture;
}

export function startStarryNightScene() {
    console.log('🌟 Starting Starry Night Scene...');
    return starryNightScene();
}
