#version 300 es
precision highp float;

// Fur Shell 顶点着色器 (WebGL2)
// 使用 gl_InstanceID 计算当前毛发层的偏移
// 要在 Three.js 中使用：ShaderMaterial({ glslVersion: THREE.GLSL3 })

in vec3 position;
in vec3 normal;
in vec2 uv;

uniform mat4 modelMatrix;
uniform mat4 viewMatrix;
uniform mat4 projectionMatrix;
uniform mat3 normalMatrix;

uniform float uTime;
uniform float uFurLength;
uniform int   uNumLayers;
uniform vec3  uWindDir;
uniform float uWindStrength;
uniform float uGravity;
uniform float uShellJitter;

uniform sampler2D uFurNoiseTex;

out vec3 vNormal;
out vec3 vWorldPos;
out vec2 vUv;
out float vLayerFrac;

void main() {
    int layer = gl_InstanceID;
    float layerFrac = float(layer) / float(uNumLayers - 1); // [0,1]
    vLayerFrac = layerFrac;

    // 基础位置
    vec3 pos = position;

    // 噪声（基于 UV + 层扰动）
    float noise = texture(uFurNoiseTex, uv + vec2(layerFrac * 0.1, layerFrac * 0.05)).r;

    // 沿法线外扩
    float shellOffset = uFurLength * layerFrac;
    // 抖动 (细微毛发分叉)
    float jitter = (noise - 0.5) * uShellJitter * (1.0 - layerFrac);

    vec3 wind = uWindDir * uWindStrength * sin(uTime * 1.5 + layerFrac * 6.2831);
    // 重力：稍微向下拉
    vec3 gravityVec = vec3(0.0, -uGravity * layerFrac, 0.0);

    vec3 finalPos = pos + normal * (shellOffset + jitter) + wind + gravityVec;

    vec4 worldPos = modelMatrix * vec4(finalPos, 1.0);
    vWorldPos = worldPos.xyz;
    vUv = uv;

    // 法线保持为原始 normal（近似）
    vNormal = normalize(normalMatrix * normal);

    gl_Position = projectionMatrix * viewMatrix * worldPos;
}