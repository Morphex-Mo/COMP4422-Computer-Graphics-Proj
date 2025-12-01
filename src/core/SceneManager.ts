import {ResourceConfig, ResourceLoader} from './ResourceLoader';

export interface SceneConfig {
    id: string;
    name: string;
    resources: ResourceConfig[];
    onEnter: (resourceMap: Map<string, any>) => void | Promise<void>;
    onExit?: () => void | Promise<void>;
    onLoadProgress?: (loaded: number, total: number, percentage: number) => void;
}

export class SceneManager {
    private currentScene: SceneConfig | null = null;
    private scenes: Map<string, SceneConfig> = new Map();
    private resourceLoader: ResourceLoader;
    private isLoading: boolean = false;
    private abortController: AbortController | null = null;

    constructor(resourceLoader?: ResourceLoader) {
        this.resourceLoader = resourceLoader || new ResourceLoader();
    }

    registerScene(config: SceneConfig): this {
        this.scenes.set(config.id, config);
        return this;
    }

    registerScenes(configs: SceneConfig[]): this {
        configs.forEach(config => this.registerScene(config));
        return this;
    }

    async loadAndEnterScene(sceneId: string): Promise<void> {
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
            if (this.currentScene?.onExit) {
                await this.currentScene.onExit();
            }

            console.log(`[SceneManager] Loading scene: ${sceneConfig.name}`);

            const resourceMap = await this.resourceLoader.load({
                resources: sceneConfig.resources,
                onProgress: (key, loaded, total) => {
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

            if (currentAbortController.signal.aborted) {
                console.log(`[SceneManager] Scene loading was cancelled before entering: ${sceneConfig.name}`);
                return;
            }

            console.log(`[SceneManager] Entering scene: ${sceneConfig.name}`);
            await sceneConfig.onEnter(resourceMap);
            this.currentScene = sceneConfig;

        } catch (error) {
            if (currentAbortController.signal.aborted) {
                console.log(`[SceneManager] Scene loading cancelled: ${sceneConfig.name}`);
                return;
            }
            console.error(`[SceneManager] Error loading scene ${sceneId}:`, error);
            throw error;
        } finally {
            if (this.abortController === currentAbortController) {
                this.isLoading = false;
                this.abortController = null;
            }
        }
    }

    getCurrentScene(): SceneConfig | null {
        return this.currentScene;
    }

    getResourceLoader(): ResourceLoader {
        return this.resourceLoader;
    }

    getIsLoading(): boolean {
        return this.isLoading;
    }
}

export const globalSceneManager = new SceneManager();

