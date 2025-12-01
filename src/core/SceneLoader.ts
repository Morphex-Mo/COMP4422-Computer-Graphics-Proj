// Scene loader wrapper functions
import {ResourceConfig, ResourceType} from './ResourceLoader';
import {globalSceneManager, SceneConfig} from './SceneManager';

export interface SimpleSceneDefinition {
    id: string;
    name: string;
    resources?: {
        images?: { [key: string]: string };
        audios?: { [key: string]: string };
        videos?: { [key: string]: string };
        textures?: { [key: string]: string };
        cubeTextures?: { [key: string]: string[] };
        gltfModels?: { [key: string]: string };
        fbxModels?: { [key: string]: string };
        objModels?: { [key: string]: string };
        shaders?: { [key: string]: string };
        jsons?: { [key: string]: string };
        fonts?: { [key: string]: string };
    };
    onLoadProgress?: (loaded: number, total: number, percentage: number) => void;
    main: (resources: Map<string, any>) => void | Promise<void>;
    onExit?: () => void | Promise<void>;
}

function convertResources(resources?: SimpleSceneDefinition['resources']): ResourceConfig[] {
    if (!resources) return [];

    const configs: ResourceConfig[] = [];

    if (resources.images) {
        Object.entries(resources.images).forEach(([key, url]) => {
            configs.push({ key, url, type: ResourceType.IMAGE });
        });
    }

    if (resources.audios) {
        Object.entries(resources.audios).forEach(([key, url]) => {
            configs.push({ key, url, type: ResourceType.AUDIO });
        });
    }

    if (resources.videos) {
        Object.entries(resources.videos).forEach(([key, url]) => {
            configs.push({ key, url, type: ResourceType.VIDEO });
        });
    }

    if (resources.textures) {
        Object.entries(resources.textures).forEach(([key, url]) => {
            configs.push({ key, url, type: ResourceType.TEXTURE });
        });
    }

    if (resources.cubeTextures) {
        Object.entries(resources.cubeTextures).forEach(([key, urls]) => {
            configs.push({ key, url: urls, type: ResourceType.CUBE_TEXTURE });
        });
    }

    if (resources.gltfModels) {
        Object.entries(resources.gltfModels).forEach(([key, url]) => {
            configs.push({ key, url, type: ResourceType.MODEL_GLTF });
        });
    }

    if (resources.fbxModels) {
        Object.entries(resources.fbxModels).forEach(([key, url]) => {
            configs.push({ key, url, type: ResourceType.MODEL_FBX });
        });
    }

    if (resources.objModels) {
        Object.entries(resources.objModels).forEach(([key, url]) => {
            configs.push({ key, url, type: ResourceType.MODEL_OBJ });
        });
    }

    if (resources.shaders) {
        Object.entries(resources.shaders).forEach(([key, url]) => {
            configs.push({ key, url, type: ResourceType.SHADER });
        });
    }

    if (resources.jsons) {
        Object.entries(resources.jsons).forEach(([key, url]) => {
            configs.push({ key, url, type: ResourceType.JSON });
        });
    }

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

