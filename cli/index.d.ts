export interface RouteLink {
  label: string;
  type: "link";
  href: string;
  icon?: React.ReactNode;
}

export interface RouteFunction {
  label: string;
  type: "function";
  icon?: React.ReactNode;
  onClick: () => void;
}

export type ProofKitRoute = RouteLink | RouteFunction;
