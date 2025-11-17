import {startSharedScene1, startSharedScene2, startSharedScene3} from "../scenes/examples/sharedConfigDemo";
import {startSimpleTest, startTestWithUI} from "../scenes/examples/testScene";
import {startLevel1, startLevel2, startLevel3, startLevel4} from "../scenes/examples/sceneLoaderDemo";
import {startFoxScene} from "../scenes/foxScene";
import {startCubeScene} from "../scenes/cubeScene";
import {startCubeSceneWithConfig} from "../scenes/cubeSceneWithConfig";
import {startStarryNightScene} from "../scenes/starryNightScene";
import {SceneSelector} from "./SceneSelector";
import {startFoxAtmosphereScene} from "../scenes/foxAtmosphereScene";

// ============================================
// 创建场景选择器
// ============================================

export const testSceneSelector:SceneSelector = new SceneSelector([
    {
        id: 'fox_atmosphere_scene',
        name: '🦊 Fox + Atmosphere Scene',
        description: 'Fox模型 + Fogness天空 - 动态星空、雾效、Toon Shader，时间驱动的昼夜变化',
        handler: startFoxAtmosphereScene
    },
    {
        id: 'starry_night_scene',
        name: '🌟 Starry Night Scene',
        description: '星空效果演示 - 8000颗星星闪烁动画，支持键盘交互控制',
        handler: startStarryNightScene
    },
    {
        id: 'cube_scene2',
        name: 'Cube Scene2 (Skybox + Fog)',
        description: '简单场景 - 展示天空盒、雾效和Toon Shader立方体',
        handler: startCubeSceneWithConfig
    }
    ,{
        id: 'cube_scene',
        name: 'Cube Scene (Skybox + Fog)',
        description: '简单场景 - 展示天空盒、雾效和Toon Shader立方体',
        handler: startCubeScene
    },
    {
        id: 'fox_scene',
        name: 'Fox Model Scene',
        description: 'GLTF模型加载演示 - 展示一个3D狐狸模型',
        handler: startFoxScene
    },
    {
        id: 'simple_test',
        name: '简单测试场景',
        description: '不需要任何外部资源文件的基础测试场景',
        handler: startSimpleTest
    },
    {
        id: 'test_with_ui',
        name: '带UI的测试场景',
        description: '包含加载进度UI的测试场景',
        handler: startTestWithUI
    },
    {
        id: 'level1',
        name: '第一关 - 基础场景',
        description: '使用场景加载器加载纹理资源',
        handler: startLevel1
    },
    {
        id: 'level2',
        name: '第二关 - 进阶场景',
        description: '更复杂的场景配置',
        handler: startLevel2
    },
    {
        id: 'level3',
        name: '第三关 - 高级场景',
        description: '高级场景特性演示',
        handler: startLevel3
    },
    {
        id: 'level4',
        name: '第四关 - 共享渲染器',
        description: '使用共享相机和渲染器的场景',
        handler: startLevel4
    },
    {
        id: 'shared_scene_1',
        name: '共享配置场景 1',
        description: '共享相机/渲染器配置演示 1',
        handler: startSharedScene1
    },
    {
        id: 'shared_scene_2',
        name: '共享配置场景 2',
        description: '共享相机/渲染器配置演示 2',
        handler: startSharedScene2
    },
    {
        id: 'shared_scene_3',
        name: '共享配置场景 3',
        description: '共享相机/渲染器配置演示 3',
        handler: startSharedScene3
    }
]);