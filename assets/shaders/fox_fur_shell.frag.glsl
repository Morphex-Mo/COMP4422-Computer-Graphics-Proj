#version 300 es
precision highp float;

uniform vec3 uFurColor;
uniform vec3 uFurTipColor;
uniform float uAlphaFalloff;

uniform int   uToonSteps;
uniform bool  uUseRamp;
uniform sampler2D uRampTex;

uniform vec3  cameraPosition;

in vec3 vNormal;
in vec3 vWorldPos;
in vec2 vUv;
in float vLayerFrac;

out vec4 outColor;

#include <common>
#include <lights_pars_begin>

// 简化：只方向光 + 点光 Toon 漫反射
float quantize(float x, int steps) {
    float s = float(steps);
    return floor(x * s) / (s - 1.0);
}

vec3 furShading(vec3 N, vec3 baseCol) {
    vec3 result = vec3(0.0);

    // Directional
    #if NUM_DIR_LIGHTS > 0
    for (int i = 0; i < NUM_DIR_LIGHTS; i++) {
        vec3 L = normalize(-directionalLights[i].direction);
        float ndotl = max(dot(N, L), 0.0);
        float q = quantize(ndotl, uToonSteps);
        vec3 diffuse = baseCol * q * directionalLights[i].color;
        result += diffuse;
    }
    #endif

    // Point Lights
    #if NUM_POINT_LIGHTS > 0
    for (int i = 0; i < NUM_POINT_LIGHTS; i++) {
        vec3 L = normalize(pointLights[i].position - vWorldPos);
        float dist = length(pointLights[i].position - vWorldPos);
        float atten = 1.0 / (1.0 + 0.14 * dist + 0.07 * dist * dist);
        float ndotl = max(dot(N, L), 0.0);
        float q = quantize(ndotl, uToonSteps);
        vec3 diffuse = baseCol * q * pointLights[i].color * atten;
        result += diffuse;
    }
    #endif

    return result;
}

void main() {
    vec3 N = normalize(vNormal);
    vec3 viewDir = normalize(cameraPosition - vWorldPos);

    // 颜色沿层数渐变：根部 -> 尖端
    vec3 baseCol = mix(uFurColor, uFurTipColor, vLayerFrac);

    vec3 lightCol = furShading(N, baseCol);

    // 简单 rim 强化
    float rim = pow(1.0 - max(dot(viewDir, N), 0.0), 2.0);
    lightCol += baseCol * rim * 0.3;

    // 透明度：越外层越透明
    float alpha = 1.0 - vLayerFrac;
    alpha = pow(alpha, uAlphaFalloff);

    // 可选 Ramp 微调 (用于更柔和的 toon)
    if (uUseRamp) {
        float luma = dot(lightCol, vec3(0.299, 0.587, 0.114));
        vec3 rampSample = texture(uRampTex, vec2(clamp(luma, 0.0, 1.0), 0.5)).rgb;
        lightCol = rampSample * (length(lightCol) + 0.0001);
    }

    // Tone map + gamma
    lightCol = lightCol / (lightCol + vec3(1.0));
    lightCol = pow(lightCol, vec3(1.0/2.2));

    outColor = vec4(lightCol, alpha);

    // 丢弃非常透明的层以减少过度混合
    if (outColor.a < 0.02) discard;
}