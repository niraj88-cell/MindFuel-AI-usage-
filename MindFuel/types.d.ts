import { ViewProps, TextProps, ImageProps, TextInputProps, ScrollViewProps, TouchableOpacityProps } from 'react-native';

// Extend React Native component props to include className for NativeWind
declare module 'react-native' {
  interface ViewProps {
    className?: string;
  }
  interface TextProps {
    className?: string;
  }
  interface ImageProps {
    className?: string;
  }
  interface TextInputProps {
    className?: string;
  }
  interface ScrollViewProps {
    className?: string;
  }
  interface TouchableOpacityProps {
    className?: string;
  }
}

// Extend JSX.IntrinsicElements to support className on all elements
declare namespace JSX {
  interface IntrinsicElements {
    [elem: string]: any;
  }
}
