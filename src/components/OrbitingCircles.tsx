// src/components/OrbitingCircles.tsx
import { ReactNode } from "react";

interface OrbitingCirclesProps {
  children: ReactNode;
  iconSize?: number;
  radius?: number;
  reverse?: boolean;
  speed?: number;
}

export function OrbitingCircles({
  children,
  iconSize = 40,
  radius = 150,
  reverse = false,
  speed = 1,
}: OrbitingCirclesProps) {
  const childrenArray = Array.isArray(children) ? children : [children];
  const count = childrenArray.length;

  return (
    <div
      className="absolute inset-0 flex items-center justify-center"
      style={{
        animation: `${reverse ? "reverse-spin" : "spin"} ${20 / speed}s linear infinite`,
      }}
    >
      {childrenArray.map((child, index) => {
        const angle = (360 / count) * index;
        const x = Math.cos((angle * Math.PI) / 180) * radius;
        const y = Math.sin((angle * Math.PI) / 180) * radius;

        return (
          <div
            key={index}
            className="absolute"
            style={{
              transform: `translate(${x}px, ${y}px)`,
              width: iconSize,
              height: iconSize,
            }}
          >
            <div
              style={{
                animation: `${reverse ? "spin" : "reverse-spin"} ${20 / speed}s linear infinite`,
              }}
            >
              {child}
            </div>
          </div>
        );
      })}
    </div>
  );
}