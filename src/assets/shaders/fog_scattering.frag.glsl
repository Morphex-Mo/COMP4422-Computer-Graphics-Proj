#include <common>
#include <packing>

uniform sampler2D tDiffuse;
uniform sampler2D tDepth;
uniform float cameraNear;
uniform float cameraFar;
uniform mat4 inverseProjectionMatrix;
uniform mat4 inverseViewMatrix;

uniform vec3 sunDirection;
uniform vec3 moonDirection;

uniform float mieDistance;
uniform float kr; // 8400.0
uniform float km; // 1200.0
uniform vec3 rayleighCoef; // ~e-6 (计算或固定值)
uniform vec3 mieCoef; // ~e-6
uniform vec3 mieG; // 例如 (0.758, 1.52, 1.2168)
uniform float scattering; // 15.0
uniform float skyLuminance; // 0.1
uniform float exposure; // 2.0
uniform vec3 rayleighColor; // 通常是白色
uniform vec3 mieColor; // 通常是白色

uniform float globalFogDistance;
uniform float globalFogSmooth;
uniform float globalFogDensity;
uniform float heightFogDistance;
uniform float heightFogSmooth;
uniform float heightFogDensity;
uniform float heightFogStart;
uniform float heightFogEnd;
uniform float fogBluishDistance;
uniform float fogBluishIntensity;
uniform float heightFogScatterMultiplier;

varying vec2 vUv;

vec3 getViewRayVS(vec2 uv) {
    vec2 ndc = uv * 2.0 - 1.0;
    vec4 rayClip = vec4(ndc, 1.0, 1.0);
    vec4 rayVS4 = inverseProjectionMatrix * rayClip;
    vec3 rayVS = rayVS4.xyz / rayVS4.w;
    return normalize(rayVS);
}

vec3 getWorldPositionFromDepth(float depth, vec2 uv) {
    float viewZ = perspectiveDepthToViewZ(depth, cameraNear, cameraFar);
    vec3 rayVS = getViewRayVS(uv);
    vec3 viewPos = rayVS * viewZ;
    vec4 worldPos4 = inverseViewMatrix * vec4(viewPos, 1.0);
    return worldPos4.xyz;
}

void main() {
    const float Pi316 = 0.0596831; // 3/(16π)
    const float Pi14 = 0.07957747; // 1/(4π)

    vec4 color = texture2D(tDiffuse, vUv);
    float fragCoordZ = texture2D(tDepth, vUv).x;

    // 天空：无雾效
    if (fragCoordZ >= 0.99999) {
        gl_FragColor = color;
        return;
    }

    float depthNDC = fragCoordZ;
    float viewZ = perspectiveDepthToViewZ(fragCoordZ, cameraNear, cameraFar);
    float dist = -viewZ;

    vec3 worldPos = getWorldPositionFromDepth(depthNDC, vUv);
    vec3 cameraPos = (inverseViewMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
    vec3 viewDir = normalize(worldPos - cameraPos);

    // 雾效遮罩
    float mieDepth = clamp(mix(dist / cameraFar, dist / 250.0, mieDistance), 0.0, 1.0);
    float globalFog = smoothstep(-globalFogSmooth, 1.25, dist / globalFogDistance) * globalFogDensity;
    float heightFogDist = smoothstep(-heightFogSmooth, 1.25, dist / heightFogDistance);
    float heightFog = clamp((worldPos.y - heightFogStart) / (heightFogEnd + heightFogStart), 0.0, 1.0);
    heightFog = 1.0 - heightFog;
    heightFog *= heightFog;
    heightFog *= heightFog;
    heightFog *= heightFogDist;
    heightFog *= heightFogDensity;
    float totalFog = clamp(globalFog + heightFog, 0.0, 1.0);

    // 方向
    float sunCosTheta = dot(viewDir, sunDirection);
    float moonCosTheta = dot(viewDir, moonDirection);
    float skyCosTheta = dot(viewDir, vec3(0.0, -1.0, 0.0));
    float r = length(vec3(0.0, 50.0, 0.0));
    float sunRise = clamp(dot(vec3(0.0, 500.0, 0.0), sunDirection) / r, 0.0, 1.0);
    float moonRise = clamp(dot(vec3(0.0, 500.0, 0.0), moonDirection) / r, 0.0, 1.0);
    float sunDot = dot(vec3(0.0, 1.0, 0.0), sunDirection);
    float moonDot = dot(vec3(0.0, 1.0, 0.0), moonDirection);

    // 光学深度 1 (地平线)
    float zenithSunset = 1.57079632679; // PI/2
    float z1 = cos(zenithSunset) + 0.15 * pow(93.885 - degrees(zenithSunset), -1.253);
    z1 = max(z1, 1e-4);
    float SR1 = kr / z1;
    float SM1 = km / z1;

    // 光学深度 2 (偏蓝的距离)
    float z2 = clamp((1.0 - depthNDC * (cameraFar / fogBluishDistance)) * fogBluishIntensity, 1e-4, 1.0);
    float SR2 = kr / z2;
    float SM2 = km / z2;

    // 光学深度 3 (背景/天顶)
    float zenith3 = acos(clamp(dot(vec3(0.0, 1.0, 0.0), viewDir), 0.0, 1.0));
    float z3 = cos(zenith3) + 0.15 * pow(93.885 - degrees(zenith3), -1.253);
    z3 = max(z3, 1e-4);
    float SR3 = kr / z3;
    float SM3 = km / z3;

    // 消光
    vec3 fex1 = exp(-(rayleighCoef * SR1 + mieCoef * SM1));
    vec3 fex2 = exp(-(rayleighCoef * SR2 + mieCoef * SM2));
    vec3 fex3 = exp(-(rayleighCoef * SR3 + mieCoef * SM3));
    float mixT = clamp(dist / cameraFar, 0.0, 1.0);
    vec3 fex = mix(fex2, fex3, mixT);

    // 默认天空光
    vec3 Esun = 1.0 - fex;
    float rayPhase = 2.0 + 0.5 * (skyCosTheta * skyCosTheta);
    vec3 BrTheta = Pi316 * rayleighCoef * rayPhase * rayleighColor;
    vec3 BrmTheta = BrTheta / (rayleighCoef + mieCoef);
    vec3 defaultDayLight = BrmTheta * Esun * scattering * skyLuminance * (1.0 - fex);
    defaultDayLight *= (1.0 - sunRise);
    defaultDayLight *= (1.0 - moonRise);

    // 太阳内散射
    fex = mix(fex1, fex2, sunDot - 0.1);
    fex = mix(fex, fex3, mixT);
    Esun = mix(fex, (1.0 - fex), sunDot);
    rayPhase = 2.0 + 0.5 * (sunCosTheta * sunCosTheta);
    float miePhase = mieG.x / pow(abs(mieG.y - mieG.z * sunCosTheta), 1.5);
    BrTheta = Pi316 * rayleighCoef * rayPhase * rayleighColor;
    vec3 BmTheta = Pi14 * mieCoef * miePhase * mieColor * mieDepth;
    BrmTheta = (BrTheta + BmTheta) / (rayleighCoef + mieCoef);
    vec3 sunInScatter = BrmTheta * Esun * scattering * (1.0 - fex);
    sunInScatter *= sunRise;

    // 月亮内散射
    fex = mix(fex1, fex2, moonDot - 0.1);
    fex = mix(fex, fex3, mixT);
    Esun = 1.0 - fex;
    rayPhase = 2.0 + 0.5 * (moonCosTheta * moonCosTheta);
    miePhase = mieG.x / pow(abs(mieG.y - mieG.z * moonCosTheta), 1.5);
    BrTheta = Pi316 * rayleighCoef * rayPhase * rayleighColor;
    BmTheta = Pi14 * mieCoef * miePhase * mieColor * mieDepth;
    BrmTheta = (BrTheta + BmTheta) / (rayleighCoef + mieCoef);
    vec3 moonInScatter = BrmTheta * Esun * scattering * 0.1 * (1.0 - fex);
    moonInScatter *= moonRise;
    moonInScatter *= (1.0 - sunRise);

    // 最终雾效颜色
    vec3 fogColor = defaultDayLight + sunInScatter + moonInScatter;
    fogColor += heightFog * heightFogScatterMultiplier;

    // 色调映射
    fogColor = clamp(1.0 - exp(-exposure * fogColor), 0.0, 1.0);

    // 如果你的渲染器输出sRGB（现代Three.js默认），这里不需要额外的gamma校正。
    // 如果你切换到线性输出，你可以添加：fogColor = pow(fogColor, vec3(2.2));

    vec3 finalColor = mix(color.rgb, fogColor, totalFog);
    gl_FragColor = vec4(finalColor, 1.0);
}