import React from "react";
import Svg, {
    Defs,
    LinearGradient,
    Stop,
    G,
    Path,
    Circle,
    Text as SvgText,
    TSpan,
} from "react-native-svg";
import { COLORS } from "../constants/theme.js";

export const SmartAttendLogo = ({
    width = 120,
    height = 110,
    showWordmark = true,
    colorScheme = "theme", // "theme" (Peach & Sage) | "original" (Blue & Teal)
    style,
}) => {
    const isTheme = colorScheme === "theme";
    const viewBox = showWordmark ? "0 0 1200 1100" : "360 140 480 510";

    const pinStops = isTheme
        ? [
              { offset: "0", color: COLORS.primary },
              { offset: "0.55", color: COLORS.peach },
              { offset: "1", color: COLORS.primaryDark },
          ]
        : [
              { offset: "0", color: "#147BFF" },
              { offset: "0.55", color: "#155EEF" },
              { offset: "1", color: "#1747C8" },
          ];

    const scanStops = isTheme
        ? [
              { offset: "0", color: COLORS.secondary },
              { offset: "1", color: "#2A9D8F" },
          ]
        : [
              { offset: "0", color: "#08C98D" },
              { offset: "1", color: "#00AFC4" },
          ];

    const attendStops = isTheme
        ? [
              { offset: "0", color: COLORS.primary },
              { offset: "0.55", color: COLORS.secondary },
              { offset: "1", color: "#2A9D8F" },
          ]
        : [
              { offset: "0", color: "#1664E8" },
              { offset: "0.56", color: "#08A9D8" },
              { offset: "1", color: "#00C58B" },
          ];

    const textColor = isTheme ? COLORS.textPrimary : "#101B3D";
    const taglineColor = isTheme ? COLORS.textSecondary : "#64748B";

    return (
        <Svg width={width} height={height} viewBox={viewBox} style={style}>
            <Defs>
                <LinearGradient id="pinGrad" x1="0" y1="0" x2="1" y2="1">
                    {pinStops.map((s, idx) => (
                        <Stop key={idx} offset={s.offset} stopColor={s.color} />
                    ))}
                </LinearGradient>
                <LinearGradient id="scanGrad" x1="0" y1="0" x2="1" y2="1">
                    {scanStops.map((s, idx) => (
                        <Stop key={idx} offset={s.offset} stopColor={s.color} />
                    ))}
                </LinearGradient>
                <LinearGradient id="attendGrad" x1="0" y1="0" x2="1" y2="0">
                    {attendStops.map((s, idx) => (
                        <Stop key={idx} offset={s.offset} stopColor={s.color} />
                    ))}
                </LinearGradient>
            </Defs>

            {/* Scan Brackets */}
            <G
                fill="none"
                stroke="url(#scanGrad)"
                strokeWidth="20"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                <Path d="M382 245 V207 Q382 168 421 168 H462" />
                <Path d="M738 168 H779 Q818 168 818 207 V245" />
                <Path d="M382 445 V483 Q382 522 421 522 H462" />
                <Path d="M738 522 H779 Q818 522 818 483 V445" />
            </G>

            {/* Location Marker Pin */}
            <G>
                <Path
                    d="M600 145 C493 145 410 228 410 333 C410 455 526 553 600 635 C674 553 790 455 790 333 C790 228 707 145 600 145 Z"
                    fill="url(#pinGrad)"
                />
                <Circle cx="600" cy="323" r="124" fill="#FFFFFF" />

                {/* Person Symbol */}
                <Circle cx="600" cy="289" r="35" fill="url(#pinGrad)" />
                <Path
                    d="M530 372 C543 333 570 315 600 315 C630 315 657 333 670 372 C650 393 628 405 600 405 C572 405 550 393 530 372 Z"
                    fill="url(#pinGrad)"
                />

                {/* Verified Check Badge */}
                <Circle cx="669" cy="374" r="38" fill="#FFFFFF" />
                <Circle cx="669" cy="374" r="31" fill="url(#scanGrad)" />
                <Path
                    d="M654 374 L665 385 L685 361"
                    fill="none"
                    stroke="#FFFFFF"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </G>

            {/* Wordmark */}
            {showWordmark && (
                <>
                    <SvgText
                        x="600"
                        y="800"
                        textAnchor="middle"
                        fill={textColor}
                        fontSize="116"
                        fontWeight="bold"
                        letterSpacing="-4"
                    >
                        Smart
                        <TSpan fill="url(#attendGrad)">Attend</TSpan>
                    </SvgText>
                    <SvgText
                        x="600"
                        y="862"
                        textAnchor="middle"
                        fill={taglineColor}
                        fontSize="24"
                        fontWeight="600"
                        letterSpacing="4"
                    >
                        SMART, SIMPLE, VERIFIED
                    </SvgText>
                </>
            )}
        </Svg>
    );
};
