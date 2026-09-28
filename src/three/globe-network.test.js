import { describe, expect, it } from "vitest";
import { createGlobeNetwork, updateGlobeNetwork } from "./globe-network.js";

const firstTrail = (root) =>
  root.userData.routeGroup.children[0].children.find((child) => child.userData.role === "trail");

const visibleNetwork = () => {
  const root = createGlobeNetwork();
  root.userData.opacity = 1;
  root.userData.arcs = 100;
  root.userData.pulses = 0;
  return root;
};

describe("updateGlobeNetwork trails", () => {
  it("writes the trail fade once, tail 0 to head 1", () => {
    const root = visibleNetwork();
    updateGlobeNetwork(root, 1);
    const fade = firstTrail(root).geometry.attributes.aOpacity;
    expect(fade.array[0]).toBe(0);
    expect(fade.array[fade.count - 1]).toBe(1);
  });

  it("re-uploads a trail's vertices only when its head moves", () => {
    const root = visibleNetwork();
    updateGlobeNetwork(root, 1);
    const trail = firstTrail(root);
    const position = trail.geometry.attributes.position;
    const fade = trail.geometry.attributes.aOpacity;
    const [positionVersion, fadeVersion] = [position.version, fade.version];
    const head = Array.from(position.array.slice(-3));

    // Same moment: same head, nothing to upload.
    updateGlobeNetwork(root, 1);
    expect(position.version).toBe(positionVersion);
    expect(fade.version).toBe(fadeVersion);

    // A second later the head has travelled along the arc.
    updateGlobeNetwork(root, 2);
    expect(position.version).toBeGreaterThan(positionVersion);
    expect(Array.from(position.array.slice(-3))).not.toEqual(head);
    // The fade never changes, so it is never re-sent.
    expect(fade.version).toBe(fadeVersion);
  });
});
