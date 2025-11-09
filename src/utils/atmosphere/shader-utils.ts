import * as THREE from "three";
import { AtmosphereParams } from "./types";

/**
 * 与你原有的 computeRayleigh/Mie/MieG 一致，抽离便于复用。
 */
export function computeRayleigh(p: AtmosphereParams): THREE.Vector3 {
  const lambda = p.wavelength.clone().multiplyScalar(1e-9);
  const n = 1.0003;
  const pn = 0.035;
  const n2 = n * n;
  const N = p.molecularDensity * 1e25;
  const temp =
    (8.0 * Math.PI * Math.PI * Math.PI * ((n2 - 1.0) * (n2 - 1.0))) /
    (3.0 * N) *
    ((6.0 + 3.0 * pn) / (6.0 - 7.0 * pn));

  return new THREE.Vector3(
    temp / Math.pow(lambda.x, 4.0),
    temp / Math.pow(lambda.y, 4.0),
    temp / Math.pow(lambda.z, 4.0)
  ).multiplyScalar(p.rayleigh);
}

export function computeMie(p: AtmosphereParams): THREE.Vector3 {
  const k = new THREE.Vector3(686.0, 678.0, 682.0);
  const c = (0.6544 * 5.0 - 0.6510) * 10.0 * 1e-9;
  return new THREE.Vector3(
    434.0 * c * Math.PI * Math.pow((4.0 * Math.PI) / p.wavelength.x, 2.0) * k.x,
    434.0 * c * Math.PI * Math.pow((4.0 * Math.PI) / p.wavelength.y, 2.0) * k.y,
    434.0 * c * Math.PI * Math.pow((4.0 * Math.PI) / p.wavelength.z, 2.0) * k.z
  ).multiplyScalar(p.mie);
}

export function computeMieG(p: AtmosphereParams): THREE.Vector3 {
  const g = p.mieDirectionalG;
  return new THREE.Vector3(1.0 - g * g, 1.0 + g * g, 2.0 * g);
}