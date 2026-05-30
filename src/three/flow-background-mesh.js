import * as THREE from "three";
import { DEFAULT_FLOW_SETTINGS } from "../config/backgrounds.js";
import {
  FLOW_VERTEX_SHADER,
  FLOW_FRAGMENT_SHADER,
} from "./flow-background-shader.js";

export const createFlowBackgroundMesh = () => {
  const material = new THREE.ShaderMaterial({
    vertexShader: FLOW_VERTEX_SHADER,
    fragmentShader: FLOW_FRAGMENT_SHADER,
    uniforms: {
      uResolution: { value: new THREE.Vector2(1, 1) },
      uTime: { value: 0 },
      uMotion: { value: DEFAULT_FLOW_SETTINGS.motion / 100 },
      uTurbulence: { value: DEFAULT_FLOW_SETTINGS.turbulence / 100 },
      uGrain: { value: DEFAULT_FLOW_SETTINGS.grain / 100 },
      uScale: { value: DEFAULT_FLOW_SETTINGS.scale / 100 },
      uBrightness: { value: DEFAULT_FLOW_SETTINGS.brightness / 100 },
      colorA: { value: new THREE.Color(DEFAULT_FLOW_SETTINGS.colorA) },
      colorB: { value: new THREE.Color(DEFAULT_FLOW_SETTINGS.colorB) },
      colorC: { value: new THREE.Color(DEFAULT_FLOW_SETTINGS.colorC) },
    },
    depthTest: false,
    depthWrite: false,
    transparent: false,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
  mesh.frustumCulled = false;
  mesh.renderOrder = -1;
  mesh.visible = false;
  return mesh;
};
