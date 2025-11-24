
import {globalTimer} from "./core";
import {starCollectorScene} from "./scenes/starCollectorScene";
console.log('[App] Global scene configuration initialized');

// 初始化全局定时器
globalTimer.init();

starCollectorScene();


