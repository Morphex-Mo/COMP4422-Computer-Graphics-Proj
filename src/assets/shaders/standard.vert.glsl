#include <common>
#include <normal_pars_vertex>
#ifdef USE_SKINNING
#include <skinning_pars_vertex>
#endif

#ifdef USE_MORPHTARGETS
#include <morphtarget_pars_vertex>
#endif
varying vec3 vViewPosition;
varying vec2 vUv;
#include <envmap_pars_vertex>
#include <shadowmap_pars_vertex>
#include <fog_pars_vertex> // ADDED
void main() {
    vUv = uv;

    // 初始化位置和法线
    vec3 transformed = vec3(position);
    vec3 objectNormal = vec3(normal);

    #ifdef USE_MORPHTARGETS
    // 应用Morph Targets
    #include <morphtarget_vertex>
    #include <morphnormal_vertex>
    #endif

    #ifdef USE_SKINNING
    // 应用骨骼动画变换
    #include <skinbase_vertex>
    #include <skinning_vertex>
    #include <skinnormal_vertex>
    #endif

    // 将法线转换到视图空间
    vNormal = normalize(normalMatrix * objectNormal);

    // 计算顶点在视图空间中的位置
    vec4 mvPosition = modelViewMatrix * vec4(transformed, 1.0);
    vViewPosition = -mvPosition.xyz;


    gl_Position = projectionMatrix * mvPosition;
    #include <worldpos_vertex>
    #include <defaultnormal_vertex>
    #include <shadowmap_vertex>
    #include <envmap_vertex>
    #include <fog_vertex> // ADDED
}