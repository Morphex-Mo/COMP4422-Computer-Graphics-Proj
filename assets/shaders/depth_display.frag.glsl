#include <common>
#include <packing>
// 深度图显示 Shader
uniform sampler2D tDiffuse;
uniform sampler2D tDepth;
uniform float cameraNear;
uniform float cameraFar;
uniform bool showDepth;
uniform float depthRange; // 可调节的深度范围

varying vec2 vUv;

void main() {
    vec4 color = texture2D(tDiffuse, vUv);

    if (showDepth) {
        // 读取原始深度值（非线性）
        float fragCoordZ = texture2D(tDepth, vUv).x;

        // 转换为视图空间的线性深度
        float viewZ = perspectiveDepthToViewZ(fragCoordZ, cameraNear, cameraFar);

        // 将viewZ（负值）转换为正值距离
        float linearDepth = -viewZ;

        // 归一化到可调节的深度范围以获得更好的可视化效果
        float normalizedDepth = clamp(linearDepth / depthRange, 0.0, 1.0);

        // 应用gamma校正使渐变更明显（类似Unity的深度显示）
        float gamma = 1.5;
        float visualDepth = pow(normalizedDepth, 1.0 / gamma);

        // 将深度值可视化为灰度图
        gl_FragColor = vec4(vec3(visualDepth), 1.0);
    } else {
        // 正常显示颜色
        gl_FragColor = color;
    }
}

