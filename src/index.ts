
import {globalTimer} from "./core";
import {SceneSelector} from './ui';
import {testSceneSelector} from "./ui/TestSceneSelectorCreator";

console.log('[App] Global scene configuration initialized');

// 初始化全局定时器
globalTimer.init();


console.log('\n========== 场景选择器已启动 ==========');
console.log('点击右上角的 "📋 场景菜单" 按钮打开/关闭场景选择器');
console.log('或点击场景卡片直接加载对应场景');
console.log('=====================================\n');

// 将测试函数暴露到全局window对象（保留向后兼容）
declare global {
    interface Window {
        sceneSelector: SceneSelector;
    }
}
window.sceneSelector = testSceneSelector;


