import { type ProofKitRoute } from "@proofgeist/kit";

export const primaryRoutes: ProofKitRoute[] = [
  {
    label: "Dashboard",
    type: "link",
    href: "/",
    exactMatch: true,
  },
];

export const secondaryRoutes: ProofKitRoute[] = [];
