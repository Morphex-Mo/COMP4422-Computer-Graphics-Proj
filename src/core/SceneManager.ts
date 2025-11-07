/**
 * 场景管理器 - 管理场景加载和切换
 */

import { ResourceLoader, ResourceConfig } from './ResourceLoader';

/**
 * 场景配置接口
 */
export interface SceneConfig {
    /** 场景唯一标识 */
    id: string;
    /** 场景名称 */
    name: string;
    /** 需要加载的资源列表 */
    resources: ResourceConfig[];
    /** 场景入口函数 */
    onEnter: (resourceMap: Map<string, any>) => void | Promise<void>;
    /** 场景退出函数 */
    onExit?: () => void | Promise<void>;
    /** 加载进度回调 */
    onLoadProgress?: (loaded: number, total: number, percentage: number) => void;
}

/**
 * 场景管理器类
 */
export class SceneManager {
    private currentScene: SceneConfig | null = null;
    private scenes: Map<string, SceneConfig> = new Map();
    private resourceLoader: ResourceLoader;
    private isLoading: boolean = false;
    private abortController: AbortController | null = null;

    constructor(resourceLoader?: ResourceLoader) {
        this.resourceLoader = resourceLoader || new ResourceLoader();
    }

    /**
     * 注册场景
     */
    registerScene(config: SceneConfig): this {
        this.scenes.set(config.id, config);
        return this;
    }

    /**
     * 批量注册场景
     */
    registerScenes(configs: SceneConfig[]): this {
        configs.forEach(config => this.registerScene(config));
        return this;
    }

    /**
     * 加载并进入场景
     */
    async loadAndEnterScene(sceneId: string): Promise<void> {
        // 如果正在加载其他场景，取消当前加载（覆盖模式）
        if (this.isLoading) {
            console.warn(`[SceneManager] Cancelling current scene loading to load: ${sceneId}`);
            this.abortController?.abort();
        }

        const sceneConfig = this.scenes.get(sceneId);
        if (!sceneConfig) {
            throw new Error(`Scene not found: ${sceneId}`);
        }

        this.isLoading = true;
        this.abortController = new AbortController();
        const currentAbortController = this.abortController;

        try {
            // 退出当前场景
            if (this.currentScene?.onExit) {
                await this.currentScene.onExit();
            }

            console.log(`[SceneManager] Loading scene: ${sceneConfig.name}`);

            // 加载场景资源
            const resourceMap = await this.resourceLoader.load({
                resources: sceneConfig.resources,
                onProgress: (key, loaded, total) => {
                    // 检查是否已被取消
                    if (currentAbortController.signal.aborted) {
                        console.log(`[SceneManager] Scene loading cancelled: ${sceneConfig.name}`);
                        return;
                    }
                    const percentage = Math.floor((loaded / total) * 100);
                    console.log(`[SceneManager] Loading ${key}... (${loaded}/${total}) ${percentage}%`);
                    sceneConfig.onLoadProgress?.(loaded, total, percentage);
                },
                onError: (key, error) => {
                    console.error(`[SceneManager] Failed to load ${key}: ${error}`);
                },
                onComplete: (map) => {
                    console.log(`[SceneManager] All resources loaded for scene: ${sceneConfig.name}`);
                }
            });

            // 再次检查是否已被取消（在资源加载完成后）
            if (currentAbortController.signal.aborted) {
                console.log(`[SceneManager] Scene loading was cancelled before entering: ${sceneConfig.name}`);
                return;
            }

            // 进入场景
            console.log(`[SceneManager] Entering scene: ${sceneConfig.name}`);
            await sceneConfig.onEnter(resourceMap);
            this.currentScene = sceneConfig;

        } catch (error) {
            // 如果是被取消的，不报错
            if (currentAbortController.signal.aborted) {
                console.log(`[SceneManager] Scene loading cancelled: ${sceneConfig.name}`);
                return;
            }
            console.error(`[SceneManager] Error loading scene ${sceneId}:`, error);
            throw error;
        } finally {
            // 只有当前加载没有被新的加载覆盖时才重置状态
            if (this.abortController === currentAbortController) {
                this.isLoading = false;
                this.abortController = null;
            }
        }
    }

    /**
     * 获取当前场景
     */
    getCurrentScene(): SceneConfig | null {
        return this.currentScene;
    }

    /**
     * 获取资源加载器
     */
    getResourceLoader(): ResourceLoader {
        return this.resourceLoader;
    }

    /**
     * 检查是否正在加载
     */
    getIsLoading(): boolean {
        return this.isLoading;
    }
}

/**
 * 全局场景管理器实例
 */
export const globalSceneManager = new SceneManager();

