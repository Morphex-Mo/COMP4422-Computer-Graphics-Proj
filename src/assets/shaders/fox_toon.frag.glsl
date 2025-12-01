#define ENV_WORLDPOS
#define USE_ENVMAP
#include <common>
#include <packing>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <envmap_pars_fragment>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>
#include <fog_pars_fragment> // ADDED

uniform vec3 uColor;
uniform vec3 uLightDirection;
uniform vec3 uLightColor;
uniform float uShadowThreshold;
uniform float uShadowSmoothness;
uniform float uSpecularThreshold;
uniform float uSpecularSmoothness;
uniform float uSpecularPower;
uniform float uDiffuseStrength;
uniform float uRimThreshold;
uniform float uRimAmount;
uniform vec3 uRimColor;
uniform sampler2D uTexture;
uniform bool uUseTexture;
uniform float uShadowIntensity;
uniform float uAmbientStrength; // 新增：环境光强度
uniform float uSpecularIntensity; // 新增：高光强度

varying vec3 vViewPosition;
varying vec2 vUv;

// 自定义阴影计算函数
float getAnimeShadow() {
    float shadow = 1.0;

    #ifdef USE_SHADOWMAP
    #if NUM_DIR_LIGHT_SHADOWS > 0
    shadow = getShadowMask();
    #endif
    #endif

    return mix(uShadowIntensity, 1.0, shadow);
}

// 平滑阶跃函数 - 减少硬边陶瓷感
float smoothAnimeStep(float edge, float smoothness, float x) {
    return smoothstep(edge - smoothness, edge + smoothness, x);
}

// 多级柔和阶跃函数
float multiSmoothStep(float threshold1, float threshold2, float smoothness, float x) {
    if (x > threshold2) {
        return mix(0.8, 1.0, smoothstep(threshold2 - smoothness, threshold2 + smoothness, x));
    } else if (x > threshold1) {
        return mix(0.5, 0.8, smoothstep(threshold1 - smoothness, threshold1 + smoothness, x));
    } else {
        return mix(0.3, 0.5, smoothstep(threshold1 - smoothness * 2.0, threshold1, x));
    }
}

void main() {
    #include <normal_fragment_begin>
    vec3 viewDir = normalize(vViewPosition);

    vec3 lightDir = normalize(-uLightDirection);

    vec3 baseColor = uColor;
    if (uUseTexture) {
        vec4 texColor = texture2D(uTexture, vUv);
        baseColor *= texColor.rgb;
    }

    float shadow = getAnimeShadow();

    float NdotL = dot(normal, lightDir);

    float lightIntensity = multiSmoothStep(
    uShadowThreshold - uShadowSmoothness,
    uShadowThreshold + uShadowSmoothness,
    0.01,
    (NdotL*0.5+0.5)
    );

    lightIntensity *= shadow;

    vec3 diffuse = baseColor * uLightColor * lightIntensity * uDiffuseStrength;

    vec3 halfDir = normalize(lightDir + viewDir);
    float NdotH = max(dot(normal, halfDir), 0.0);

    float specularBase = pow(NdotH, uSpecularPower);
    float specularIntensity = smoothAnimeStep(
    uSpecularThreshold,
    uSpecularSmoothness * 2.0,
    specularBase
    ) * lightIntensity * uSpecularIntensity;

    vec3 specular = mix(baseColor * 0.5, vec3(1.0), 0.3) * specularIntensity * 0.4;

    float rimDot = 1.0 - dot(viewDir, normal);
    float rimIntensity = rimDot * pow(max(NdotL, 0.0), uRimThreshold);
    rimIntensity = smoothAnimeStep(uRimAmount, 0.1, rimIntensity) * lightIntensity;
    vec3 rim = uRimColor * rimIntensity * 0.3;

    vec3 ambient = baseColor * mix(uAmbientStrength, uAmbientStrength * 1.5, shadow);

    vec3 finalColor = ambient + diffuse + specular + rim;

    gl_FragColor = vec4(finalColor, 1.0);
    #include <fog_fragment> // ADDED
}