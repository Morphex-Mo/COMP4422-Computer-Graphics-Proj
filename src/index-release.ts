import {initializeGlobalConfig} from './scenes/examples/sharedConfigDemo';
import {globalTimer} from "./core";
import {starCollectorScene} from "./scenes/starCollectorScene";

// 初始化全局场景配置（统一的相机和渲染器）
initializeGlobalConfig();
console.log('[App] Global scene configuration initialized');

// 初始化全局定时器
globalTimer.init();

starCollectorScene();


