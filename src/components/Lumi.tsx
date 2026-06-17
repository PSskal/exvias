"use client";

interface Props {
  variant?: "fluffy" | "sleepy" | "sparkly";
  size?: number;
  animate?: boolean;
  mood?: "happy" | "sad" | "celebrate";
}

export function Lumi({
  variant = "fluffy",
  size = 120,
  animate = true,
  mood = "happy",
}: Props) {
  const hasSparkles = variant === "sparkly";
  const isSleepy = variant === "sleepy";
  const isFluffy = variant === "fluffy";

  return (
    <div
      className={animate ? "animate-bob" : ""}
      style={{ width: size, height: size, position: "relative" }}
    >
      <svg viewBox="0 0 120 120" width={size} height={size}>
        {/* Cuerpo */}
        <ellipse cx="60" cy="78" rx="38" ry="32" fill="#FFF0E0" />
        {/* Pelusa */}
        {isFluffy && (
          <>
            <circle cx="28" cy="62" r="10" fill="#FFF0E0" />
            <circle cx="92" cy="62" r="10" fill="#FFF0E0" />
            <circle cx="40" cy="50" r="9" fill="#FFF0E0" />
            <circle cx="80" cy="50" r="9" fill="#FFF0E0" />
          </>
        )}
        {/* Cabeza */}
        <ellipse cx="60" cy="52" rx="28" ry="26" fill="#FFF0E0" />
        {/* Orejas */}
        <ellipse
          cx="38"
          cy="32"
          rx="8"
          ry="12"
          fill="#FFF0E0"
          transform="rotate(-15 38 32)"
        />
        <ellipse
          cx="82"
          cy="32"
          rx="8"
          ry="12"
          fill="#FFF0E0"
          transform="rotate(15 82 32)"
        />
        <ellipse
          cx="38"
          cy="34"
          rx="4"
          ry="7"
          fill="#FFB199"
          transform="rotate(-15 38 34)"
        />
        <ellipse
          cx="82"
          cy="34"
          rx="4"
          ry="7"
          fill="#FFB199"
          transform="rotate(15 82 34)"
        />

        {/* Flequillo */}
        <path
          d="M 40 38 Q 50 28, 60 34 Q 70 28, 80 38 Q 70 42, 60 40 Q 50 42, 40 38 Z"
          fill="#FFE0C4"
        />

        {/* Ojos */}
        {isSleepy ? (
          <>
            <path
              d="M 45 54 Q 50 56, 55 54"
              stroke="#3D2E4F"
              strokeWidth="2.5"
              fill="none"
              strokeLinecap="round"
            />
            <path
              d="M 65 54 Q 70 56, 75 54"
              stroke="#3D2E4F"
              strokeWidth="2.5"
              fill="none"
              strokeLinecap="round"
            />
          </>
        ) : (
          <>
            <ellipse cx="50" cy="54" rx="3.5" ry="4.5" fill="#3D2E4F" />
            <ellipse cx="70" cy="54" rx="3.5" ry="4.5" fill="#3D2E4F" />
            <circle cx="51" cy="53" r="1.3" fill="white" />
            <circle cx="71" cy="53" r="1.3" fill="white" />
          </>
        )}

        {/* Cachetitos */}
        <circle cx="42" cy="60" r="3.5" fill="#FFB199" opacity="0.6" />
        <circle cx="78" cy="60" r="3.5" fill="#FFB199" opacity="0.6" />

        {/* Boca */}
        {mood === "sad" ? (
          <path
            d="M 54 66 Q 60 62, 66 66"
            stroke="#3D2E4F"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
          />
        ) : mood === "celebrate" ? (
          <ellipse cx="60" cy="65" rx="5" ry="4" fill="#3D2E4F" />
        ) : (
          <path
            d="M 54 64 Q 60 69, 66 64"
            stroke="#3D2E4F"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
          />
        )}

        {/* Brillos mágicos */}
        {hasSparkles && (
          <>
            <text x="20" y="30" fontSize="14">
              ✨
            </text>
            <text x="95" y="45" fontSize="12">
              ⭐
            </text>
            <text x="100" y="85" fontSize="10">
              ✨
            </text>
          </>
        )}
      </svg>
    </div>
  );
}
