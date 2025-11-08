# Three.js 光照和雾系统说明

## 概述

本文档详细说明了 Three.js 如何向自定义 Shader 传递光照和雾信息。

## 关键概念

### 1. Three.js Chunk 系统

Three.js 使用 **chunk 系统** 来管理 shader 代码片段。当你在 GLSL 代码中使用 `#include <chunk_name>` 时，Three.js 会在编译时将其替换为预定义的 GLSL 代码。

**注意：** IDE 可能会将 `#include` 标记为错误，这是正常的！`#include` 不是标准 GLSL 语法，而是 Three.js 的预处理指令。程序运行时是正确的。

### 2. 必需的设置

#### TypeScript/JavaScript 端：

```typescript
const material = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([
        // 【关键】必须合并 Three.js 的内置 uniforms
        THREE.UniformsLib.lights,  // 光照 uniforms
        THREE.UniformsLib.fog,     // 雾 uniforms
        // 你的自定义 uniforms
        {
            uCustomParam: { value: 1.0 }
        }
    ]),
    lights: true,  // 【关键】启用光照
    fog: true,     // 【关键】启用雾
    vertexShader: vertexShaderCode,
    fragmentShader: fragmentShaderCode,
});
```

#### GLSL 端（Fragment Shader）：

```glsl
// 包含通用定义（PI、saturate 等函数）
#include <common>

// 包含光照相关的结构体和 uniforms
#include <lights_pars_begin>

// 包含雾相关的 uniforms
#include <fog_pars_fragment>
```

## Three.js 自动注入的内容

### 通过 `#include <lights_pars_begin>` 注入

```glsl
// 方向光结构体
struct DirectionalLight {
    vec3 direction;  // 光照方向（已归一化）
    vec3 color;      // 光照颜色（RGB）
};

// 点光源结构体
struct PointLight {
    vec3 position;   // 光源位置（世界空间）
    vec3 color;      // 光照颜色（RGB）
    float distance;  // 光照影响距离
    float decay;     // 衰减系数
};

// 聚光灯结构体
struct SpotLight {
    vec3 position;
    vec3 direction;
    vec3 color;
    float distance;
    float decay;
    float coneCos;
    float penumbraCos;
};

// 半球光结构体
struct HemisphereLight {
    vec3 direction;
    vec3 skyColor;
    vec3 groundColor;
};

// 光源数组（数组大小由宏定义）
uniform DirectionalLight directionalLights[NUM_DIR_LIGHTS];
uniform PointLight pointLights[NUM_POINT_LIGHTS];
uniform SpotLight spotLights[NUM_SPOT_LIGHTS];
uniform HemisphereLight hemisphereLights[NUM_HEMI_LIGHTS];

// 环境光颜色
uniform vec3 ambientLightColor;
```

### 通过 `#include <fog_pars_fragment>` 注入

```glsl
uniform vec3 fogColor;      // 雾的颜色
uniform float fogNear;      // 线性雾开始距离（用于 Fog）
uniform float fogFar;       // 线性雾结束距离（用于 Fog）
uniform float fogDensity;   // 雾密度（用于 FogExp2）
```

### 通过 `#include <common>` 注入

```glsl
#define PI 3.141592653589793
#define EPSILON 1e-6

uniform vec3 cameraPosition;  // 相机位置（世界空间）

// 常用函数
float saturate(float a) { return clamp(a, 0.0, 1.0); }
vec3 saturate(vec3 a) { return clamp(a, 0.0, 1.0); }
// ... 更多工具函数
```

## 自动定义的宏

Three.js 会根据场景中的光源数量自动定义以下宏：

```glsl
NUM_DIR_LIGHTS      // 方向光数量
NUM_POINT_LIGHTS    // 点光源数量
NUM_SPOT_LIGHTS     // 聚光灯数量
NUM_HEMI_LIGHTS     // 半球光数量
```

雾相关的宏：

```glsl
USE_FOG             // 如果场景有雾
FOG_EXP2            // 如果使用指数雾（FogExp2）
```

## 使用示例

### 1. 处理方向光

```glsl
vec3 totalLight = vec3(0.0);

#if NUM_DIR_LIGHTS > 0
    for(int i = 0; i < NUM_DIR_LIGHTS; i++) {
        vec3 lightDir = normalize(-directionalLights[i].direction);
        vec3 lightColor = directionalLights[i].color;
        
        float diff = max(dot(normal, lightDir), 0.0);
        totalLight += lightColor * diff;
    }
#endif
```

### 2. 处理点光源（带衰减）

```glsl
#if NUM_POINT_LIGHTS > 0
    for(int i = 0; i < NUM_POINT_LIGHTS; i++) {
        vec3 lightDir = pointLights[i].position - vWorldPosition;
        float distance = length(lightDir);
        lightDir = normalize(lightDir);
        
        // 物理正确的衰减
        float attenuation = 1.0 / (distance * distance);
        vec3 lightColor = pointLights[i].color * attenuation;
        
        float diff = max(dot(normal, lightDir), 0.0);
        totalLight += lightColor * diff;
    }
#endif
```

### 3. 应用环境光

```glsl
// ambientLightColor 由 Three.js 自动注入
vec3 ambient = ambientLightColor * baseColor;
```

### 4. 应用雾效果

```glsl
#ifdef USE_FOG
    float fogDepth = length(vViewPosition);  // 相机到片段的距离
    
    #ifdef FOG_EXP2
        // 指数雾
        float fogFactor = 1.0 - exp(-fogDensity * fogDensity * fogDepth * fogDepth);
    #else
        // 线性雾
        float fogFactor = smoothstep(fogNear, fogFar, fogDepth);
    #endif
    
    // 混合雾颜色
    finalColor = mix(finalColor, fogColor, fogFactor);
#endif
```

## 在 JavaScript 中设置光源和雾

### 添加光源

```typescript
// 环境光
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

// 方向光
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(10, 20, 10);
scene.add(directionalLight);

// 点光源
const pointLight = new THREE.PointLight(0xff0000, 1.0, 100);
pointLight.position.set(0, 5, 0);
scene.add(pointLight);
```

### 添加雾

```typescript
// 线性雾
scene.fog = new THREE.Fog(
    0x87ceeb,  // 颜色（天蓝色）
    5,         // 近距离
    25         // 远距离
);

// 或者指数雾
scene.fog = new THREE.FogExp2(
    0x87ceeb,  // 颜色
    0.05       // 密度
);
```

## 常见问题

### Q: 为什么我的 shader 报错 "undeclared identifier"？

**A:** 确保你在 TypeScript 中正确合并了 uniforms：

```typescript
uniforms: THREE.UniformsUtils.merge([
    THREE.UniformsLib.lights,  // 必须包含！
    THREE.UniformsLib.fog,     // 如果使用雾，必须包含！
    { /* 你的自定义 uniforms */ }
])
```

### Q: 为什么光照没有效果？

**A:** 检查以下几点：
1. `ShaderMaterial` 设置了 `lights: true`
2. 场景中确实添加了光源
3. GLSL 中包含了 `#include <lights_pars_begin>`
4. 顶点着色器正确传递了法线和位置

### Q: IDE 报错 "#include" 是保留关键字？

**A:** 这是正常的！`#include` 不是标准 GLSL，而是 Three.js 的预处理指令。运行时 Three.js 会处理它。可以忽略 IDE 的这个错误。

### Q: 如何调试 shader 代码？

**A:** 你可以在控制台查看编译后的 shader：

```typescript
console.log(material.vertexShader);
console.log(material.fragmentShader);
```

Three.js 会在第一次渲染后将 `#include` 替换为实际代码。

## 参考资源

- [Three.js ShaderChunk 源码](https://github.com/mrdoob/three.js/tree/dev/src/renderers/shaders/ShaderChunk)
- [Three.js UniformsLib 源码](https://github.com/mrdoob/three.js/blob/dev/src/renderers/shaders/UniformsLib.js)
- [Three.js 自定义材质文档](https://threejs.org/docs/#api/en/materials/ShaderMaterial)

## 总结

Three.js 的光照和雾系统通过以下方式工作：

1. **TypeScript 端**：通过 `UniformsUtils.merge()` 合并内置 uniforms，设置 `lights: true` 和 `fog: true`
2. **GLSL 端**：使用 `#include` 指令注入光照和雾的结构体、uniforms 和宏定义
3. **运行时**：Three.js 自动：
   - 统计场景中的光源数量，定义相应的宏
   - 将光源数据传递给 uniforms
   - 将 `#include` 替换为实际的 GLSL 代码

这种设计让你可以编写与 Three.js 光照系统完全集成的自定义 shader！

