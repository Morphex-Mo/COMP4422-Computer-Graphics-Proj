/**
 * 场景加载器包装函数 - 提供便捷的场景定义和加载接口
 */

import { ResourceConfig, ResourceType } from './ResourceLoader';
import { globalSceneManager, SceneConfig } from './SceneManager';

/**
 * 简化的场景定义接口
 */
export interface SimpleSceneDefinition {
    /** 场景唯一标识 */
    id: string;
    /** 场景名称 */
    name: string;
    /** 需要加载的资源（简化配置） */
    resources?: {
        /** 图片资源 */
        images?: { [key: string]: string };
        /** 音频资源 */
        audios?: { [key: string]: string };
        /** 视频资源 */
        videos?: { [key: string]: string };
        /** 纹理资源 */
        textures?: { [key: string]: string };
        /** 立方体纹理（天空盒） */
        cubeTextures?: { [key: string]: string[] };
        /** GLTF模型 */
        gltfModels?: { [key: string]: string };
        /** FBX模型 */
        fbxModels?: { [key: string]: string };
        /** OBJ模型 */
        objModels?: { [key: string]: string };
        /** Shader文件 */
        shaders?: { [key: string]: string };
        /** JSON文件 */
        jsons?: { [key: string]: string };
        /** 字体文件 */
        fonts?: { [key: string]: string };
    };
    /** 加载进度回调 */
    onLoadProgress?: (loaded: number, total: number, percentage: number) => void;
    /** 场景主函数（资源加载完成后执行） */
    main: (resources: Map<string, any>) => void | Promise<void>;
    /** 场景退出函数 */
    onExit?: () => void | Promise<void>;
}

/**
 * 将简化的资源配置转换为完整的资源配置数组
 */
function convertResources(resources?: SimpleSceneDefinition['resources']): ResourceConfig[] {
    if (!resources) return [];

    const configs: ResourceConfig[] = [];

    // 处理图片
    if (resources.images) {
        Object.entries(resources.images).forEach(([key, url]) => {
            configs.push({ key, url, type: ResourceType.IMAGE });
        });
    }

    // 处理音频
    if (resources.audios) {
        Object.entries(resources.audios).forEach(([key, url]) => {
            configs.push({ key, url, type: ResourceType.AUDIO });
        });
    }

    // 处理视频
    if (resources.videos) {
        Object.entries(resources.videos).forEach(([key, url]) => {
            configs.push({ key, url, type: ResourceType.VIDEO });
        });
    }

    // 处理纹理
    if (resources.textures) {
        Object.entries(resources.textures).forEach(([key, url]) => {
            configs.push({ key, url, type: ResourceType.TEXTURE });
        });
    }

    // 处理立方体纹理
    if (resources.cubeTextures) {
        Object.entries(resources.cubeTextures).forEach(([key, urls]) => {
            configs.push({ key, url: urls, type: ResourceType.CUBE_TEXTURE });
        });
    }

    // 处理GLTF模型
    if (resources.gltfModels) {
        Object.entries(resources.gltfModels).forEach(([key, url]) => {
            configs.push({ key, url, type: ResourceType.MODEL_GLTF });
        });
    }

    // 处理FBX模型
    if (resources.fbxModels) {
        Object.entries(resources.fbxModels).forEach(([key, url]) => {
            configs.push({ key, url, type: ResourceType.MODEL_FBX });
        });
    }

    // 处理OBJ模型
    if (resources.objModels) {
        Object.entries(resources.objModels).forEach(([key, url]) => {
            configs.push({ key, url, type: ResourceType.MODEL_OBJ });
        });
    }

    // 处理Shader
    if (resources.shaders) {
        Object.entries(resources.shaders).forEach(([key, url]) => {
            configs.push({ key, url, type: ResourceType.SHADER });
        });
    }

    // 处理JSON
    if (resources.jsons) {
        Object.entries(resources.jsons).forEach(([key, url]) => {
            configs.push({ key, url, type: ResourceType.JSON });
        });
    }

    // 处理字体
    if (resources.fonts) {
        Object.entries(resources.fonts).forEach(([key, url]) => {
            configs.push({ key, url, type: ResourceType.FONT });
        });
    }

    return configs;
}

/**
 * 定义一个场景（类似"关卡"）
 * @param definition 场景定义
 * @returns 返回一个函数，调用后开始加载并进入场景
 *
 * @example
 * ```typescript
 * const level1 = defineScene({
 *   id: 'level1',
 *   name: '第一关',
 *   resources: {
 *     textures: {
 *       'ground': '/textures/ground.jpg',
 *       'wall': '/textures/wall.jpg'
 *     },
 *     gltfModels: {
 *       'player': '/models/player.gltf',
 *       'enemy': '/models/enemy.gltf'
 *     },
 *     shaders: {
 *       'customVertex': '/shaders/custom.vert',
 *       'customFragment': '/shaders/custom.frag'
 *     }
 *   },
 *   onLoadProgress: (loaded, total, percentage) => {
 *     console.log(`Loading: ${percentage}%`);
 *   },
 *   main: async (resources) => {
 *     // 资源加载完成，开始场景逻辑
 *     const groundTexture = resources.get('ground');
 *     const playerModel = resources.get('player');
 *     // ... 初始化场景
 *   }
 * });
 *
 * // 调用以进入场景
 * level1();
 * ```
 */
export function defineScene(definition: SimpleSceneDefinition): () => Promise<void> {
    const sceneConfig: SceneConfig = {
        id: definition.id,
        name: definition.name,
        resources: convertResources(definition.resources),
        onEnter: definition.main,
        onExit: definition.onExit,
        onLoadProgress: definition.onLoadProgress
    };

    // 注册场景
    globalSceneManager.registerScene(sceneConfig);

    // 返回场景加载函数
    return () => globalSceneManager.loadAndEnterScene(definition.id);
}

/**
 * 创建资源加载包装器（用于包装关卡函数）
 * @param resources 资源配置
 * @param levelFunction 关卡函数
 * @param options 可选配置
 * @returns 包装后的函数，调用后开始加载资源并执行关卡函数
 *
 * @example
 * ```typescript
 * const startLevel1 = createLevelLoader(
 *   {
 *     textures: { 'ground': '/textures/ground.jpg' },
 *     gltfModels: { 'player': '/models/player.gltf' }
 *   },
 *   (resources) => {
 *     // 关卡逻辑
 *     const groundTexture = resources.get('ground');
 *     const playerModel = resources.get('player');
 *   },
 *   {
 *     onProgress: (percentage) => console.log(`Loading: ${percentage}%`)
 *   }
 * );
 *
 * // 开始加载并进入关卡
 * startLevel1();
 * ```
 */
export function createLevelLoader(
    resources: SimpleSceneDefinition['resources'],
    levelFunction: (resources: Map<string, any>) => void | Promise<void>,
    options?: {
        id?: string;
        name?: string;
        onProgress?: (percentage: number) => void;
        onExit?: () => void | Promise<void>;
    }
): () => Promise<void> {
    const id = options?.id || `level_${Date.now()}`;
    const name = options?.name || id;

    return defineScene({
        id,
        name,
        resources,
        main: levelFunction,
        onExit: options?.onExit,
        onLoadProgress: options?.onProgress
            ? (_, __, percentage) => options.onProgress!(percentage)
            : undefined
    });
}

/**
 * 辅助函数：创建进度条UI
 */
export function createLoadingUI(containerId: string = 'app'): {
    update: (percentage: number) => void;
    remove: () => void;
} {
    const container = document.getElementById(containerId);
    if (!container) {
        console.warn(`Container ${containerId} not found`);
        return { update: () => {}, remove: () => {} };
    }

    const loadingDiv = document.createElement('div');
    loadingDiv.id = 'loading-screen';
    loadingDiv.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.9);
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        z-index: 9999;
        color: white;
        font-family: Arial, sans-serif;
    `;

    const progressContainer = document.createElement('div');
    progressContainer.style.cssText = `
        width: 300px;
        height: 30px;
        border: 2px solid #00ff88;
        border-radius: 15px;
        overflow: hidden;
        background: rgba(0, 0, 0, 0.5);
    `;

    const progressBar = document.createElement('div');
    progressBar.style.cssText = `
        width: 0%;
        height: 100%;
        background: linear-gradient(90deg, #00ff88, #00cc66);
        transition: width 0.3s ease;
    `;

    const progressText = document.createElement('div');
    progressText.style.cssText = `
        margin-top: 20px;
        font-size: 18px;
    `;
    progressText.textContent = 'Loading... 0%';

    progressContainer.appendChild(progressBar);
    loadingDiv.appendChild(progressContainer);
    loadingDiv.appendChild(progressText);
    container.appendChild(loadingDiv);

    return {
        update: (percentage: number) => {
            progressBar.style.width = `${percentage}%`;
            progressText.textContent = `Loading... ${percentage}%`;
        },
        remove: () => {
            loadingDiv.style.opacity = '0';
            loadingDiv.style.transition = 'opacity 0.5s ease';
            setTimeout(() => {
                if (loadingDiv.parentNode) {
                    loadingDiv.parentNode.removeChild(loadingDiv);
                }
            }, 500);
        }
    };
}

