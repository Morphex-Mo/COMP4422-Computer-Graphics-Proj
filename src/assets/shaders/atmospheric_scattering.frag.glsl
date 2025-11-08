
uniform float custom_luminance;
uniform vec3 rayleighColor;  // Rayleigh 散射颜色
uniform vec3 mieColor;       // Mie 散射颜色
// 大气散射天空盒片段着色器
varying vec3 vWorldPosition;
varying vec3 vSunDirection;
varying float vSunfade;
varying vec3 vBetaR;
varying vec3 vBetaM;
varying float vSunE;

uniform float mieDirectionalG;
//uniform vec3 cameraPosition;

// 移除固定相机常量，使用 Three.js 提供的 cameraPosition
// const vec3 cameraPos = vec3(0.0, 0.0, 0.0);
const vec3 up = vec3(0.0, 1.0, 0.0);

// 常量
const float pi = 3.141592653589793238462643383279502884197169;

// 光学长度的简化计算常量
const float n = 1.0003; // 大气折射率
const float N = 2.545E25; // 海平面的分子数密度
const float pn = 0.035; // 去极化因子

// Rayleigh 相位函数
float rayleighPhase(float cosTheta) {
    return (3.0 / (16.0 * pi)) * (1.0 + pow(cosTheta, 2.0));
}

// Mie 相位函数 (Henyey-Greenstein)
float hgPhase(float cosTheta, float g) {
    float g2 = pow(g, 2.0);
    float inverse = 1.0 / pow(1.0 - 2.0 * g * cosTheta + g2, 1.5);
    return (1.0 / (4.0 * pi)) * ((1.0 - g2) * inverse);
}

// 色调映射 (Uncharted 2 Tonemapping)
const float A = 0.15;
const float B = 0.50;
const float C = 0.10;
const float D = 0.20;
const float E = 0.02;
const float F = 0.30;
const float W = 1000.0;

vec3 Uncharted2Tonemap(vec3 x) {
    return ((x * (A * x + C * B) + D * E) / (x * (A * x + B) + D * F)) - E / F;
}

void main() {
    // 光学深度（简化版本，基于高度）
    float zenithAngle = acos(max(0.0, dot(normalize(vWorldPosition - cameraPosition), vec3(0.0, 1.0, 0.0))));
    float inverse = 1.0 / (cos(zenithAngle) + 0.15 * pow(93.885 - ((zenithAngle * 180.0) / pi), -1.253));
    float sR = 8.4E3 * inverse;
    float sM = 1.25E3 * inverse;

    // 观察方向
    vec3 viewDir = normalize(vWorldPosition - cameraPosition);

    // 太阳和观察方向的夹角余弦
    float cosTheta = dot(viewDir, vSunDirection);

    // 计算散射并应用自定义颜色
    vec3 betaRTheta = vBetaR * rayleighPhase(cosTheta * 0.5 + 0.5) * rayleighColor;
    vec3 betaMTheta = vBetaM * hgPhase(cosTheta, mieDirectionalG) * mieColor;

    vec3 Lin = pow(vSunE * ((betaRTheta + betaMTheta) / (vBetaR + vBetaM)) * (1.0 - exp(-(vBetaR + vBetaM) * sR)), vec3(1.5));
    Lin *= mix(vec3(1.0), pow(vSunE * ((betaRTheta + betaMTheta) / (vBetaR + vBetaM)) * exp(-(vBetaR + vBetaM) * sR), vec3(1.0 / 2.0)), clamp(pow(1.0 - dot(up, vSunDirection), 5.0), 0.0, 1.0));

    // 夜空（可扩展：月光和星星模拟）
    vec3 L0 = vec3(0.1) * vSunfade;

    // 太阳圆盘
    float sundisk = smoothstep(0.9995, 0.9999, cosTheta);
    L0 += (vSunE * 19000.0 * vSunfade) * sundisk;

    vec3 texColor = (Lin + L0) * 0.04 + vec3(0.0, 0.0003, 0.00075);

    // 色调映射
    vec3 curr = Uncharted2Tonemap((log2(2.0 / pow(custom_luminance, 4.0))) * texColor);
    vec3 color = curr * vec3(1.0 / Uncharted2Tonemap(vec3(W)));

    vec3 retColor = pow(color, vec3(1.0 / (1.2 + (1.2 * vSunfade))));

    gl_FragColor = vec4(retColor, 1.0);
}
