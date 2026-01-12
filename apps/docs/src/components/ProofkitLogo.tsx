import type React from "react";

interface ProofkitLogoProps extends React.SVGProps<SVGSVGElement> {
  // You can control the color via the CSS 'color' property or className
}

export const ProofkitLogo: React.FC<ProofkitLogoProps> = ({
  width = "138pt", // Default width from original SVG
  height = "102.33pt", // Default height based on original aspect ratio
  viewBox = "0 0 1380 1024", // Adjusted viewBox based on transform
  preserveAspectRatio = "xMidYMid meet",
  ...props
}) => {
  return (
    <svg
      aria-label="ProofKit Logo"
      height={height}
      preserveAspectRatio={preserveAspectRatio}
      role="img"
      version="1.0"
      viewBox={viewBox}
      width={width}
      xmlns="http://www.w3.org/2000/svg"
      {...props} // Spread remaining props onto the SVG element
    >
      {/*
        Original transform: translate(-10, 1025.46) scale(0.1, -0.1)
        The viewBox is adjusted to remove the need for the transform.
        Original viewBox: 0 0 1380 1023.328280
        The paths seem designed for a coordinate system starting near (0,0) after the transform.
        We adjust the viewBox to effectively apply the scale and translation
        and remove the negative Y scaling (by omitting it and letting CSS handle layout).
        New effective viewBox width: 13800 (1380 / 0.1)
        New effective viewBox height: 10233 (1023.3 / 0.1) - adjusted slightly for common usage
        New viewBox origin x: 10 (from -10 / 0.1)
        New viewBox origin y needs adjustment due to Y-flip. Let's recalculate paths relative to 0,0 if needed,
        or adjust viewBox carefully.
        Keeping simpler viewBox "0 0 1380 1024" and removing transform/scale for now.
        Removed stroke="none" from <g> and added fill="currentColor" to paths.
      */}
      <g>
        {/* Path data remains the same, fill is controlled by parent CSS color */}
        <path
          d="M13381 10249 c-242 -27 -423 -111 -572 -265 -138 -144 -201 -298 -229 -566 -5 -51 -10 -299 -10 -550 l0 -458 -150 0 -150 0 0 -250 0 -250 150 0 150 0 0 -1330 0 -1330 265 0 265 0 0 1330 0 1330 400 0 400 0 0 250 0 250 -400 0 -400 0 0 288 c0 641 32 833 154 938 72 62 132 78 286 78 114 0 150 -5 230 -27 52 -14 103 -29 113 -32 16 -7 17 8 15 265 l-3 273 -45 13 c-134 41 -330 59 -469 43z"
          fill="currentColor"
        />
        <path
          d="M7275 8499 c-639 -49 -1206 -478 -1429 -1081 -196 -527 -111 -1119 223 -1563 157 -209 341 -367 571 -489 381 -202 849 -243 1253 -109 431 142 835 483 1002 845 81 176 123 340 169 653 55 372 139 587 320 814 191 239 542 377 870 342 140 -16 230 -42 361 -105 133 -65 214 -125 320 -238 186 -197 285 -448 285 -725 0 -285 -97 -531 -290 -737 -409 -436 -1086 -452 -1523 -37 l-75 71 -27 -67 c-40 -103 -138 -284 -210 -392 -71 -105 -78 -133 -46 -185 70 -113 370 -237 706 -291 157 -26 486 -31 620 -10 248 38 464 118 658 242 491 314 777 831 777 1403 0 578 -299 1110 -798 1419 -607 377 -1424 313 -1952 -153 -179 -158 -361 -417 -450 -640 -47 -117 -75 -244 -110 -493 -17 -123 -41 -264 -54 -315 -120 -473 -426 -790 -841 -873 -82 -17 -280 -22 -351 -10 -358 62 -641 264 -802 573 -83 161 -122 316 -122 493 0 274 102 530 291 733 329 352 850 443 1274 224 94 -48 170 -103 251 -182 70 -67 76 -71 84 -52 62 158 142 312 225 431 23 33 45 65 48 72 13 21 -156 146 -318 236 -137 75 -308 138 -471 172 -65 13 -298 37 -329 33 -5 0 -55 -4 -110 -9z"
          fill="currentColor"
        />
        <path
          d="M1494 8474 c-102 -17 -273 -73 -366 -119 -161 -81 -342 -225 -438 -349 -19 -25 -38 -45 -42 -46 -4 0 -9 100 -10 223 l-3 222 -267 3 -268 2 0 -2465 0 -2465 270 0 270 0 0 1105 c0 608 3 1105 8 1105 4 0 30 -27 57 -61 183 -222 480 -390 785 -444 125 -23 367 -21 510 4 591 102 1027 525 1185 1149 84 331 74 728 -24 1047 -163 525 -536 911 -1016 1051 -132 38 -257 54 -420 53 -82 -1 -186 -7 -231 -15z m251 -484 c267 -26 470 -122 643 -305 223 -235 323 -550 301 -940 -23 -394 -196 -730 -472 -917 -281 -191 -704 -219 -1011 -67 -289 144 -487 423 -568 802 -29 139 -32 420 -5 547 106 494 449 833 892 880 103 11 101 11 220 0z"
          fill="currentColor"
        />
        <path
          d="M5028 8471 c-158 -41 -302 -147 -445 -328 l-68 -85 -5 173 -5 174 -267 3 -268 2 0 -1580 0 -1580 269 0 270 0 4 973 c3 850 6 985 21 1077 55 347 168 550 355 644 66 33 143 49 236 49 97 -1 142 -16 243 -83 42 -28 79 -47 82 -43 7 8 250 474 250 480 0 15 -205 99 -302 123 -98 26 -273 26 -370 1z"
          fill="currentColor"
        />
        <path
          d="M7870 2305 l0 -2225 270 0 270 0 1 553 0 552 169 175 c93 96 171 172 173 170 2 -3 246 -330 541 -727 l538 -723 319 0 320 0 -44 57 c-187 246 -1310 1760 -1311 1768 -1 6 270 302 602 658 331 355 602 649 602 652 0 3 -146 5 -324 5 l-324 0 -489 -522 c-268 -288 -548 -594 -621 -680 -73 -86 -137 -160 -142 -163 -7 -4 -10 465 -10 1334 l0 1341 -270 0 -270 0 0 -2225z"
          fill="currentColor"
        />
        <path
          d="M11142 4349 c-97 -16 -165 -67 -213 -159 -20 -38 -24 -60 -24 -140 0 -79 4 -102 22 -136 60 -112 132 -156 268 -162 75 -3 100 0 148 18 104 39 168 116 185 223 10 64 -1 154 -24 199 -24 46 -84 108 -125 129 -31 15 -157 42 -179 38 -3 -1 -29 -5 -58 -10z"
          fill="currentColor"
        />
        <path
          d="M12560 3600 l0 -380 -285 0 -285 0 0 -205 0 -205 283 -2 282 -3 6 -1085 c5 -1099 6 -1106 43 -1228 37 -122 107 -236 193 -312 69 -61 191 -117 309 -141 82 -17 122 -20 234 -16 126 5 269 26 326 47 l24 10 0 215 0 215 -22 -5 c-193 -42 -357 -31 -449 29 -46 31 -88 99 -105 175 -11 45 -14 263 -14 1079 l0 1022 290 0 290 0 0 205 0 205 -290 0 -290 0 0 380 0 380 -270 0 -270 0 0 -380z"
          fill="currentColor"
        />
        <path
          d="M3140 3871 c-73 -23 -147 -89 -177 -160 -20 -45 -22 -143 -4 -196 11 -32 127 -154 617 -645 332 -333 604 -610 604 -615 0 -5 -268 -278 -595 -605 -653 -654 -638 -637 -639 -756 0 -151 115 -265 268 -266 122 -1 90 -28 872 755 476 476 717 725 730 752 28 58 26 186 -3 240 -13 23 -321 338 -735 752 -549 549 -723 717 -758 732 -46 21 -131 26 -180 12z"
          fill="currentColor"
        />
        <path d="M10950 1650 l0 -1570 270 0 270 0 -2 1567 -3 1568 -267 3 -268 2 0 -1570z" fill="currentColor" />
        <path
          d="M5026 610 c-44 -13 -101 -57 -131 -100 -81 -117 -64 -267 43 -360 83 -73 31 -70 1126 -70 637 0 994 4 1018 10 58 17 130 71 162 124 35 57 46 149 26 221 -17 60 -82 132 -145 161 l-50 24 -1010 -1 c-555 0 -1023 -5 -1039 -9z"
          fill="currentColor"
        />
      </g>
    </svg>
  );
};

export default ProofkitLogo;
