uniform vec3 uColor;
uniform vec3 uLightPosition;
uniform vec3 uLightColor;
uniform float uShadowThreshold;
uniform float uShadowSmoothness;
uniform float uSpecularThreshold;
uniform float uSpecularSmoothness;
uniform float uRimThreshold;
uniform float uRimAmount;
uniform vec3 uRimColor;
uniform sampler2D uTexture;
uniform bool uUseTexture;

varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec2 vUv;

void main() {
    vec3 normal = normalize(vNormal);
    vec3 viewDir = normalize(vViewPosition);
    vec3 lightDir = normalize(uLightPosition - vViewPosition);

    // 基础颜色（纹理或纯色）
    vec3 baseColor = uColor;
    if (uUseTexture) {
        vec4 texColor = texture2D(uTexture, vUv);
        baseColor *= texColor.rgb;
    }

    // 漫反射光照（多级阶梯化）
    float NdotL = dot(normal, lightDir);

    // 3级色阶的动漫风格光照
    float lightIntensity = smoothstep(uShadowThreshold - uShadowSmoothness,
    uShadowThreshold + uShadowSmoothness,
    NdotL);

    // 创建明显的明暗分界线
    float shadowIntensity = step(0.0, NdotL);
    lightIntensity = mix(0.5, 1.0, lightIntensity); // 阴影区域保留50%亮度

    vec3 diffuse = baseColor * uLightColor * lightIntensity;

    // 高光（动漫风格的硬边高光）
    vec3 halfDir = normalize(lightDir + viewDir);
    float NdotH = dot(normal, halfDir);
    float specularIntensity = pow(NdotH * lightIntensity, 32.0);
    specularIntensity = smoothstep(uSpecularThreshold - uSpecularSmoothness,
    uSpecularThreshold + uSpecularSmoothness,
    specularIntensity);
    vec3 specular = uLightColor * specularIntensity;

    // 边缘光（Rim Light）- 动漫常见的轮廓光
    float rimDot = 1.0 - dot(viewDir, normal);
    float rimIntensity = rimDot * pow(NdotL, uRimThreshold);
    rimIntensity = smoothstep(uRimAmount - 0.01, uRimAmount + 0.01, rimIntensity);
    vec3 rim = uRimColor * rimIntensity;

    // 环境光
    vec3 ambient = baseColor * 0.3;

    // 组合所有光照
    vec3 finalColor = ambient + diffuse + specular + rim;

    gl_FragColor = vec4(finalColor, 1.0);
}