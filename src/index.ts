import { startSimpleTest, startTestWithUI } from './examples/testScene';
import { startLevel1, startLevel2, startLevel3, startLevel4 } from './examples/sceneLoaderDemo';
import {
    initializeGlobalConfig,
    startSharedScene1,
    startSharedScene2,
    startSharedScene3
} from './examples/sharedConfigDemo';
import {globalTimer} from "./core";

// 初始化全局场景配置（统一的相机和渲染器）
initializeGlobalConfig();
console.log('[App] Global scene configuration initialized');

// 将测试函数暴露到全局window对象，方便在控制台调用
declare global {
    interface Window {
        startSimpleTest: () => Promise<void>;
        startTestWithUI: () => Promise<void>;
        startLevel1: () => Promise<void>;
        startLevel2: () => Promise<void>;
        startLevel3: () => Promise<void>;
        startLevel4: () => Promise<void>;
        startSharedScene1: () => Promise<void>;
        startSharedScene2: () => Promise<void>;
        startSharedScene3: () => Promise<void>;
    }
}

window.startSimpleTest = startSimpleTest;
window.startTestWithUI = startTestWithUI;
window.startLevel1 = startLevel1;
window.startLevel2 = startLevel2;
window.startLevel3 = startLevel3;
window.startLevel4 = startLevel4;
window.startSharedScene1 = startSharedScene1;
window.startSharedScene2 = startSharedScene2;
window.startSharedScene3 = startSharedScene3;

console.log('[App] Available scene functions:');
console.log('  - startSimpleTest()');
console.log('  - startTestWithUI()');
console.log('  - startLevel1()');
console.log('  - startLevel2()');
console.log('  - startLevel3()');
console.log('  - startLevel4() - Uses shared camera/renderer');
console.log('  - startSharedScene1() - Shared config demo 1');
console.log('  - startSharedScene2() - Shared config demo 2');
console.log('  - startSharedScene3() - Shared config demo 3');
/*
// Hello World 示例
console.log('Hello World from TypeScript!');
console.log('Using Three.js version:', THREE.REVISION);

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
camera.position.z = 10;
camera.position.y = 2;

// 创建渲染器
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
const appElement = document.getElementById('app');
if (appElement) {
  appElement.appendChild(renderer.domElement);
}

// 创建一个旋转的中心立方体
const geometry = new THREE.BoxGeometry(1.5, 1.5, 1.5);
const material = new THREE.MeshPhongMaterial({
  color: 0x00ff88,
  shininess: 100
});
const cube = new THREE.Mesh(geometry, material);
cube.position.y = -2;
scene.add(cube);

// 添加光源
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(5, 5, 5);
scene.add(directionalLight);

// 添加点光源
const pointLight = new THREE.PointLight(0xff00ff, 1, 100);
pointLight.position.set(0, 5, 0);
scene.add(pointLight);

// 窗口大小调整
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// 动画循环
function animate(): void {
  requestAnimationFrame(animate);

  // 旋转中心立方体
  cube.rotation.x += 0.01;
  cube.rotation.y += 0.01;

  renderer.render(scene, camera);
}

// 启动动画
animate();

// 导出示例函数（展示TypeScript类型）
export function greet(name: string): string {
  return `Hello, ${name}!`;
}

console.log(greet('COMP4422'));

// ============================================
// 启动动画库和定时器演示
// ============================================


// 延迟启动演示，避免一次性输出太多日志
setTimeout(() => {
  // 运行动画演示
  runAnimationDemo(scene);

  // 运行定时器演示
  runTimerDemo();

  // 可选：运行性能测试（默认注释，需要时取消注释）
  // setTimeout(() => runPerformanceTest(), 8000);
}, 1000);
*/

// 初始化全局定时器
globalTimer.init();
// ============================================
// 资源加载器测试说明
// ============================================
console.log('\n========== 资源加载器已就绪 ==========');
console.log('在控制台中运行以下命令测试资源加载器：');
console.log('1. window.startSimpleTest()  - 启动简单测试场景');
console.log('2. window.startTestWithUI()  - 启动带加载UI的测试场景');
console.log('详细文档请查看: 资源加载器使用文档.md');
console.log('快速开始请查看: 资源加载器快速开始.md');
console.log('=====================================\n');

