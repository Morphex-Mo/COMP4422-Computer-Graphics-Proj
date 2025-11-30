// Azure Sky Style Atmospheric Scattering Vertex Shader
varying vec3 vWorldPosition;
varying vec3 customViewDir;
uniform vec3 sunPosition;

void main() {
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    customViewDir = normalize(vWorldPosition - cameraPosition);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    gl_Position.z = gl_Position.w; // 确保天空盒总是在最远处
}

