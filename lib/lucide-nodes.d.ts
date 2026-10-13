// lucide-react's icon modules export the drawing itself beside the component
// (`__iconNode`, the elements of a 24 by 24 icon), which its package types do not
// name. The share image (lib/card-image) draws the icons from it, outside React.
declare module "lucide-react/dist/esm/icons/*.js" {
  export const __iconNode: [string, Record<string, string>][];
}
