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

void main() {
    // Directions
    vec3 viewDir = normalize(vWorldPosition - cameraPosition);
    vec3 sunDirection = normalize(sunPosition);
    float sunCosTheta = dot(viewDir, sunDirection);
    float skyCosTheta = dot(viewDir, vec3(0.0, -1.0, 0.0));
    float r = length(vec3(0.0, 50.0, 0.0));
    float sunRise = saturate(dot(vec3(0.0, 500.0, 0.0), sunDirection) / r);
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

    // Sun inScattering
    Esun = mix(fex, (1.0 - fex), sunset);
    rayPhase = 2.0 + 0.5 * pow(sunCosTheta, 2.0);
    float miePhase = mieG.x / pow(mieG.y - mieG.z * sunCosTheta, 1.5);
    BrTheta = Pi316 * rayleighCoef * rayPhase * rayleighColor;
    vec3 BmTheta = Pi14 * mieCoef * miePhase * mieColor;
    BrmTheta = (BrTheta + BmTheta) / (rayleighCoef + mieCoef);
    vec3 sunInScatter = BrmTheta * Esun * scattering * (1.0 - fex);
    sunInScatter *= sunRise;

    // Output
    vec3 OutputColor = extinction + defaultDayLight + sunInScatter;

    // Tonemapping
    OutputColor = saturate(1.0 - exp(-exposure * OutputColor));

    // Color correction (gamma correction is handled by Three.js renderer)

    gl_FragColor = vec4(OutputColor, 1.0);
}

