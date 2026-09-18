"use client";

import React, { useEffect, useRef, useState } from "react";
import SunCalc from "suncalc";
import { RoofSection, getAggregateAnalytics } from "@/store/useConfiguratorStore";
import { calculateIrradiancePercentage } from "@/lib/thailandSolar";
import { type VisualizerPanelProduct } from "@/lib/visualizerProducts";
import { Sun, Compass, Zap, TrendingUp, Wand2, Trash2, Flame, Plus, ZoomIn, ZoomOut, Lock, Unlock, MousePointer2, ChevronUp, ChevronDown } from "@/components/ui/icons";
import { TransformWrapper, TransformComponent, type ReactZoomPanPinchContentRef } from "react-zoom-pan-pinch";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useLocale, useTranslations } from "next-intl";
import { GsapPulse } from "@/components/ui/GsapMotion";
import AnimatedNumber from "@/components/ui/AnimatedNumber";
import { Map, useMap } from "@/components/ui/map";
import { SATELLITE_MAP_STYLE } from "@/lib/map-styles";
import { PatternLines } from "@visx/pattern";

let panelSequence = 0;

function FitMapToRoof({ bounds }: { bounds: [[number, number], [number, number]] }) {
  const { isLoaded, map } = useMap();
  useEffect(() => {
    if (!map || !isLoaded) return;
    map.fitBounds([[bounds[0][1], bounds[0][0]], [bounds[1][1], bounds[1][0]]], { padding: 0, duration: 0 });
  }, [bounds, isLoaded, map]);
  return null;
}
function createPanelId() {
  panelSequence += 1;
  return `p-${panelSequence}`;
}

type CanvasToolMode = "select" | "add-panel" | "delete-panel";

function isPointInPolygon(point: { x: number; y: number }, polygon: { x: number; y: number }[]): boolean {
  if (!polygon || polygon.length < 3) return false;
  const x = point.x, y = point.y;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;
    const intersect = ((yi > y) !== (yj > y))
        && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

interface SimulatorOverlayProps {
  activeRoof: RoofSection;
  allRoofs: RoofSection[];           // All roof sections for aggregate HUD
  selectedProduct: VisualizerPanelProduct;
  shadingMonth: number;
  shadingTimeHour: number;
  onPanelUpdate: (newPanels: { id: string; x: number; y: number; rotation: number }[]) => void;
  daytimeUsagePercent?: number;
  electricityRate?: number;
  financialInputsReady?: boolean;
  setbackMargin?: number;
}

export default function SimulatorOverlay({
  activeRoof,
  allRoofs,
  selectedProduct,
  shadingMonth,
  shadingTimeHour,
  onPanelUpdate,
  daytimeUsagePercent = 70,
  electricityRate = 4.5,
  financialInputsReady = false,
  setbackMargin = 0.5
}: SimulatorOverlayProps) {
  const t = useTranslations("SimulatorOverlay");
  const locale = useLocale();
  const currencyFormatter = new Intl.NumberFormat(
    locale === "en" ? "en-US" : "th-TH",
    {
      style: "currency",
      currency: "THB",
      maximumFractionDigits: 0,
    },
  );
  const mapRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const workspaceRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const transformControlsRef = useRef<ReactZoomPanPinchContentRef | null>(null);
  const [isDraggingPanel, setIsDraggingPanel] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [toolMode, setToolMode] = useState<CanvasToolMode>("select");
  const [selectedPanelId, setSelectedPanelId] = useState<string | null>(null);
  const [isViewportLocked, setIsViewportLocked] = useState(false);
  const [manualScale, setManualScale] = useState(1);
  const [isHudExpanded, setIsHudExpanded] = useState(true);
  const [dragState, setDragState] = useState<{
    id: string;
    offsetX: number;
    offsetY: number;
  } | null>(null);

  const handleAutoFill = () => {
    // 1. Determine the setback boundary points
    let boundaryPoints = activeRoof.setbackPolygonPoints && activeRoof.setbackPolygonPoints.length >= 3
      ? activeRoof.setbackPolygonPoints
      : activeRoof.polygonPoints && activeRoof.polygonPoints.length >= 3
        ? activeRoof.polygonPoints
        : null;

    if (!boundaryPoints) {
      // Fallback to rectangular setback
      const margin = setbackMargin ?? 0.5;
      const minX = margin;
      const maxX = Math.max(minX, physicalWidth - margin);
      const minY = margin;
      const maxY = Math.max(minY, physicalHeight - margin);
      boundaryPoints = [
        { x: minX, y: minY },
        { x: maxX, y: minY },
        { x: maxX, y: maxY },
        { x: minX, y: maxY }
      ];
    }

    // 2. Loop through candidate grid points
    const spacing = 0.05;
    const panelW = selectedProduct.width;
    const panelH = selectedProduct.height;
    const stepX = panelW + spacing;
    const stepY = panelH + spacing;

    // Find bounding box of boundaryPoints
    const xs = boundaryPoints.map(p => p.x);
    const ys = boundaryPoints.map(p => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    const filledPanels: { id: string; x: number; y: number; rotation: number }[] = [];

    for (let x = minX; x <= maxX - panelW; x += stepX) {
      for (let y = minY; y <= maxY - panelH; y += stepY) {
        // Points to check
        const pointsToCheck = [
          { x: x, y: y }, // Top-Left
          { x: x + panelW, y: y }, // Top-Right
          { x: x, y: y + panelH }, // Bottom-Left
          { x: x + panelW, y: y + panelH }, // Bottom-Right
          { x: x + panelW / 2, y: y + panelH / 2 } // Center
        ];

        // Must be completely inside boundaryPoints
        const allInside = pointsToCheck.every(pt => isPointInPolygon(pt, boundaryPoints!));
        
        // Obstacle collision check
        let overlapsObstacle = false;
        if (activeRoof.obstacles && activeRoof.obstacles.length > 0) {
          for (const obs of activeRoof.obstacles) {
            const centerPt = { x: x + panelW / 2, y: y + panelH / 2 };
            if (isPointInPolygon(centerPt, obs)) {
              overlapsObstacle = true;
              break;
            }
          }
        }

        if (allInside && !overlapsObstacle) {
          filledPanels.push({
            id: createPanelId(),
            x,
            y,
            rotation: 0
          });
        }
      }
    }

    if (filledPanels.length === 0) {
      toast.error(t("toast.autoFillFailed"));
    } else {
      onPanelUpdate(filledPanels);
      toast.success(t("toast.autoFillSuccess", { count: filledPanels.length }));
    }
  };

  const handleClearAll = () => {
    onPanelUpdate([]);
    toast.success(t("toast.clearAllSuccess"));
  };

  const hasDrawnRoof = activeRoof.polygonPoints && activeRoof.polygonPoints.length > 0;

  // Use the geographic bounds generated by Turf.js in MapRoofSelector
  const bounds: [[number, number], [number, number]] = activeRoof.bounds || [
    [13.75, 100.50],
    [13.76, 100.51]
  ];

  // Base physical dimensions in meters
  const physicalWidth = activeRoof.width || 10;
  const physicalHeight = activeRoof.height || 10;
  
  // Group rotation angle
  const baseRotation = activeRoof.panelRotation ?? 0;

  // Calculate Sun Shading based on actual Lat/Lng
  const lat = activeRoof.latitude || 13.7563;
  const lng = activeRoof.longitude || 100.5018;
  const sunPosition = SunCalc.getPosition(new Date(2026, shadingMonth, 21, shadingTimeHour, 0), lat, lng);
  const sunAltitude = sunPosition.altitude; // in radians
  const sunAzimuth = sunPosition.azimuth;   // in radians

  const isDaytime = sunAltitude > 0;
  const sunOpacity = isDaytime ? Math.min(1, sunAltitude * 3) : 0;

  // Trigonometry to place Sun on the canvas perimeter
  const alphaScreen = sunAzimuth + Math.PI / 2;
  const sunXPercent = 50 + 44 * Math.cos(alphaScreen);
  const sunYPercent = 50 + 44 * Math.sin(alphaScreen);

  // ── Irradiance Calculation Engine (Vector Math) ──────────────────
  // Convert roof parameters to radians
  const pitchRad = (activeRoof.pitch * Math.PI) / 180;
  const orientationRad = ((activeRoof.roofOrientation ?? 180) * Math.PI) / 180;

  // Cartesian Sun Vector S (East = +x, Up = +y, North = +z)
  const sunX = -Math.cos(sunAltitude) * Math.sin(sunAzimuth);
  const sunY = Math.sin(sunAltitude);
  const sunZ = -Math.cos(sunAltitude) * Math.cos(sunAzimuth);

  // Cartesian Roof Normal Vector N (East = +x, Up = +y, North = +z)
  const normalX = Math.sin(pitchRad) * Math.sin(orientationRad);
  const normalY = Math.cos(pitchRad);
  const normalZ = Math.sin(pitchRad) * Math.cos(orientationRad);

  // Dot product (clamped between -1 and 1)
  const dotProduct = sunX * normalX + sunY * normalY + sunZ * normalZ;
  const clampedCosTheta = Math.max(-1, Math.min(1, dotProduct));
  
  // Incidence angle in degrees
  const incidenceAngleDeg = (Math.acos(clampedCosTheta) * 180) / Math.PI;

  // If sun is below horizon or behind roof pitch, irradiance is 0%
  const irradiancePercentage = calculateIrradiancePercentage(dotProduct, sunAltitude);
  
  // Dynamic efficiency corresponds to the active irradiance percentage
  const efficiency = irradiancePercentage;

  // ── Multi-Roof Aggregate Analytics ───────────────────────────────────────────
  const aggregate = getAggregateAnalytics(
    allRoofs,
    selectedProduct.power,
    daytimeUsagePercent,
    electricityRate,
  );

  // Payback period estimate: assume ~25,000 THB/kWp installed cost
  const INSTALLED_COST_PER_KWP = 25000;
  const totalInstallCost = aggregate.totalKwp * INSTALLED_COST_PER_KWP;
  const paybackYears = aggregate.estMonthlySavings > 0
    ? totalInstallCost / (aggregate.estMonthlySavings * 12)
    : 0;

  // Per-active-roof local metrics (legacy: used only for active roof display)
  const panels = activeRoof.panels || [];
  const formatPrice = (price: number) => {
    return currencyFormatter.format(Math.round(price));
  };

  const getEfficiencyColor = (eff: number) => {
    if (eff >= 70) return "text-[var(--sd-success)]";
    if (eff >= 40) return "text-amber-700";
    return "text-rose-700";
  };

  const getEfficiencyBadge = (eff: number) => {
    if (eff >= 70) return { label: t("efficiency.excellent"), cls: "bg-emerald-50 text-emerald-700 border-emerald-200" };
    if (eff >= 40) return { label: t("efficiency.fair"), cls: "bg-amber-50 text-amber-700 border-amber-200" };
    return { label: t("efficiency.low"), cls: "bg-rose-50 text-rose-700 border-rose-200" };
  };

  const handleCanvasClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (toolMode !== "add-panel") {
      if (toolMode === "select") setSelectedPanelId(null);
      return;
    }

    // Only add if clicking on empty space (not a panel or overlay)
    const target = e.target as HTMLElement;
    if (target.closest('.cursor-grab') || target.closest('.pointer-events-auto')) return;
    
    const svgRect = e.currentTarget.getBoundingClientRect();
    const scaleX = physicalWidth / svgRect.width;
    const scaleY = physicalHeight / svgRect.height;
    
    const x = (e.clientX - svgRect.left) * scaleX - (selectedProduct.width / 2);
    const y = (e.clientY - svgRect.top) * scaleY - (selectedProduct.height / 2);

    const newPanel = {
      id: createPanelId(),
      x,
      y,
      rotation: 0
    };
    onPanelUpdate([...panels, newPanel]);
  };

  const removePanel = (id: string) => {
    onPanelUpdate(panels.filter(p => p.id !== id));
    if (selectedPanelId === id) setSelectedPanelId(null);
  };

  const snapPanelCoordinate = (value: number, interval = 0.1) => {
    return Math.round(value / interval) * interval;
  };

  const getPhysicalPointer = (clientX: number, clientY: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    return {
      x: ((clientX - rect.left) / rect.width) * physicalWidth,
      y: ((clientY - rect.top) / rect.height) * physicalHeight,
    };
  };

  const updatePanelPositionFromPointer = (clientX: number, clientY: number, activeDrag = dragState) => {
    if (!activeDrag) return;
    const point = getPhysicalPointer(clientX, clientY);
    if (!point) return;

    const rawX = point.x - activeDrag.offsetX;
    const rawY = point.y - activeDrag.offsetY;
    const snappedX = snapPanelCoordinate(rawX);
    const snappedY = snapPanelCoordinate(rawY);

    onPanelUpdate(panels.map(panelItem =>
      panelItem.id === activeDrag.id ? { ...panelItem, x: snappedX, y: snappedY } : panelItem
    ));
  };

  const startPanelDrag = (panel: { id: string; x: number; y: number }, e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (toolMode === "delete-panel") {
      removePanel(panel.id);
      return;
    }
    if (toolMode !== "select") return;

    const point = getPhysicalPointer(e.clientX, e.clientY);
    if (!point) return;
    const nextDragState = {
      id: panel.id,
      offsetX: point.x - panel.x,
      offsetY: point.y - panel.y,
    };
    setSelectedPanelId(panel.id);
    setDragState(nextDragState);
    setIsDraggingPanel(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const endPanelDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDraggingPanel(false);
    setDragState(null);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  const addPanelNear = (panel: { x: number; y: number }) => {
    const nextPanel = {
      id: createPanelId(),
      x: snapPanelCoordinate(panel.x + selectedProduct.width + 0.1),
      y: snapPanelCoordinate(panel.y),
      rotation: 0,
    };
    onPanelUpdate([...panels, nextPanel]);
    setSelectedPanelId(nextPanel.id);
  };

  // Slope calculations for bottom edge and arrow indicator
  const orientationDeg = activeRoof.roofOrientation ?? 180;
  const azimuthRad = ((orientationDeg - 90) * Math.PI) / 180;
  const slopeDx = Math.cos(azimuthRad);
  const slopeDy = Math.sin(azimuthRad);

  // Compute centroid or center of bounding box
  let roofCenterX = physicalWidth / 2;
  let roofCenterY = physicalHeight / 2;
  const roofPoints = activeRoof.polygonPoints && activeRoof.polygonPoints.length > 0
    ? activeRoof.polygonPoints
    : [
        { x: 0, y: 0 },
        { x: physicalWidth, y: 0 },
        { x: physicalWidth, y: physicalHeight },
        { x: 0, y: physicalHeight }
      ];

  if (activeRoof.polygonPoints && activeRoof.polygonPoints.length > 0) {
    const xs = activeRoof.polygonPoints.map(p => p.x);
    const ys = activeRoof.polygonPoints.map(p => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    roofCenterX = (minX + maxX) / 2;
    roofCenterY = (minY + maxY) / 2;
  }

  const isPanelInsideRoof = (panel: { x: number; y: number }) => {
    const polyPoints = activeRoof.polygonPoints && activeRoof.polygonPoints.length > 0
      ? activeRoof.polygonPoints
      : roofPoints;
    const centerX = panel.x + selectedProduct.width / 2;
    const centerY = panel.y + selectedProduct.height / 2;
    return isPointInPolygon({ x: centerX, y: centerY }, polyPoints);
  };

  const roofGridX = Array.from({ length: Math.floor(physicalWidth) + 1 }, (_, index) => index);
  const roofGridY = Array.from({ length: Math.floor(physicalHeight) + 1 }, (_, index) => index);
  const roofClipId = `roof-shadow-clip-${activeRoof.id.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const shadowGradientId = `ambient-shadow-${activeRoof.id.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const shadowHotspotId = `shadow-hotspot-${activeRoof.id.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const shadowFilterId = `shadow-blur-${activeRoof.id.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const shadowDx = -Math.cos(alphaScreen);
  const shadowDy = -Math.sin(alphaScreen);
  const shadowStrength = isDaytime
    ? Math.min(0.54, Math.max(0.1, (1 - Math.sin(sunAltitude)) * 0.5))
    : 0.6;
  const shadowStartX = `${50 - shadowDx * 48}%`;
  const shadowStartY = `${50 - shadowDy * 48}%`;
  const shadowEndX = `${50 + shadowDx * 48}%`;
  const shadowEndY = `${50 + shadowDy * 48}%`;
  const shadowHotspotX = roofCenterX + shadowDx * physicalWidth * 0.18;
  const shadowHotspotY = roofCenterY + shadowDy * physicalHeight * 0.18;

  const roofBounds = roofPoints.reduce(
    (bounds, point) => ({
      minX: Math.min(bounds.minX, point.x),
      maxX: Math.max(bounds.maxX, point.x),
      minY: Math.min(bounds.minY, point.y),
      maxY: Math.max(bounds.maxY, point.y),
    }),
    { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity },
  );
  const safeRoofBounds = Number.isFinite(roofBounds.minX)
    ? roofBounds
    : { minX: 0, maxX: physicalWidth, minY: 0, maxY: physicalHeight };

  useEffect(() => {
    if (hasDrawnRoof || !transformControlsRef.current || !viewportRef.current || !workspaceRef.current) return;

    const frame = window.requestAnimationFrame(() => {
      const viewportRect = viewportRef.current?.getBoundingClientRect();
      const workspace = workspaceRef.current;
      const controls = transformControlsRef.current;
      if (!viewportRect || !workspace || !controls) return;

      const roofPixelWidth = physicalWidth * 100;
      const roofPixelHeight = physicalHeight * 100;
      const roofOriginX = (workspace.offsetWidth - roofPixelWidth) / 2;
      const roofOriginY = (workspace.offsetHeight - roofPixelHeight) / 2;
      const boundsWidthPx = Math.max(1, (safeRoofBounds.maxX - safeRoofBounds.minX) * 100);
      const boundsHeightPx = Math.max(1, (safeRoofBounds.maxY - safeRoofBounds.minY) * 100);
      const fitScale = Math.min(
        1.15,
        Math.max(
          0.45,
          Math.min(viewportRect.width / (boundsWidthPx * 1.35), viewportRect.height / (boundsHeightPx * 1.35)),
        ),
      );
      const roofCenterPxX = roofOriginX + ((safeRoofBounds.minX + safeRoofBounds.maxX) / 2) * 100;
      const roofCenterPxY = roofOriginY + ((safeRoofBounds.minY + safeRoofBounds.maxY) / 2) * 100;
      const positionX = viewportRect.width / 2 - roofCenterPxX * fitScale;
      const positionY = viewportRect.height / 2 - roofCenterPxY * fitScale;

      controls.setTransform(positionX, positionY, fitScale, 220, "easeOut");
    });

    return () => window.cancelAnimationFrame(frame);
  }, [
    activeRoof.id,
    activeRoof.polygonPoints,
    hasDrawnRoof,
    physicalHeight,
    physicalWidth,
    safeRoofBounds.maxX,
    safeRoofBounds.maxY,
    safeRoofBounds.minX,
    safeRoofBounds.minY,
  ]);

  // Find the edge most facing the slope direction
  let bottomEdge = { p1: { x: 0, y: physicalHeight }, p2: { x: physicalWidth, y: physicalHeight } };
  if (roofPoints.length >= 3) {
    let maxProj = -Infinity;
    let bestIdx = 0;
    for (let i = 0; i < roofPoints.length; i++) {
      const p1 = roofPoints[i];
      const p2 = roofPoints[(i + 1) % roofPoints.length];
      const midX = (p1.x + p2.x) / 2;
      const midY = (p1.y + p2.y) / 2;
      const proj = midX * slopeDx + midY * slopeDy;
      if (proj > maxProj) {
        maxProj = proj;
        bestIdx = i;
      }
    }
    bottomEdge = { p1: roofPoints[bestIdx], p2: roofPoints[(bestIdx + 1) % roofPoints.length] };
  }

  const svgContent = (
    <svg 
      viewBox={`0 0 ${physicalWidth} ${physicalHeight}`} 
      width="100%"
      height="100%"
      className="w-full h-full overflow-visible"
      onClick={handleCanvasClick}
      style={{
        cursor: toolMode === "add-panel" ? "crosshair" : toolMode === "delete-panel" ? "not-allowed" : "default",
        width: "100%",
        height: "100%",
      }}
    >
        {/* Visx gallery pattern definitions */}
        <defs>
          <PatternLines
            id="roof-concrete"
            width={0.4}
            height={0.3}
            background="#f1f5f9"
            stroke="#cbd5e1"
            strokeWidth={0.015}
            orientation={["horizontal"]}
          />
          <PatternLines
            id="roof-metal"
            width={0.25}
            height={0.25}
            background="#f1f5f9"
            stroke="#cbd5e1"
            strokeWidth={0.02}
            orientation={["vertical"]}
          />

        <clipPath id={roofClipId}>
          {hasDrawnRoof ? (
            <polygon points={activeRoof.polygonPoints!.map(p => `${p.x},${p.y}`).join(' ')} />
          ) : (
            <rect x={0} y={0} width={physicalWidth} height={physicalHeight} />
          )}
        </clipPath>

        <linearGradient id={shadowGradientId} x1={shadowStartX} y1={shadowStartY} x2={shadowEndX} y2={shadowEndY}>
          <stop offset="0%" stopColor="#020617" stopOpacity={shadowStrength * 0.08} />
          <stop offset="44%" stopColor="#020617" stopOpacity={shadowStrength * 0.22} />
          <stop offset="100%" stopColor="#020617" stopOpacity={shadowStrength} />
        </linearGradient>

        <radialGradient id={shadowHotspotId} cx="50%" cy="50%" r="68%">
          <stop offset="0%" stopColor="#020617" stopOpacity={shadowStrength * 0.42} />
          <stop offset="52%" stopColor="#334155" stopOpacity={shadowStrength * 0.16} />
          <stop offset="100%" stopColor="#020617" stopOpacity="0" />
        </radialGradient>

        <filter id={shadowFilterId} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="0.32" />
        </filter>

      </defs>

      {/* Precision snap grid */}
      <g pointerEvents="none" opacity="0.42">
        {roofGridX.map((x) => (
          <line key={`grid-x-${x}`} x1={x} y1={0} x2={x} y2={physicalHeight} stroke="#cbd5e1" strokeWidth="0.01" />
        ))}
        {roofGridY.map((y) => (
          <line key={`grid-y-${y}`} x1={0} y1={y} x2={physicalWidth} y2={y} stroke="#cbd5e1" strokeWidth="0.01" />
        ))}
      </g>
      
      {/* Draw main roof polygon with premium 2D aesthetics */}
      {hasDrawnRoof ? (
        <polygon
          points={activeRoof.polygonPoints!.map(p => `${p.x},${p.y}`).join(' ')}
          fill={activeRoof.roofType === 'metal' ? 'url(#roof-metal)' : 'url(#roof-concrete)'}
          stroke="#94a3b8"
          strokeWidth="4"
          vectorEffect="non-scaling-stroke"
          style={{ filter: "drop-shadow(0px 8px 16px rgba(15, 23, 42, 0.15))" }}
          pointerEvents="none"
        />
      ) : (
        <rect
          x={0}
          y={0}
          width={physicalWidth}
          height={physicalHeight}
          fill={activeRoof.roofType === 'metal' ? 'url(#roof-metal)' : 'url(#roof-concrete)'}
          stroke="#94a3b8"
          strokeWidth="4"
          vectorEffect="non-scaling-stroke"
          style={{ filter: "drop-shadow(0px 8px 16px rgba(15, 23, 42, 0.15))" }}
          pointerEvents="none"
        />
      )}

      {/* Bottom Slope Edge Highlight */}
      <line
        x1={bottomEdge.p1.x}
        y1={bottomEdge.p1.y}
        x2={bottomEdge.p2.x}
        y2={bottomEdge.p2.y}
        stroke="#1CBBBB"
        strokeWidth="6"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        pointerEvents="none"
      />

      {/* Smooth ambient occlusion clipped to the active roof shape */}
      <g clipPath={`url(#${roofClipId})`} pointerEvents="none">
        <rect
          x={-physicalWidth * 0.05}
          y={-physicalHeight * 0.05}
          width={physicalWidth * 1.1}
          height={physicalHeight * 1.1}
          fill={`url(#${shadowGradientId})`}
          opacity={showHeatmap ? 1 : 0.18}
        />
        <ellipse
          cx={shadowHotspotX}
          cy={shadowHotspotY}
          rx={Math.max(physicalWidth, 1) * 0.42}
          ry={Math.max(physicalHeight, 1) * 0.28}
          fill={`url(#${shadowHotspotId})`}
          filter={`url(#${shadowFilterId})`}
          transform={`rotate(${(sunAzimuth * 180) / Math.PI} ${shadowHotspotX} ${shadowHotspotY})`}
          opacity={showHeatmap ? 0.9 : 0.25}
        />
        {activeRoof.obstacles?.map((obstacle, obstacleIndex) => {
          const xs = obstacle.map((point) => point.x);
          const ys = obstacle.map((point) => point.y);
          const obstacleCenterX = (Math.min(...xs) + Math.max(...xs)) / 2;
          const obstacleCenterY = (Math.min(...ys) + Math.max(...ys)) / 2;
          const obstacleWidth = Math.max(0.5, Math.max(...xs) - Math.min(...xs));
          const obstacleHeight = Math.max(0.5, Math.max(...ys) - Math.min(...ys));

          return (
            <ellipse
              key={`soft-obstacle-shadow-${obstacleIndex}`}
              cx={obstacleCenterX + shadowDx * obstacleWidth * 1.4}
              cy={obstacleCenterY + shadowDy * obstacleHeight * 1.4}
              rx={obstacleWidth * 1.8}
              ry={obstacleHeight * 1.2}
              fill="#020617"
              filter={`url(#${shadowFilterId})`}
              opacity={showHeatmap ? shadowStrength * 0.7 : shadowStrength * 0.25}
              transform={`rotate(${(sunAzimuth * 180) / Math.PI} ${obstacleCenterX} ${obstacleCenterY})`}
            />
          );
        })}
      </g>

      {/* Dimension indicators */}
      <g pointerEvents="none">
        <line x1={0} y1={-0.45} x2={physicalWidth} y2={-0.45} stroke="#0f766e" strokeWidth="0.025" strokeDasharray="0.08 0.08" />
        <text x={physicalWidth / 2} y={-0.58} textAnchor="middle" fontSize="0.24" fill="#0f766e" fontWeight="700">
          {physicalWidth.toFixed(1)} m
        </text>
        <line x1={-0.45} y1={0} x2={-0.45} y2={physicalHeight} stroke="#0f766e" strokeWidth="0.025" strokeDasharray="0.08 0.08" />
        <text x={-0.6} y={physicalHeight / 2} textAnchor="middle" fontSize="0.24" fill="#0f766e" fontWeight="700" transform={`rotate(-90 -0.6 ${physicalHeight / 2})`}>
          {physicalHeight.toFixed(1)} m
        </text>
      </g>

      {/* HTML ForeignObject Layer for Panels & Heatmap Rendering */}
      <foreignObject
        x={0}
        y={0}
        width={physicalWidth}
        height={physicalHeight}
        className="pointer-events-none overflow-visible"
      >
        <div 
          ref={containerRef} 
          className="relative pointer-events-none"
          style={{
            width: `${physicalWidth * 100}px`,
            height: `${physicalHeight * 100}px`,
            transform: 'scale(0.01)',
            transformOrigin: 'top left',
          }}
        >
          {/* NOTE: No rotation on this container. Pointer deltas stay in screen space;
              rotation is applied per panel so drag remains predictable. */}
          <div 
            className="w-full h-full relative pointer-events-none"
          >
            {/* Draggable Panels */}
            {panels.map((panel, index) => {
              const leftPx = panel.x * 100;
              const topPx = panel.y * 100;
              const widthPx = selectedProduct.width * 100;
              const heightPx = selectedProduct.height * 100;
              
              // Heatmap styles based on local irradiance
              const getPanelHeatmapStyle = (pct: number) => {
                if (!showHeatmap) {
                  return {
                    borderClass: "border-slate-650/80",
                    shadowStyle: "none",
                    overlayBg: "transparent",
                    percentageColor: "text-slate-400",
                  };
                }

                // Calculate gradient angle relative to the panel
                const sunAzimuthDeg = (sunAzimuth * 180) / Math.PI;
                const gradientAngle = sunAzimuthDeg - baseRotation;
                const factor = pct / 100;

                // High Irradiance Start Color: Amber/Yellow (251, 191, 36) -> Shaded Base (15, 23, 42)
                const startR = Math.round(15 + (251 - 15) * factor);
                const startG = Math.round(23 + (191 - 23) * factor);
                const startB = Math.round(42 + (36 - 42) * factor);
                const startA = 0.75 - (0.75 - 0.45) * factor;

                // Low Irradiance End Color: Soft Translucent Blue (30, 58, 138) -> Shaded Base (15, 23, 42)
                const endR = Math.round(15 + (30 - 15) * factor);
                const endG = Math.round(23 + (58 - 23) * factor);
                const endB = Math.round(42 + (138 - 42) * factor);
                const endA = 0.75 - (0.75 - 0.15) * factor;

                const gradientBg = `linear-gradient(${gradientAngle}deg, rgba(${startR}, ${startG}, ${startB}, ${startA}), rgba(${endR}, ${endG}, ${endB}, ${endA}))`;

                if (pct >= 90) {
                  return {
                    borderClass: "border-amber-400",
                    shadowStyle: "0px 0px 15px rgba(245, 158, 11, 0.6)",
                    overlayBg: gradientBg,
                    percentageColor: "text-amber-400",
                  };
                } else if (pct >= 60) {
                  return {
                    borderClass: "border-teal-400",
                    shadowStyle: "0px 0px 10px rgba(20, 184, 166, 0.4)",
                    overlayBg: gradientBg,
                    percentageColor: "text-teal-400",
                  };
                } else {
                  return {
                    borderClass: "border-indigo-900/60",
                    shadowStyle: "none",
                    overlayBg: gradientBg,
                    percentageColor: "text-indigo-300",
                  };
                }
              };

              const obstacleShadeDrop = activeRoof.obstacles?.some((obs) => (
                isPointInPolygon(
                  { x: panel.x + selectedProduct.width / 2, y: panel.y + selectedProduct.height / 2 },
                  obs,
                )
              )) ? 45 : 0;
              const directionalDrop = Math.max(0, Math.min(18, ((panel.x / Math.max(physicalWidth, 1)) * 10) + ((panel.y / Math.max(physicalHeight, 1)) * 8)));
              const panelIrradiance = Math.max(0, Math.min(100, irradiancePercentage - obstacleShadeDrop - directionalDrop));
              const heatmap = getPanelHeatmapStyle(panelIrradiance);
              const isSelected = selectedPanelId === panel.id;
              const isInside = isPanelInsideRoof(panel);
              
              return (
                <div
                  key={panel.id}
                  onPointerDown={(e) => startPanelDrag(panel, e)}
                  onPointerMove={(e) => updatePanelPositionFromPointer(e.clientX, e.clientY)}
                  onPointerUp={endPanelDrag}
                  onPointerCancel={endPanelDrag}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (toolMode === "delete-panel") {
                      removePanel(panel.id);
                      return;
                    }
                    if (toolMode !== "select") return;
                    setSelectedPanelId(panel.id);
                  }}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    removePanel(panel.id);
                  }}
                  className={`absolute ${toolMode === "delete-panel" ? "cursor-pointer" : "cursor-grab active:cursor-grabbing"} border-2 ${isSelected ? "border-teal-300 ring-4 ring-teal-300/50" : heatmap.borderClass} ${!isInside ? "outline outline-2 outline-rose-500/80" : ""} bg-gradient-to-br from-slate-800 to-slate-900 rounded flex flex-col items-center justify-center pointer-events-auto transition-all duration-300`}
                  style={{
                    left: `${leftPx}px`,
                    top: `${topPx}px`,
                    width: `${widthPx}px`,
                    height: `${heightPx}px`,
                    minWidth: `${widthPx}px`,
                    minHeight: `${heightPx}px`,
                    maxWidth: `${widthPx}px`,
                    maxHeight: `${heightPx}px`,
                    boxShadow: heatmap.shadowStyle,
                    transform: `rotate(${baseRotation}deg) scale(${isSelected ? 1.04 : 1})`,
                  }}
                >
                  {/* Heatmap overlay */}
                  <div 
                    className="absolute inset-0 rounded pointer-events-none transition-all duration-300"
                    style={{
                      background: heatmap.overlayBg,
                      mixBlendMode: "overlay"
                    }}
                  />

                  {/* Premium PV Grid Cell Patterns (6x10 Monocrystalline Grid) */}
                  <div 
                    className="absolute inset-0 grid p-[2px] gap-[1px] opacity-20 pointer-events-none"
                    style={{
                      gridTemplateColumns: "repeat(6, 1fr)",
                      gridTemplateRows: "repeat(10, 1fr)"
                    }}
                  >
                    {Array.from({ length: 60 }).map((_, idx) => (
                      <div 
                        key={idx} 
                        className="border-[0.5px] border-slate-400/40 rounded-[1px] bg-slate-950/20"
                      />
                    ))}
                  </div>
                  
                  {/* Dynamic Technical Label */}
                  <div 
                    style={{ transform: `rotate(${-baseRotation}deg)` }}
                    className="z-10 flex flex-col items-center gap-0.5 select-none bg-slate-950/80 px-1.5 py-0.5 rounded border border-slate-700/50 backdrop-blur-[1px] opacity-95 transition-transform duration-305"
                  >
                    <span className="text-[10px] text-white font-mono font-bold leading-none">
                      {selectedProduct?.power ? `${selectedProduct.power}W` : "PV"}
                    </span>
                    <span className={`text-[8px] ${heatmap.percentageColor} font-mono font-bold leading-none`}>
                      {selectedProduct.power}W -&gt; {panelIrradiance.toFixed(0)}% Irr
                    </span>
                    <span className="text-[7px] text-slate-400 font-mono font-semibold leading-none">
                      #{index < 9 ? `0${index + 1}` : index + 1}
                    </span>
                  </div>
                  {isSelected && (
                    <div
                      style={{ transform: `rotate(${-baseRotation}deg)` }}
                      className="absolute -top-14 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1.5 rounded-xl border border-slate-200 bg-brand-surface/95 p-1.5 shadow-lg"
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        title="Add panel"
                        onClick={() => addPanelNear(panel)}
                        className="flex h-11 w-11 items-center justify-center rounded-lg border border-teal-100 bg-teal-50 text-teal-700"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        title="Delete panel"
                        onClick={() => removePanel(panel.id)}
                        className="flex h-11 w-11 items-center justify-center rounded-lg border border-rose-100 bg-rose-50 text-rose-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </foreignObject>

      {/* Slope Direction Indicator (drawn on top of panels) */}
      <g transform={`translate(${roofCenterX}, ${roofCenterY})`} pointerEvents="none">
        {/* Semi-transparent background circle so it's readable */}
        <circle r="0.4" fill="rgba(255, 255, 255, 0.9)" stroke="#1CBBBB" strokeWidth="0.03" />
        {/* Arrow pointing in the azimuth direction */}
        <g transform={`rotate(${orientationDeg})`}>
          {/* Line */}
          <line x1="0" y1="0.2" x2="0" y2="-0.2" stroke="#1CBBBB" strokeWidth="0.05" strokeLinecap="round" />
          {/* Arrowhead pointing up (representing direction arrow) */}
          <path d="M -0.1 -0.08 L 0 -0.23 L 0.1 -0.08" fill="none" stroke="#1CBBBB" strokeWidth="0.05" strokeLinejoin="round" strokeLinecap="round" />
        </g>
      </g>
    </svg>
  );

  return (
    <div ref={viewportRef} className="relative w-full h-full border border-slate-200 rounded-3xl overflow-hidden shadow-inner bg-slate-100">
      
      {/* CONDITIONAL RENDER: Map vs CSS Grid Background */}
      {hasDrawnRoof ? (
        <>
        <Map
          center={[(bounds[0][1] + bounds[1][1]) / 2, (bounds[0][0] + bounds[1][0]) / 2]}
          zoom={19}
          dragPan={false}
          scrollZoom={false}
          doubleClickZoom={false}
          attributionControl={false}
          styles={{ light: SATELLITE_MAP_STYLE, dark: SATELLITE_MAP_STYLE }}
          className="absolute inset-0 z-0"
        >
          <FitMapToRoof bounds={bounds} />
        </Map>
        <div className="pointer-events-auto absolute inset-0 z-10">{svgContent}</div>
        </>
      ) : (
        <TransformWrapper
          initialScale={1}
          minScale={0.45}
          maxScale={3.5}
          limitToBounds={false}
          centerOnInit
          wheel={{ step: 0.04, disabled: isViewportLocked }}
          pinch={{ disabled: isViewportLocked, step: 4 }}
          panning={{ disabled: isDraggingPanel || isViewportLocked, velocityDisabled: true }}
          doubleClick={{ disabled: true }}
          onTransform={(_, state) => setManualScale(state.scale)}
          onInit={(ref) => {
            transformControlsRef.current = ref;
          }}
        >
          {({ zoomIn, zoomOut, resetTransform }) => (
            <>
              <TransformComponent wrapperClass="absolute inset-0 z-0 w-full h-full bg-slate-50" contentClass="w-full h-full">
                <div ref={workspaceRef} className="w-full h-full flex items-center justify-center p-8 min-w-[200vw] min-h-[200vh]" style={{
                  backgroundImage: 'linear-gradient(to right, #e2e8f0 1px, transparent 1px), linear-gradient(to bottom, #e2e8f0 1px, transparent 1px)',
                  backgroundSize: '40px 40px',
                  backgroundPosition: 'center'
                }}>
                  <div
                    ref={mapRef}
                    style={{
                      width: `${physicalWidth * 100}px`,
                      height: `${physicalHeight * 100}px`
                    }}
                    className="bg-brand-surface shadow-xl"
                  >
                    {svgContent}
                  </div>
                </div>
              </TransformComponent>
              <div className="absolute top-4 right-4 z-50 flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-brand-surface/90 p-1.5 shadow-lg backdrop-blur pointer-events-auto">
                <button type="button" onClick={() => zoomOut(0.25)} aria-label={locale === "th" ? "ลดการซูมแคนวาส" : "Zoom out canvas"} className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:border-[#1CBBBB] hover:text-[#1CBBBB]">
                  <ZoomOut className="w-4 h-4" aria-hidden="true" />
                </button>
                <button type="button" onClick={() => resetTransform()} aria-label={locale === "th" ? "รีเซ็ตการซูมแคนวาส" : "Reset canvas zoom"} className="h-11 min-w-16 rounded-xl border border-slate-200 px-2 font-mono text-[10px] font-black text-slate-700">
                  {(manualScale * 100).toFixed(0)}%
                </button>
                <button type="button" onClick={() => zoomIn(0.25)} aria-label={locale === "th" ? "เพิ่มการซูมแคนวาส" : "Zoom in canvas"} className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:border-[#1CBBBB] hover:text-[#1CBBBB]">
                  <ZoomIn className="w-4 h-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsViewportLocked((value) => !value)}
                  className={cn(
                    "flex h-11 w-11 items-center justify-center rounded-xl border",
                    isViewportLocked
                      ? "border-amber-200 bg-amber-50 text-amber-700"
                      : "border-slate-200 text-slate-600 hover:text-[#1CBBBB] hover:border-[#1CBBBB]",
                  )}
                  title="Lock viewport"
                  aria-label={isViewportLocked
                    ? (locale === "th" ? "ปลดล็อกมุมมองแคนวาส" : "Unlock canvas viewport")
                    : (locale === "th" ? "ล็อกมุมมองแคนวาส" : "Lock canvas viewport")}
                >
                  {isViewportLocked ? <Lock className="w-4 h-4" aria-hidden="true" /> : <Unlock className="w-4 h-4" aria-hidden="true" />}
                </button>
              </div>
            </>
          )}
        </TransformWrapper>
      )}

      <div className="absolute top-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-1.5 rounded-2xl border border-slate-200 bg-brand-surface/90 p-1.5 shadow-lg backdrop-blur pointer-events-auto">
        {([
          { key: "select", label: "Select", icon: MousePointer2 },
          { key: "add-panel", label: "Add", icon: Plus },
          { key: "delete-panel", label: "Delete", icon: Trash2 },
        ] as { key: CanvasToolMode; label: string; icon: typeof MousePointer2 }[]).map((tool) => {
          const Icon = tool.icon;
          const isActive = toolMode === tool.key;

          return (
            <button
              key={tool.key}
              type="button"
              onClick={() => setToolMode(tool.key)}
              title={tool.label}
              className={cn(
                "flex h-11 items-center gap-1.5 rounded-xl border px-3 text-[10px] font-black uppercase tracking-wider transition-colors",
                isActive
                  ? tool.key === "delete-panel"
                    ? "border-rose-200 bg-rose-50 text-rose-700"
                    : "border-[#1CBBBB]/30 bg-[#1CBBBB]/10 text-[#0f766e]"
                  : "border-slate-200 bg-brand-surface text-slate-500 hover:border-[#1CBBBB]/30 hover:text-[#0f766e]",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{tool.label}</span>
            </button>
          );
        })}
      </div>

      {/* Sun Overlay Layer (pointer-events-none z-50) */}
      {isDaytime && (
        <div className="absolute inset-0 pointer-events-none z-50">
          {/* Glowing Sun Circle */}
          <div
            className="absolute w-8 h-8 rounded-full bg-amber-400 flex items-center justify-center shadow-[0_0_20px_#f59e0b] border border-amber-300 transition-all duration-300"
            style={{
              left: `calc(${sunXPercent}% - 16px)`,
              top: `calc(${sunYPercent}% - 16px)`,
              opacity: sunOpacity,
            }}
          >
            <GsapPulse scale={1.12}>
              <Sun className="w-5 h-5 text-amber-950" size={20} />
            </GsapPulse>
          </div>
        </div>
      )}

      {/* ── Aggregate Multi-Roof Telemetry HUD ─────────────────────────── */}
      <div className="absolute bottom-4 left-4 z-50 hidden w-72 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-[#F0EEE9]/80 shadow-xl backdrop-blur-md transition-all duration-300 pointer-events-auto [@media(min-height:520px)]:flex">

        {/* HUD Header */}
        <div 
          onClick={() => setIsHudExpanded(!isHudExpanded)}
          className="px-4 py-2.5 bg-[#B7D1EA]/10 border-b border-slate-200/40 flex items-center justify-between cursor-pointer select-none"
        >
          <div className="flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-slate-700" size={14} />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-750">
              {t("hud.liveHud", { count: aggregate.perRoof.length })}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <GsapPulse className="h-1.5 w-1.5 rounded-full bg-[#B7D1EA]" scale={1.25}>
              <span />
            </GsapPulse>
            {isHudExpanded ? (
              <ChevronDown className="w-4 h-4 text-slate-500" />
            ) : (
              <ChevronUp className="w-4 h-4 text-slate-500" />
            )}
          </div>
        </div>

        {isHudExpanded && (
          <>
            {/* HUD Quick Actions */}
            <div className="px-4 py-2 bg-slate-50/50 border-b border-slate-200/30 flex items-center justify-between gap-2">
              <span className="text-[9px] font-black uppercase text-slate-500">{t("hud.quickActions")}</span>
              <div className="flex items-center gap-1.5">
                {/* Auto-Fill */}
                <button
                  type="button"
                  onClick={handleAutoFill}
                  title={t("actions.autoFill")}
                  className="p-1.5 rounded-lg bg-brand-surface border border-slate-200 text-slate-600 hover:text-[#B7D1EA] hover:border-[#B7D1EA] hover:bg-[#B7D1EA]/5 transition-all shadow-sm cursor-pointer flex items-center justify-center animate-none"
                >
                  <Wand2 className="w-3.5 h-3.5" />
                </button>
                
                {/* Toggle Heatmap */}
                <button
                  type="button"
                  onClick={() => setShowHeatmap(!showHeatmap)}
                  title={showHeatmap ? t("actions.hideHeatmap") : t("actions.showHeatmap")}
                  className={cn(
                    "p-1.5 rounded-lg border transition-all shadow-sm cursor-pointer flex items-center justify-center",
                    showHeatmap 
                      ? "bg-amber-50 border-amber-200 text-amber-500 hover:bg-amber-100/50" 
                      : "bg-brand-surface border-slate-200 text-slate-400 hover:text-amber-500 hover:border-amber-200"
                  )}
                >
                  <Flame className="w-3.5 h-3.5" />
                </button>

                {/* Clear All */}
                <button
                  type="button"
                  onClick={handleClearAll}
                  title={t("actions.clearAll")}
                  className="p-1.5 rounded-lg bg-brand-surface border border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 transition-all shadow-sm cursor-pointer flex items-center justify-center animate-none"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Global Aggregate Metrics */}
            <div className="px-4 pt-3 pb-2 grid grid-cols-3 gap-2 border-b border-slate-200/30">
              <div className="col-span-1">
                <div className="text-[7px] font-black uppercase text-slate-700 leading-none mb-1">{t("metrics.totalPanels")}</div>
                <div className="text-lg font-black font-mono text-slate-900 leading-none">
	                  <AnimatedNumber value={aggregate.totalPanels} />
                  <span className="text-[9px] text-slate-500 font-bold ml-0.5">{t("units.panels")}</span>
                </div>
              </div>
              <div className="col-span-1">
                <div className="text-[7px] font-black uppercase text-slate-700 leading-none mb-1">System kWp</div>
                <div className="text-lg font-black font-mono text-[var(--sd-navy-900)] leading-none">
	                  <AnimatedNumber value={aggregate.totalKwp} decimals={2} />
                  <span className="text-[9px] text-slate-500 font-bold ml-0.5">kWp</span>
                </div>
              </div>
              <div className="col-span-1">
                <div className="text-[7px] font-black uppercase text-slate-700 leading-none mb-1">{t("metrics.activeRoof")}</div>
                <div className="text-[9px] font-black font-mono text-slate-700 leading-none">
	                  <AnimatedNumber value={incidenceAngleDeg} decimals={1} suffix="°" />
                </div>
                <div className={`text-[8px] font-bold ${getEfficiencyColor(efficiency)}`}>
	                  <AnimatedNumber value={efficiency} suffix="% eff" />
                </div>
              </div>
            </div>

            {/* Financial Summary */}
            <div className="px-4 py-3 flex items-center gap-3 border-b border-slate-200/30">
              <div className="flex-1">
                <div className="text-[7px] font-black uppercase text-slate-700 leading-none mb-1 flex items-center gap-1">
                  <Zap className="w-2.5 h-2.5 text-amber-500" />
                  {t("metrics.monthlySavings")}
                </div>
                <div className="text-base font-black font-mono text-[var(--sd-navy-900)] leading-none">
	                  {financialInputsReady ? (
	                    <AnimatedNumber
	                      value={aggregate.estMonthlySavings}
	                      formatter={(amount) => formatPrice(Math.round(amount))}
	                    />
	                  ) : "LOCKED"}
                </div>
              </div>
              <div className="flex-1">
                <div className="text-[7px] font-black uppercase text-slate-700 leading-none mb-1 flex items-center gap-1">
                  <TrendingUp className="w-2.5 h-2.5 text-emerald-500" />
                  {t("metrics.payback")}
                </div>
                <div className="text-base font-black font-mono text-[var(--sd-success)] leading-none">
	                  {financialInputsReady && paybackYears > 0 ? (
	                    <AnimatedNumber value={paybackYears} decimals={1} suffix=" yrs" />
	                  ) : "N/A"}
                </div>
              </div>
            </div>

            {/* Per-Roof Breakdown */}
            <div className="px-4 py-2.5 flex flex-col gap-1.5">
              <div className="text-[8px] font-black uppercase tracking-wider text-slate-700 mb-0.5">
                {t("hud.roofBreakdown")}
              </div>
              {aggregate.perRoof.map((r) => {
                const badge = getEfficiencyBadge(r.efficiency);
                const isActive = r.id === activeRoof.id;
                return (
                  <div
                    key={r.id}
                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border transition-all ${
                      isActive
                        ? "bg-[#B7D1EA]/8 border-[#B7D1EA]/25"
                        : "bg-slate-50/50 border-slate-200/20"
                    }`}
                  >
                    {/* Active indicator dot */}
                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${isActive ? "bg-[#B7D1EA]" : "bg-slate-300"}`} />

                    {/* Roof name */}
                    <div className="flex-1 min-w-0">
                      <div className={`text-[9px] font-black truncate ${isActive ? "text-slate-800" : "text-slate-700"}`}>
                        {r.name.length > 14 ? r.name.slice(0, 14) + "…" : r.name}
                      </div>
                      <div className="text-[8px] text-slate-600 font-semibold font-mono">
                        {t("metrics.roofPanelSummary", { count: r.panelCount, kwp: r.kwp.toFixed(2) })}
                      </div>
                    </div>

                    {/* Efficiency badge */}
                    <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full border whitespace-nowrap shrink-0 ${badge.cls}`}>
                      {r.efficiency.toFixed(0)}% {badge.label}
                    </span>
                  </div>
                );
              })}
              {aggregate.perRoof.length === 0 && (
                <div className="text-[9px] text-slate-600 font-semibold text-center py-2">
                  {t("empty.noPanels")}
                </div>
              )}
            </div>
          </>
        )}
      </div>

    </div>
  );
}
