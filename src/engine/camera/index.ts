/**
 * The Camera system — how the world is explored.
 *
 * `Camera` is the transform, the easing and the coordinate maths;
 * `CameraController` is the input and the world bounds. Nothing here knows what
 * it is looking at, and nothing it looks at knows about input.
 *
 * Import from "@/engine/camera".
 */
export { Camera } from "./Camera";
export type { FollowOptions, FollowTarget } from "./Camera";
export { CameraController } from "./CameraController";
export type { CameraControllerOptions } from "./CameraController";
export {
  WORLD_WIDTH,
  WORLD_HEIGHT,
  CAMERA_SETTINGS,
  CAMERA_KEYS,
  PAN_LEFT_KEYS,
  PAN_RIGHT_KEYS,
  PAN_UP_KEYS,
  PAN_DOWN_KEYS,
  ZOOM_IN_KEYS,
  ZOOM_OUT_KEYS,
  RESET_KEYS,
} from "./CameraConfig";
export type { CameraSettings } from "./CameraConfig";
