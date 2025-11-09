// Azure Sky Style Atmospheric Scattering Fragment Shader
// Based on Azure[Sky] Dynamic Skybox shader from Unity Asset Store
#include <common>
#include <packing>
#define Pi316 0.0596831
#define Pi14 0.07957747

varying vec3 vWorldPosition;

// Uniforms from Three.js
uniform vec3 sunPosition;
uniform float kr;                // Rayleigh altitude (meters)
uniform float km;                // Mie altitude (meters)
uniform vec3 rayleighCoef;       // Precomputed Rayleigh coefficient
uniform vec3 mieCoef;            // Precomputed Mie coefficient
uniform vec3 mieG;               // Mie G parameters (x: 1-g², y: 1+g², z: 2g)
uniform float scattering;        // Scattering intensity multiplier
uniform float custom_luminance;  // Sky luminance
uniform float exposure;          // Exposure value
uniform vec3 rayleighColor;      // Rayleigh color multiplier
uniform vec3 mieColor;           // Mie color multiplier
float tpow22(float inpu){
    return exp2( log2(inpu) * (1.0 / 2.2) );
}
void main() {
    // Directions
    vec3 viewDir = normalize(vWorldPosition - cameraPosition);
    //viewDir.z=-viewDir.z;
    vec3 sunDirection = normalize(sunPosition);
    vec3 moonDirection = normalize(-sunPosition);
    float sunCosTheta = dot(viewDir, sunDirection);
    float moonCosTheta = dot(viewDir, moonDirection);
    float skyCosTheta = dot(viewDir, vec3(0.0, -1.0, 0.0));
    float r = length(vec3(0.0, 50.0, 0.0));
    float sunRise = saturate(dot(vec3(0.0, 500.0, 0.0), sunDirection) / r);
    float moonRise = saturate(dot(vec3(0.0, 500.0, 0.0), moonDirection) / r);

    float sunset = dot(vec3(0.0, 1.0, 0.0), sunDirection);

    // Optical depth
    float zenith = acos(saturate(dot(vec3(0.0, 1.0, 0.0), viewDir)));
    float z = cos(zenith) + 0.15 * pow(93.885 - ((zenith * 180.0) / PI), -1.253);
    float SR = kr / z;
    float SM = km / z;

    // Extinction
    vec3 fex = exp(-(rayleighCoef * SR + mieCoef * SM));
    float horizonMask = saturate(viewDir.y * 10.0);
    vec3 extinction = saturate(fex) * horizonMask;

    // Default sky - When there is no sun in the sky!
    vec3 Esun = 1.0 - fex;
    float rayPhase = 2.0 + 0.5 * pow(skyCosTheta, 2.0);
    vec3 BrTheta = Pi316 * rayleighCoef * rayPhase * rayleighColor;
    vec3 BrmTheta = BrTheta / (rayleighCoef + mieCoef);
    vec3 defaultDayLight = BrmTheta * Esun * scattering * custom_luminance * (1.0 - fex);
    defaultDayLight *= 1.0 - sunRise;
    defaultDayLight *= 1.0 - moonRise;


    // Sun inScattering
    Esun = mix(fex, (1.0 - fex), sunset);
    rayPhase = 2.0 + 0.5 * pow(sunCosTheta, 2.0);
    float miePhase = mieG.x / pow(mieG.y - mieG.z * sunCosTheta, 1.5);
    BrTheta = Pi316 * rayleighCoef * rayPhase * rayleighColor;
    vec3 BmTheta = Pi14 * mieCoef * miePhase * mieColor;
    BrmTheta = (BrTheta + BmTheta) / (rayleighCoef + mieCoef);
    vec3 sunInScatter = BrmTheta * Esun * scattering * (1.0 - fex);
    sunInScatter *= sunRise;

    // Moon inScattering
    Esun = (1.0 - fex);
    rayPhase = 2.0 + 0.5 * pow(moonCosTheta, 2.0);
    miePhase = mieG.x / pow(mieG.y - mieG.z * moonCosTheta, 1.5);
    BrTheta = Pi316 * rayleighCoef * rayPhase * rayleighColor;
    BmTheta = Pi14 * mieCoef * miePhase * mieColor;
    BrmTheta = (BrTheta + BmTheta) / (rayleighCoef + mieCoef);
    vec3 moonInScatter = BrmTheta * Esun * scattering * 0.1 * (1.0 - fex);
    moonInScatter *= moonRise;
    moonInScatter *= 1.0 - sunRise;
    // Output
    vec3 OutputColor = defaultDayLight + sunInScatter+moonInScatter;

    // Tonemapping
    OutputColor = saturate(1.0 - exp(-exposure * OutputColor));
    gl_FragColor = vec4(OutputColor, 1.0);
    // Color correction (gamma correction is handled by Three.js renderer)
    //gl_FragColor = vec4(vec3(tpow22(zenith/3.1415926)), 1.0);
    //gl_FragColor = vec4(tpow22((viewDir.xyz)*(viewDir.xyz)*(viewDir.xyz)*(viewDir.xyz)*(viewDir.xyz)*(viewDir.xyz)*(viewDir.xyz)), 1.0);
    //gl_FragColor = vec4(tpow22((viewDir.xyz)*(viewDir.xyz)*(viewDir.xyz)*(viewDir.xyz)), 1.0);
}

