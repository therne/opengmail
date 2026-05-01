import type { DetailedHTMLProps, HTMLAttributes } from "react";

type MaterialElementProps = DetailedHTMLProps<
  HTMLAttributes<HTMLElement>,
  HTMLElement
> & {
  class?: string;
  disabled?: boolean;
  href?: string;
  target?: string;
  type?: string;
};

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "md-icon": MaterialElementProps;
      "md-icon-button": MaterialElementProps;
      "md-filled-button": MaterialElementProps;
      "md-filled-tonal-button": MaterialElementProps;
      "md-outlined-button": MaterialElementProps;
      "md-circular-progress": MaterialElementProps & { indeterminate?: boolean };
    }
  }
}

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "md-icon": MaterialElementProps;
      "md-icon-button": MaterialElementProps;
      "md-filled-button": MaterialElementProps;
      "md-filled-tonal-button": MaterialElementProps;
      "md-outlined-button": MaterialElementProps;
      "md-circular-progress": MaterialElementProps & { indeterminate?: boolean };
    }
  }
}
