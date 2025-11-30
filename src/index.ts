import {globalTimer} from "./core";
import {SceneSelector} from './ui';
import {testSceneSelector} from "./ui/TestSceneSelectorCreator";
import './styles/main.css';

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

/**
 * 从 URL 获取场景 ID
 */
function getSceneIdFromURL(): string | null {
    const params = new URLSearchParams(window.location.search);
    return params.get('scene');
}

/**
 * 根据场景 ID 查找并启动场景
 */
function startSceneById(sceneId: string): boolean {
    const scene = testSceneSelector['scenes'].find((s: any) => s.id === sceneId);
    
    if (scene) {
        console.log(`[Direct Launch] Starting scene: ${scene.name} (${scene.id})`);
        
        // 显示加载指示器
        const loading = document.getElementById('loading');
        if (loading) {
            loading.classList.add('active');
        }
        
        // 隐藏场景选择器
        testSceneSelector.hide();
        
        // 启动场景
        scene.handler().then(() => {
            if (loading) {
                loading.classList.remove('active');
            }
            console.log(`[Direct Launch] Scene ${scene.id} started successfully`);
        }).catch((error: Error) => {
            console.error(`[Direct Launch] Failed to start scene:`, error);
            if (loading) {
                loading.classList.remove('active');
            }
            alert(`Failed to load scene: ${error.message}`);
            testSceneSelector.show();
        });
        
        return true;
    }
    
    return false;
}

/**
 * 初始化应用
 */
function initApp() {
    const sceneId = getSceneIdFromURL();
    
    if (sceneId) {
        console.log(`[URL Parameter] Detected scene ID: ${sceneId}`);
        const success = startSceneById(sceneId);
        
        if (!success) {
            console.warn(`[URL Parameter] Scene ID "${sceneId}" not found, showing selector`);
            testSceneSelector.show();
        }
    } else {
        console.log('[Default] Showing scene selector');
        testSceneSelector.show();
    }
}

// 页面加载完成后初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

console.log('Scene selector initialized!');


