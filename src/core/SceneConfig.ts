import * as THREE from 'three';

export interface CameraConfig {
    type: 'perspective' | 'orthographic';
    perspective?: {
        fov: number;
        near: number;
        far: number;
    };
    orthographic?: {
        left: number;
        right: number;
        top: number;
        bottom: number;
        near: number;
        far: number;
    };
    position?: { x: number; y: number; z: number };
    rotation?: { x: number; y: number; z: number };
    lookAt?: { x: number; y: number; z: number };
}

export interface RendererConfig {
    antialias?: boolean;
    pixelRatio?: number;
    shadowMap?: {
        enabled: boolean;
        type?: THREE.ShadowMapType;
    };
    toneMapping?: THREE.ToneMapping;
    toneMappingExposure?: number;
    outputColorSpace?: THREE.ColorSpace;
}

export interface SceneEnvironmentConfig {
    backgroundColor?: number | string;
    fog?: {
        type: 'linear' | 'exponential';
        color: number | string;
        near?: number;
        far?: number;
        density?: number;
    };
    ambientLight?: {
        color: number | string;
        intensity: number;
    };
    directionalLight?: {
        color: number | string;
        intensity: number;
        position: { x: number; y: number; z: number };
        castShadow?: boolean;
    };
}

export const CameraPresets = {
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

export const RendererPresets = {
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

export const SceneEnvironmentPresets = {
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

    if (config.position) {
        camera.position.set(config.position.x, config.position.y, config.position.z);
    }

    if (config.rotation) {
        camera.rotation.set(config.rotation.x, config.rotation.y, config.rotation.z);
    }

    if (config.lookAt) {
        camera.lookAt(config.lookAt.x, config.lookAt.y, config.lookAt.z);
    }

    return camera;
}

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

export function applySceneEnvironment(scene: THREE.Scene, config: SceneEnvironmentConfig): void {
    if (config.backgroundColor !== undefined) {
        scene.background = new THREE.Color(config.backgroundColor);
    }

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

    if (config.ambientLight) {
        const ambientLight = new THREE.AmbientLight(
            config.ambientLight.color,
            config.ambientLight.intensity
        );
        scene.add(ambientLight);
    }

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

export class GlobalSceneUtils {
    private static camera: THREE.Camera | null = null;
    private static renderer: THREE.WebGLRenderer | null = null;
    private static cameraConfig: CameraConfig | null = null;
    private static rendererConfig: RendererConfig | null = null;
    private static resizeHandler: (() => void) | null = null;

    static initialize(cameraConfig: CameraConfig, rendererConfig: RendererConfig): void {
        this.cameraConfig = cameraConfig;
        this.rendererConfig = rendererConfig;
        this.camera = createCamera(cameraConfig);
        this.renderer = createRenderer(rendererConfig);

        this.setupResizeHandler();
    }

    static initializeWithPresets(
        cameraPreset: keyof typeof CameraPresets = 'default',
        rendererPreset: keyof typeof RendererPresets = 'default'
    ): void {
        this.initialize(
            { ...CameraPresets[cameraPreset] },
            { ...RendererPresets[rendererPreset] }
        );
    }

    static getCamera(): THREE.Camera {
        if (!this.camera) {
            console.warn('[GlobalSceneUtils] Camera not initialized, using default');
            this.initializeWithPresets();
        }
        return this.camera!;
    }

    static getRenderer(): THREE.WebGLRenderer {
        if (!this.renderer) {
            console.warn('[GlobalSceneUtils] Renderer not initialized, using default');
            this.initializeWithPresets();
        }
        return this.renderer!;
    }

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

