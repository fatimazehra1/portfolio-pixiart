/**
 * The Camera system — how the world is explored.
 *
 * `Camera` is the transform and the easing; `CameraController` is the input and
 * the bounds. Import from "@/engine/camera".
 */
export { Camera } from "./Camera";
export { CameraController } from "./CameraController";
export {
  WORLD_WIDTH,
  CAMERA_SETTINGS,
  PAN_LEFT_KEYS,
  PAN_RIGHT_KEYS,
} from "./CameraConfig";
export type { CameraSettings } from "./CameraConfig";
export type { CameraControllerOptions } from "./CameraController";
