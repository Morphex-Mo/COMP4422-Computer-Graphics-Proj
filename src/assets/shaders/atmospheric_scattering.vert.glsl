// Atmospheric Scattering Skybox Vertex Shader
// 大气散射天空盒顶点着色器
varying vec3 vWorldPosition;
varying vec3 vSunDirection;
varying float vSunfade;
varying vec3 vBetaR;
varying vec3 vBetaM;
varying float vSunE;

uniform vec3 sunPosition;
uniform float rayleigh;
uniform float turbidity;
uniform float mieCoefficient;

const vec3 up = vec3(0.0, 1.0, 0.0);

// 常量
const float e = 2.71828182845904523536028747135266249775724709369995957;
const float pi = 3.141592653589793238462643383279502884197169;

// 波长（红、绿、蓝）
const vec3 lambda = vec3(680E-9, 550E-9, 450E-9);
const vec3 totalRayleigh = vec3(5.804542996261093E-6, 1.3562911419845635E-5, 3.0265902468824876E-5);

// Mie 散射系数
const float v = 4.0;

// Rayleigh 和 Mie 贡献的 Zenith 角度
const vec3 K = vec3(0.686, 0.678, 0.666);
const float cutoffAngle = 1.6110731556870734;
const float steepness = 1.5;
const float EE = 1000.0;

float sunIntensity(float zenithAngleCos) {
    zenithAngleCos = clamp(zenithAngleCos, -1.0, 1.0);
    return EE * max(0.0, 1.0 - pow(e, -((cutoffAngle - acos(zenithAngleCos)) / steepness)));
}

vec3 totalMie(float T) {
    float c = (0.2 * T) * 10E-18;
    return 0.434 * c * pi * pow((2.0 * pi) / lambda, vec3(v - 2.0)) * K;
}

void main() {
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    gl_Position.z = gl_Position.w; // 确保天空盒总是在最远处

    vSunDirection = normalize(sunPosition);

    vSunE = sunIntensity(dot(vSunDirection, up));

    vSunfade = 1.0 - clamp(1.0 - exp((sunPosition.y / 450000.0)), 0.0, 1.0);

    float rayleighCoefficient = rayleigh - (1.0 * (1.0 - vSunfade));

    // 计算 Rayleigh 和 Mie 系数
    vBetaR = totalRayleigh * rayleighCoefficient;
    vBetaM = totalMie(turbidity) * mieCoefficient;
}
