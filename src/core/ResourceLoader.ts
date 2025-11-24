/**
 * 资源加载器 - 支持图片、音频、视频、脚本、Three.js资源等
 */

import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {FBXLoader} from 'three/examples/jsm/loaders/FBXLoader.js';
import {OBJLoader} from 'three/examples/jsm/loaders/OBJLoader.js';
import {FontLoader} from 'three/examples/jsm/loaders/FontLoader.js';

/**
 * 资源类型枚举
 */
export enum ResourceType {
    IMAGE = 'image',
    AUDIO = 'audio',
    VIDEO = 'video',
    SCRIPT = 'script',
    TEXTURE = 'texture',
    CUBE_TEXTURE = 'cubeTexture',
    MODEL_GLTF = 'gltf',
    MODEL_FBX = 'fbx',
    MODEL_OBJ = 'obj',
    SHADER = 'shader',
    JSON = 'json',
    FONT = 'font'
}

/**
 * 单个资源配置
 */
export interface ResourceConfig {
    /** 资源唯一标识 */
    key: string;
    /** 资源路径 */
    url: string | string[];
    /** 资源类型 */
    type: ResourceType;
    /** 加载超时时间（毫秒） */
    timeout?: number;
}

/**
 * 加载参数
 */
export interface LoadParams {
    /** 资源配置数组 */
    resources: ResourceConfig[];
    /** 单个资源加载成功回调 */
    onProgress?: (key: string, loaded: number, total: number) => void;
    /** 单个资源加载失败回调 */
    onError?: (key: string, error: string) => void;
    /** 全部加载完成回调 */
    onComplete?: (resourceMap: Map<string, any>) => void;
}

/**
 * 资源加载器类
 */
export class ResourceLoader {
    private resourceMap: Map<string, any> = new Map();
    private textureLoader: THREE.TextureLoader;
    private cubeTextureLoader: THREE.CubeTextureLoader;
    private gltfLoader: GLTFLoader;
    private fbxLoader: FBXLoader;
    private fontLoader: FontLoader;
    private objLoader: OBJLoader;
    private fileLoader: THREE.FileLoader;

    constructor() {
        this.textureLoader = new THREE.TextureLoader();
        this.cubeTextureLoader = new THREE.CubeTextureLoader();
        this.gltfLoader = new GLTFLoader();
        this.fbxLoader = new FBXLoader();
        this.fontLoader = new FontLoader();
        this.objLoader = new OBJLoader();
        this.fileLoader = new THREE.FileLoader();
    }

    /**
     * 加载图片资源
     */
    private loadImage(url: string, timeout: number = 30000): Promise<HTMLImageElement> {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.src = url;

            let timerId: number | null = null;

            const cleanup = () => {
                if (timerId) clearTimeout(timerId);
                img.onload = null;
                img.onerror = null;
            };

            if (img.complete) {
                resolve(img);
            } else {
                timerId = window.setTimeout(() => {
                    cleanup();
                    reject(`Timeout loading image: ${url}`);
                }, timeout);

                img.onload = () => {
                    cleanup();
                    resolve(img);
                };

                img.onerror = () => {
                    cleanup();
                    reject(`Failed to load image: ${url}`);
                };
            }
        });
    }

    /**
     * 加载音频资源
     */
    private loadAudio(url: string, timeout: number = 30000): Promise<HTMLAudioElement> {
        return new Promise((resolve, reject) => {
            const audio = new Audio();
            audio.src = url;

            let timerId: number | null = null;

            const cleanup = () => {
                if (timerId) clearTimeout(timerId);
                audio.oncanplay = null;
                audio.onerror = null;
            };

            if (audio.readyState === 4) {
                resolve(audio);
            } else {
                timerId = window.setTimeout(() => {
                    cleanup();
                    reject(`Timeout loading audio: ${url}`);
                }, timeout);

                audio.oncanplay = () => {
                    cleanup();
                    resolve(audio);
                };

                audio.onerror = () => {
                    cleanup();
                    reject(`Failed to load audio: ${url}`);
                };
            }
        });
    }

    /**
     * 加载视频资源
     */
    private loadVideo(url: string, timeout: number = 30000): Promise<HTMLVideoElement> {
        return new Promise((resolve, reject) => {
            const video = document.createElement('video');
            video.src = url;

            let timerId: number | null = null;

            const cleanup = () => {
                if (timerId) clearTimeout(timerId);
                video.oncanplay = null;
                video.onerror = null;
            };

            if (video.readyState === 4) {
                resolve(video);
            } else {
                timerId = window.setTimeout(() => {
                    cleanup();
                    reject(`Timeout loading video: ${url}`);
                }, timeout);

                video.oncanplay = () => {
                    cleanup();
                    resolve(video);
                };

                video.onerror = () => {
                    cleanup();
                    reject(`Failed to load video: ${url}`);
                };
            }
        });
    }

    /**
     * 加载脚本资源
     */
    private loadScript(url: string, timeout: number = 10000): Promise<HTMLScriptElement> {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = url;

            let timerId: number | null = null;

            const cleanup = () => {
                if (timerId) clearTimeout(timerId);
                script.onload = null;
                script.onerror = null;
            };

            timerId = window.setTimeout(() => {
                cleanup();
                reject(`Timeout loading script: ${url}`);
            }, timeout);

            script.onload = () => {
                cleanup();
                resolve(script);
            };

            script.onerror = () => {
                cleanup();
                reject(`Failed to load script: ${url}`);
            };

            document.head.appendChild(script);
        });
    }

    /**
     * 加载纹理资源
     */
    private loadTexture(url: string, timeout: number = 30000): Promise<THREE.Texture> {
        return new Promise((resolve, reject) => {
            const timerId = window.setTimeout(() => {
                reject(`Timeout loading texture: ${url}`);
            }, timeout);

            this.textureLoader.load(
                url,
                (texture) => {
                    clearTimeout(timerId);
                    resolve(texture);
                },
                undefined,
                (error) => {
                    clearTimeout(timerId);
                    reject(`Failed to load texture: ${url}, ${error}`);
                }
            );
        });
    }

    /**
     * 加载立方体纹理资源
     */
    private loadCubeTexture(urls: string[], timeout: number = 30000): Promise<THREE.CubeTexture> {
        return new Promise((resolve, reject) => {
            const timerId = window.setTimeout(() => {
                reject(`Timeout loading cube texture`);
            }, timeout);

            this.cubeTextureLoader.load(
                urls,
                (texture) => {
                    clearTimeout(timerId);
                    resolve(texture);
                },
                undefined,
                (error) => {
                    clearTimeout(timerId);
                    reject(`Failed to load cube texture: ${error}`);
                }
            );
        });
    }

    /**
     * 加载GLTF模型
     */
    private loadGLTF(url: string, timeout: number = 60000): Promise<any> {
        return new Promise((resolve, reject) => {
            const timerId = window.setTimeout(() => {
                reject(`Timeout loading GLTF model: ${url}`);
            }, timeout);

            this.gltfLoader.load(
                url,
                (gltf) => {
                    clearTimeout(timerId);
                    resolve(gltf);
                },
                undefined,
                (error) => {
                    clearTimeout(timerId);
                    reject(`Failed to load GLTF model: ${url}, ${error}`);
                }
            );
        });
    }

    /**
     * 加载FBX模型
     */
    private loadFBX(url: string, timeout: number = 60000): Promise<any> {
        return new Promise((resolve, reject) => {
            const timerId = window.setTimeout(() => {
                reject(`Timeout loading FBX model: ${url}`);
            }, timeout);

            this.fbxLoader.load(
                url,
                (fbx) => {
                    clearTimeout(timerId);
                    resolve(fbx);
                },
                undefined,
                (error) => {
                    clearTimeout(timerId);
                    reject(`Failed to load FBX model: ${url}, ${error}`);
                }
            );
        });
    }

    /**
     * 加载OBJ模型
     */
    private loadOBJ(url: string, timeout: number = 60000): Promise<any> {
        return new Promise((resolve, reject) => {
            const timerId = window.setTimeout(() => {
                reject(`Timeout loading OBJ model: ${url}`);
            }, timeout);

            this.objLoader.load(
                url,
                (obj) => {
                    clearTimeout(timerId);
                    resolve(obj);
                },
                undefined,
                (error) => {
                    clearTimeout(timerId);
                    reject(`Failed to load OBJ model: ${url}, ${error}`);
                }
            );
        });
    }

    /**
     * 加载Shader文件
     */
    private loadShader(url: string, timeout: number = 10000): Promise<string> {
        return new Promise((resolve, reject) => {
            const timerId = window.setTimeout(() => {
                reject(`Timeout loading shader: ${url}`);
            }, timeout);

            this.fileLoader.load(
                url,
                (data) => {
                    clearTimeout(timerId);
                    resolve(data as string);
                },
                undefined,
                (error) => {
                    clearTimeout(timerId);
                    reject(`Failed to load shader: ${url}, ${error}`);
                }
            );
        });
    }

    /**
     * 加载JSON文件
     */
    private loadJSON(url: string, timeout: number = 10000): Promise<any> {
        return new Promise((resolve, reject) => {
            const timerId = window.setTimeout(() => {
                reject(`Timeout loading JSON: ${url}`);
            }, timeout);

            fetch(url)
                .then(response => response.json())
                .then(data => {
                    clearTimeout(timerId);
                    resolve(data);
                })
                .catch(error => {
                    clearTimeout(timerId);
                    reject(`Failed to load JSON: ${url}, ${error}`);
                });
        });
    }

    /**
     * 加载字体文件
     */
    private loadFont(url: string, timeout: number = 30000): Promise<any> {
        return new Promise((resolve, reject) => {
            const timerId = window.setTimeout(() => {
                reject(`Timeout loading font: ${url}`);
            }, timeout);

            this.fontLoader.load(
                url,
                (font) => {
                    clearTimeout(timerId);
                    resolve(font);
                },
                undefined,
                (error) => {
                    clearTimeout(timerId);
                    reject(`Failed to load font: ${url}, ${error}`);
                }
            );
        });
    }

    /**
     * 根据资源类型加载资源
     */
    private async loadResource(config: ResourceConfig): Promise<any> {
        const { type, url, timeout = 30000 } = config;

        switch (type) {
            case ResourceType.IMAGE:
                return this.loadImage(url as string, timeout);
            case ResourceType.AUDIO:
                return this.loadAudio(url as string, timeout);
            case ResourceType.VIDEO:
                return this.loadVideo(url as string, timeout);
            case ResourceType.SCRIPT:
                return this.loadScript(url as string, timeout);
            case ResourceType.TEXTURE:
                return this.loadTexture(url as string, timeout);
            case ResourceType.CUBE_TEXTURE:
                return this.loadCubeTexture(url as string[], timeout);
            case ResourceType.MODEL_GLTF:
                return this.loadGLTF(url as string, timeout);
            case ResourceType.MODEL_FBX:
                return this.loadFBX(url as string, timeout);
            case ResourceType.MODEL_OBJ:
                return this.loadOBJ(url as string, timeout);
            case ResourceType.SHADER:
                return this.loadShader(url as string, timeout);
            case ResourceType.JSON:
                return this.loadJSON(url as string, timeout);
            case ResourceType.FONT:
                return this.loadFont(url as string, timeout);
            default:
                throw new Error(`Unknown resource type: ${type}`);
        }
    }

    /**
     * 批量加载资源
     */
    async load(params: LoadParams): Promise<Map<string, any>> {
        const { resources, onProgress, onError, onComplete } = params;
        const total = resources.length;
        let loaded = 0;

        const promises = resources.map(async (config) => {
            try {
                const resource = await this.loadResource(config);
                this.resourceMap.set(config.key, resource);
                loaded++;
                onProgress?.(config.key, loaded, total);
                return { status: 'fulfilled', key: config.key, value: resource };
            } catch (error) {
                const errorMsg = error instanceof Error ? error.message : String(error);
                loaded++;
                onError?.(config.key, errorMsg);
                return { status: 'rejected', key: config.key, reason: errorMsg };
            }
        });

        await Promise.allSettled(promises);
        onComplete?.(this.resourceMap);
        return this.resourceMap;
    }

    /**
     * 获取已加载的资源
     */
    get<T = any>(key: string): T | undefined {
        return this.resourceMap.get(key);
    }

    /**
     * 获取所有资源
     */
    getAll(): Map<string, any> {
        return this.resourceMap;
    }

    /**
     * 清除资源
     */
    clear(key?: string): void {
        if (key) {
            this.resourceMap.delete(key);
        } else {
            this.resourceMap.clear();
        }
    }

    /**
     * 检查资源是否已加载
     */
    has(key: string): boolean {
        return this.resourceMap.has(key);
    }
}

/**
 * 全局资源加载器实例
 */
export const globalResourceLoader = new ResourceLoader();

