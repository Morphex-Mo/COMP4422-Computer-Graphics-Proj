/**
 * 场景配置 - 相机、渲染器等共享配置
 */

import * as THREE from 'three';

/**
 * 相机配置接口
 */
export interface CameraConfig {
    /** 相机类型 */
    type: 'perspective' | 'orthographic';
    /** 透视相机配置 */
    perspective?: {
        fov: number;
        near: number;
        far: number;
    };
    /** 正交相机配置 */
    orthographic?: {
        left: number;
        right: number;
        top: number;
        bottom: number;
        near: number;
        far: number;
    };
    /** 初始位置 */
    position?: { x: number; y: number; z: number };
    /** 初始旋转 */
    rotation?: { x: number; y: number; z: number };
    /** 初始目标点 */
    lookAt?: { x: number; y: number; z: number };
}

/**
 * 渲染器配置接口
 */
export interface RendererConfig {
    /** 抗锯齿 */
    antialias?: boolean;
    /** 像素比 */
    pixelRatio?: number;
    /** 阴影 */
    shadowMap?: {
        enabled: boolean;
        type?: THREE.ShadowMapType;
    };
    /** 色调映射 */
    toneMapping?: THREE.ToneMapping;
    /** 曝光度 */
    toneMappingExposure?: number;
    /** 输出编码 */
    outputColorSpace?: THREE.ColorSpace;
}

/**
 * 场景环境配置接口
 */
export interface SceneEnvironmentConfig {
    /** 背景颜色 */
    backgroundColor?: number | string;
    /** 雾效 */
    fog?: {
        type: 'linear' | 'exponential';
        color: number | string;
        near?: number;
        far?: number;
        density?: number;
    };
    /** 环境光 */
    ambientLight?: {
        color: number | string;
        intensity: number;
    };
    /** 方向光 */
    directionalLight?: {
        color: number | string;
        intensity: number;
        position: { x: number; y: number; z: number };
        castShadow?: boolean;
    };
}

/**
 * 预设相机配置
 */
export const CameraPresets = {
    /** 默认透视相机 */
    default: {
        type: 'perspective' as const,
        perspective: {
            fov: 75,
            near: 0.1,
            far: 1000
        },
        position: { x: 0, y: 5, z: 10 },
        lookAt: { x: 0, y: 0, z: 0 }
    },
    /** 俯视角相机 */
    topDown: {
        type: 'perspective' as const,
        perspective: {
            fov: 60,
            near: 0.1,
            far: 1000
        },
        position: { x: 0, y: 20, z: 0 },
        lookAt: { x: 0, y: 0, z: 0 }
    },
    /** 第一人称相机 */
    firstPerson: {
        type: 'perspective' as const,
        perspective: {
            fov: 75,
            near: 0.1,
            far: 1000
        },
        position: { x: 0, y: 1.6, z: 0 },
        lookAt: { x: 0, y: 1.6, z: -1 }
    },
    /** 正交相机 */
    orthographic: {
        type: 'orthographic' as const,
        orthographic: {
            left: -10,
            right: 10,
            top: 10,
            bottom: -10,
            near: 0.1,
            far: 1000
        },
        position: { x: 0, y: 5, z: 10 },
        lookAt: { x: 0, y: 0, z: 0 }
    }
} as const;

/**
 * 预设渲染器配置
 */
export const RendererPresets = {
    /** 默认配置 */
    default: {
        antialias: true,
        pixelRatio: window.devicePixelRatio,
        shadowMap: {
            enabled: false
        },
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.0,
        outputColorSpace: THREE.SRGBColorSpace
    },
    /** 高质量配置 */
    highQuality: {
        antialias: true,
        pixelRatio: Math.min(window.devicePixelRatio, 2),
        shadowMap: {
            enabled: true,
            type: THREE.PCFSoftShadowMap
        },
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.2,
        outputColorSpace: THREE.SRGBColorSpace
    },
    /** 性能优先配置 */
    performance: {
        antialias: false,
        pixelRatio: 1,
        shadowMap: {
            enabled: false
        },
        toneMapping: THREE.NoToneMapping,
        toneMappingExposure: 1.0,
        outputColorSpace: THREE.SRGBColorSpace
    }
} as const;

/**
 * 预设场景环境配置
 */
export const SceneEnvironmentPresets = {
    /** 默认环境 */
    default: {
        backgroundColor: 0x1a1a2e,
        ambientLight: {
            color: 0xffffff,
            intensity: 0.6
        },
        directionalLight: {
            color: 0xffffff,
            intensity: 0.8,
            position: { x: 5, y: 10, z: 5 },
            castShadow: false
        }
    },
    /** 白天室外 */
    daylight: {
        backgroundColor: 0x87ceeb,
        ambientLight: {
            color: 0xffffff,
            intensity: 0.8
        },
        directionalLight: {
            color: 0xffffff,
            intensity: 1.0,
            position: { x: 10, y: 20, z: 10 },
            castShadow: true
        },
        fog: {
            type: 'linear' as const,
            color: 0x87ceeb,
            near: 50,
            far: 200
        }
    },
    /** 夜晚 */
    night: {
        backgroundColor: 0x000022,
        ambientLight: {
            color: 0x4444ff,
            intensity: 0.3
        },
        directionalLight: {
            color: 0x8888ff,
            intensity: 0.5,
            position: { x: -5, y: 10, z: 5 },
            castShadow: true
        }
    },
    /** 室内 */
    indoor: {
        backgroundColor: 0x2a2a2a,
        ambientLight: {
            color: 0xffffff,
            intensity: 0.5
        },
        directionalLight: {
            color: 0xfff8dc,
            intensity: 0.6,
            position: { x: 0, y: 10, z: 0 },
            castShadow: true
        }
    }
} as const;

/**
 * 根据配置创建相机
 */
export function createCamera(config: CameraConfig, aspect: number = window.innerWidth / window.innerHeight): THREE.Camera {
    let camera: THREE.Camera;

    if (config.type === 'perspective') {
        const perspectiveConfig = config.perspective || CameraPresets.default.perspective;
        camera = new THREE.PerspectiveCamera(
            perspectiveConfig.fov,
            aspect,
            perspectiveConfig.near,
            perspectiveConfig.far
        );
    } else {
        const orthoConfig = config.orthographic || CameraPresets.orthographic.orthographic!;
        const width = orthoConfig.right - orthoConfig.left;
        const height = orthoConfig.top - orthoConfig.bottom;
        camera = new THREE.OrthographicCamera(
            orthoConfig.left * aspect,
            orthoConfig.right * aspect,
            orthoConfig.top,
            orthoConfig.bottom,
            orthoConfig.near,
            orthoConfig.far
        );
    }

    // 设置位置
    if (config.position) {
        camera.position.set(config.position.x, config.position.y, config.position.z);
    }

    // 设置旋转
    if (config.rotation) {
        camera.rotation.set(config.rotation.x, config.rotation.y, config.rotation.z);
    }

    // 设置目标点
    if (config.lookAt) {
        camera.lookAt(config.lookAt.x, config.lookAt.y, config.lookAt.z);
    }

    return camera;
}

/**
 * 根据配置创建渲染器
 */
export function createRenderer(config: RendererConfig): THREE.WebGLRenderer {
    const renderer = new THREE.WebGLRenderer({
        antialias: config.antialias ?? true
    });

    renderer.setSize(window.innerWidth, window.innerHeight);

    if (config.pixelRatio !== undefined) {
        renderer.setPixelRatio(config.pixelRatio);
    }

    if (config.shadowMap) {
        renderer.shadowMap.enabled = config.shadowMap.enabled;
        if (config.shadowMap.type) {
            renderer.shadowMap.type = config.shadowMap.type;
        }
    }

    if (config.toneMapping !== undefined) {
        renderer.toneMapping = config.toneMapping;
    }

    if (config.toneMappingExposure !== undefined) {
        renderer.toneMappingExposure = config.toneMappingExposure;
    }

    if (config.outputColorSpace !== undefined) {
        renderer.outputColorSpace = config.outputColorSpace;
    }

    return renderer;
}

/**
 * 应用场景环境配置
 */
export function applySceneEnvironment(scene: THREE.Scene, config: SceneEnvironmentConfig): void {
    // 设置背景颜色
    if (config.backgroundColor !== undefined) {
        scene.background = new THREE.Color(config.backgroundColor);
    }

    // 设置雾效
    if (config.fog) {
        if (config.fog.type === 'linear') {
            scene.fog = new THREE.Fog(
                config.fog.color,
                config.fog.near || 1,
                config.fog.far || 1000
            );
        } else {
            scene.fog = new THREE.FogExp2(
                config.fog.color,
                config.fog.density || 0.00025
            );
        }
    }

    // 添加环境光
    if (config.ambientLight) {
        const ambientLight = new THREE.AmbientLight(
            config.ambientLight.color,
            config.ambientLight.intensity
        );
        scene.add(ambientLight);
    }

    // 添加方向光
    if (config.directionalLight) {
        const directionalLight = new THREE.DirectionalLight(
            config.directionalLight.color,
            config.directionalLight.intensity
        );
        directionalLight.position.set(
            config.directionalLight.position.x,
            config.directionalLight.position.y,
            config.directionalLight.position.z
        );
        if (config.directionalLight.castShadow) {
            directionalLight.castShadow = true;
        }
        scene.add(directionalLight);
    }
}

/**
 * 全局场景工具类 - 管理共享的相机和渲染器
 */
export class GlobalSceneUtils {
    private static camera: THREE.Camera | null = null;
    private static renderer: THREE.WebGLRenderer | null = null;
    private static cameraConfig: CameraConfig | null = null;
    private static rendererConfig: RendererConfig | null = null;
    private static resizeHandler: (() => void) | null = null;

    /**
     * 初始化全局相机和渲染器
     */
    static initialize(cameraConfig: CameraConfig, rendererConfig: RendererConfig): void {
        this.cameraConfig = cameraConfig;
        this.rendererConfig = rendererConfig;
        this.camera = createCamera(cameraConfig);
        this.renderer = createRenderer(rendererConfig);

        // 添加窗口大小调整监听
        this.setupResizeHandler();
    }

    /**
     * 使用预设初始化
     */
    static initializeWithPresets(
        cameraPreset: keyof typeof CameraPresets = 'default',
        rendererPreset: keyof typeof RendererPresets = 'default'
    ): void {
        this.initialize(
            { ...CameraPresets[cameraPreset] },
            { ...RendererPresets[rendererPreset] }
        );
    }

    /**
     * 获取全局相机
     */
    static getCamera(): THREE.Camera {
        if (!this.camera) {
            console.warn('[GlobalSceneUtils] Camera not initialized, using default');
            this.initializeWithPresets();
        }
        return this.camera!;
    }

    /**
     * 获取全局渲染器
     */
    static getRenderer(): THREE.WebGLRenderer {
        if (!this.renderer) {
            console.warn('[GlobalSceneUtils] Renderer not initialized, using default');
            this.initializeWithPresets();
        }
        return this.renderer!;
    }

    /**
     * 重置相机到配置的初始状态
     */
    static resetCamera(): void {
        if (!this.cameraConfig || !this.camera) return;

        if (this.cameraConfig.position) {
            this.camera.position.set(
                this.cameraConfig.position.x,
                this.cameraConfig.position.y,
                this.cameraConfig.position.z
            );
        }

        if (this.cameraConfig.rotation) {
            this.camera.rotation.set(
                this.cameraConfig.rotation.x,
                this.cameraConfig.rotation.y,
                this.cameraConfig.rotation.z
            );
        }

        if (this.cameraConfig.lookAt) {
            this.camera.lookAt(
                this.cameraConfig.lookAt.x,
                this.cameraConfig.lookAt.y,
                this.cameraConfig.lookAt.z
            );
        }
    }

    /**
     * 设置渲染目标容器
     */
    static attachToContainer(containerId: string = 'app'): void {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`[GlobalSceneUtils] Container ${containerId} not found`);
            return;
        }

        const renderer = this.getRenderer();
        container.innerHTML = '';
        container.appendChild(renderer.domElement);
    }

    /**
     * 设置窗口大小调整处理
     */
    private static setupResizeHandler(): void {
        if (this.resizeHandler) {
            window.removeEventListener('resize', this.resizeHandler);
        }

        this.resizeHandler = () => {
            if (!this.camera || !this.renderer) return;

            const aspect = window.innerWidth / window.innerHeight;

            if (this.camera instanceof THREE.PerspectiveCamera) {
                this.camera.aspect = aspect;
                this.camera.updateProjectionMatrix();
            } else if (this.camera instanceof THREE.OrthographicCamera) {
                const width = this.camera.right - this.camera.left;
                this.camera.left = -width / 2 * aspect;
                this.camera.right = width / 2 * aspect;
                this.camera.updateProjectionMatrix();
            }

            this.renderer.setSize(window.innerWidth, window.innerHeight);
        };

        window.addEventListener('resize', this.resizeHandler);
    }

    /**
     * 清理资源
     */
    static dispose(): void {
        if (this.resizeHandler) {
            window.removeEventListener('resize', this.resizeHandler);
            this.resizeHandler = null;
        }

        if (this.renderer) {
            this.renderer.dispose();
            this.renderer = null;
        }

        this.camera = null;
        this.cameraConfig = null;
        this.rendererConfig = null;
    }
}

