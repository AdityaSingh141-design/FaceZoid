declare module 'react-native-size-matters/lib/scaling-utils' {
  export function scale(size: number): number;
  export function verticalScale(size: number): number;
  export function moderateScale(size: number, factor?: number): number;
  export function moderateVerticalScale(size: number, factor?: number): number;
}
