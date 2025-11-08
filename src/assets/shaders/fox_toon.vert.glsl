varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec2 vUv;

void main() {
    vUv = uv;

    // 将法线转换到视图空间
    vNormal = normalize(normalMatrix * normal);

    // 计算顶点在视图空间中的位置
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vViewPosition = -mvPosition.xyz;

    gl_Position = projectionMatrix * mvPosition;
}