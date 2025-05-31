"use client";
import { ControlPosition, useMap } from "@vis.gl/react-google-maps";
import { useEffect, useRef } from "react";

interface CustomMapControlProps {
  controlPosition: ControlPosition;
  children: React.ReactNode;
}

export const CustomMapControl = ({ controlPosition, children }: CustomMapControlProps) => {
  const map = useMap();
  const controlRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!map || !controlRef.current) return;

    const controlDiv = controlRef.current;
    
    // Check if this specific control is already added
    // This is a simple check; more robust would involve IDs or specific class names
    const existingControls = map.controls[controlPosition].getArray();
    if (existingControls.includes(controlDiv)) {
      return;
    }
    
    map.controls[controlPosition].push(controlDiv);

    // Cleanup function to remove the control when the component unmounts or map changes
    return () => {
      // Check if map and controlDiv still exist and if map.controls is still valid
      if (map && map.controls && controlDiv) {
        const controlsArray = map.controls[controlPosition].getArray();
        const index = controlsArray.indexOf(controlDiv);
        if (index > -1) {
          map.controls[controlPosition].removeAt(index);
        }
      }
    };
  }, [map, controlPosition]);

  return <div ref={controlRef}>{children}</div>;
};
