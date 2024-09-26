export type Route =
  | {
      label: string;
      type: "link";
      href: string;
      icon?: React.ReactNode;
    }
  | {
      label: string;
      type: "function";
      icon?: React.ReactNode;
      onClick: () => void;
    };

export const primaryRoutes: Route[] = [
  {
    label: "Dashboard",
    type: "link",
    href: "/",
  },
];

export const secondaryRoutes: Route[] = [];
