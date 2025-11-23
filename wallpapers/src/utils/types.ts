import { WindowManagemet as wm } from '@vicinae/api';

export interface WPNamespace {
  name: string,
  isOverview: boolean
};

export interface WPAnimation {
  type: string,
  duration: number,
  steps: number,
  fps: number
};

export interface WPTarget {
  mon: wm.Screen | string,
  ns?: WPNamespace
};

export interface WPFilter {
  name: string
};