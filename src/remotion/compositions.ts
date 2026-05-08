import { Main } from "./compositions/Main";

export type SceneMarker = {
  label: string;
  from: number;
  durationInFrames?: number;
};

export type CompositionConfig = {
  id: string;
  component: typeof Main;
  durationInFrames: number;
  fps: number;
  width: number;
  height: number;
  scenes?: SceneMarker[];
};

const sceneDurations = [96, 96, 96, 108, 126];
const sceneStarts = sceneDurations.reduce<number[]>((starts, duration, index) => {
  starts.push(index === 0 ? 0 : starts[index - 1] + sceneDurations[index - 1]);
  return starts;
}, []);

export const composition: CompositionConfig = {
  id: "Main",
  component: Main,
  durationInFrames: sceneDurations.reduce((sum, duration) => sum + duration, 0),
  fps: 30,
  width: 1280,
  height: 720,
  scenes: [
    { label: "Opening Mark", from: sceneStarts[0], durationInFrames: sceneDurations[0] },
    { label: "Safety Dashboard", from: sceneStarts[1], durationInFrames: sceneDurations[1] },
    { label: "Reasoning Lattice", from: sceneStarts[2], durationInFrames: sceneDurations[2] },
    { label: "Enterprise Deployment", from: sceneStarts[3], durationInFrames: sceneDurations[3] },
    { label: "Launch End Card", from: sceneStarts[4], durationInFrames: sceneDurations[4] },
  ],
};
