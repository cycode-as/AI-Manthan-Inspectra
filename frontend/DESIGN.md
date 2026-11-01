---
name: Inspectra Precision Engine
colors:
  surface: '#f9f9ff'
  surface-dim: '#ccdbf6'
  surface-bright: '#f9f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f0f3ff'
  surface-container: '#e7eeff'
  surface-container-high: '#dee9ff'
  surface-container-highest: '#d5e3ff'
  on-surface: '#0d1c30'
  on-surface-variant: '#44474e'
  inverse-surface: '#233146'
  inverse-on-surface: '#ebf1ff'
  outline: '#75777f'
  outline-variant: '#c5c6cf'
  surface-tint: '#4c5e83'
  primary: '#001637'
  on-primary: '#ffffff'
  primary-container: '#172b4d'
  on-primary-container: '#8093bb'
  inverse-primary: '#b4c7f1'
  secondary: '#0051d5'
  on-secondary: '#ffffff'
  secondary-container: '#316bf3'
  on-secondary-container: '#fefcff'
  tertiary: '#22004b'
  on-tertiary: '#ffffff'
  tertiary-container: '#3c007d'
  on-tertiary-container: '#ab78f8'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d7e2ff'
  primary-fixed-dim: '#b4c7f1'
  on-primary-fixed: '#041b3c'
  on-primary-fixed-variant: '#34476a'
  secondary-fixed: '#dbe1ff'
  secondary-fixed-dim: '#b4c5ff'
  on-secondary-fixed: '#00174b'
  on-secondary-fixed-variant: '#003ea8'
  tertiary-fixed: '#ecdcff'
  tertiary-fixed-dim: '#d6baff'
  on-tertiary-fixed: '#280056'
  on-tertiary-fixed-variant: '#5b24a5'
  background: '#f9f9ff'
  on-background: '#0d1c30'
  surface-variant: '#d5e3ff'
typography:
  headline-xl:
    fontFamily: Rubik
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
  headline-lg:
    fontFamily: Rubik
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-md:
    fontFamily: Rubik
    fontSize: 20px
    fontWeight: '500'
    lineHeight: 28px
  headline-sm:
    fontFamily: Rubik
    fontSize: 16px
    fontWeight: '500'
    lineHeight: 24px
  body-lg:
    fontFamily: Rubik
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Rubik
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Rubik
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  tech-data-lg:
    fontFamily: Space Mono
    fontSize: 16px
    fontWeight: '700'
    lineHeight: 20px
  tech-data-md:
    fontFamily: Space Mono
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  tech-data-sm:
    fontFamily: Space Mono
    fontSize: 11px
    fontWeight: '400'
    lineHeight: 14px
  label-caps:
    fontFamily: Rubik
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-desktop: 1.5rem
  margin: 1rem
  margin-desktop: 2rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style

This design system targets quality assurance engineers, plant managers, and automated manufacturing specialists operating high-throughput production lines. The aesthetic balances high-density industrial telemetry with optical clarity.

### Personality & Visual Tenets
- **Engineered Rigor:** Functional density without clutter; visual weight is allocated based on critical alert states rather than decoration.
- **Surgical Precision:** Strict mechanical alignment, explicit bounds, hairline divider lines, and unambiguous state differentiation.
- **Calm Operability:** A high-clarity light theme reduces optical fatigue during prolonged monitoring cycles in control-room and shop-floor environments.

The design movement blends **Modern Industrial Utility** with **Precision Data Density**: tactile enough to communicate clear state changes, flat and structured enough to allow instant scanning of hundreds of data points and automated optical inspection (AOI) bounding boxes.

## Colors

The palette establishes an operational hierarchy where neutral tones support continuous monitoring, and saturated semantic colors immediately flag telemetry anomalies.

### Core Roles
- **Primary Navy (`#172B4D`):** Primary command structures, dominant navigation framing, system headers, and critical modal titles.
- **Action Blue (`#2563EB`):** Interactive focal points, primary execution triggers, selected table rows, active toggles, and bounding box highlights.
- **Secondary Blue Fill (`#E8F0FE`):** Soft focus fills, badge backgrounds for active operations, selected item row tinting.
- **Neutral Core (`#263449`):** Primary data typography, high-contrast metrics, vector icons.
- **Muted Slate (`#738096`):** Secondary labels, metadata timestamps, inactive icons, column headers.
- **Canvas Base (`#F4F7FA`):** App shell canvas and workbench background.
- **Surface Elevation (`#FFFFFF`):** Workcards, inspection grids, side sheets, and modal viewports.
- **Border Hairline (`#E2E8F0`):** 1px structural dividing lines across panels and table divisions.

### Semantic Telemetry Palette
- **Nominal / Pass (`#16A36A`):** Tolerance confirmation, healthy throughput, verified units.
- **Tolerance Warning (`#E99A21`):** Marginal drift, recalibration required, low-confidence passes.
- **Defect / Critical (`#E5484D`):** Structural anomalies, critical stop conditions, high-severity defects.
- **Review / Escalate (`#8957D5`):** Manual verification required, AI discrepancy review queues.

## Typography

The type system separates natural human reading from precision instrumental tracking:

1. **Rubik:** Drives contextual interfaces, structural navigation, natural status descriptors, and headers. Its soft geometric curves mitigate cognitive fatigue during high-density workflows.
2. **Space Mono:** Applied strictly to data coordinates, bounding-box dimension tags, serial numbers, millisecond timestamps, confidence matrices (e.g., `99.84%`), and part IDs (`#SN-88204-B`). Monospaced alignment prevents tabular jitter when real-time telemetry updates.

All technical data tokens must enforce tabular alignment (`font-variant-numeric: tabular-nums`). Headers never use italics; technical labels use upper-case styles with wide letter spacing for instantaneous legibility.

## Layout & Spacing

The layout is built upon an uncompromising 8px baseline grid (with a 4px sub-grid for dense micro-measurements and tag padding).

### Layout Rules
- **Workspace Canvas:** Fluid multi-column workstation view with collateral side-drawers for visual inspection frames and defect lists.
- **Telemetry Shell Grid:** 12-column dynamic grid designed for 1080p, 1440p, and rugged field tablets. Fixed-width lateral tool rails (240px collapsable to 64px) with expanding central inspection viewports.
- **Density Scaling:**
  - *Standard Mode:* 16px internal padding on cards (`space-md`).
  - *High-Density Mode:* 8px internal padding on table rows and metric strips (`space-sm`).
- **Breakpoints:**
  - `Mobile / Handheld Scanner (<768px)`: Single column linear feed, bottom sheet inspection details, 16px margins.
  - `Field Tablet (768px - 1024px)`: 6-column grid, persistent bottom inspection bar.
  - `Control Station Desktop (>1024px)`: Full 12-column grid, multi-pane split layout for simultaneous high-res live video and defect logs.

## Elevation & Depth

Depth in this system is utilitarian: layers map to distinct functional operational planes rather than decorative depth.

### Elevation Architecture
- **Base Canvas (Level 0):** `#F4F7FA`. Un-elevated application plane containing framing gutters and baseline toolbars.
- **Operational Panels (Level 1):** `#FFFFFF` surfaces nested over the base, bound by a crisp 1px stroke of `#E2E8F0`. Shadows are faint and wide to avoid visual noise: `0 1px 3px rgba(23, 43, 77, 0.04), 0 1px 2px rgba(23, 43, 77, 0.02)`.
- **Flyout Drawers & Metric Overlays (Level 2):** Inspection review sidebars, configuration flyouts. Elevated via `0 4px 12px -2px rgba(23, 43, 77, 0.08), 0 2px 6px -1px rgba(23, 43, 77, 0.04)` over a 1px border.
- **Interactive Modals & Image Zooms (Level 3):** Deep zoom loupes, parameter calibration modals. Backdropped by `rgba(23, 43, 77, 0.4)` scrim with an elevation shadow of `0 12px 32px -4px rgba(23, 43, 77, 0.16)`.
- **Optical Inspection Overlays (Heads-Up Layer):** Real-time defect bounding boxes sit on top of video surfaces with 0 elevation, relying on 1.5px solid borders (`#E5484D`, `#E99A21`, or `#16A36A`) and semi-transparent alpha fills (`rgba(..., 0.12)`).

## Shapes

The interface balances sharp industrial hardware profiles with modern software ergonomics. Elements default to an intermediate corner radius:

- **Standard Components (Inputs, Buttons, Cards, Modals):** `8px` corner radius (`0.5rem`). This provides structural clarity while avoiding harsh visual corners.
- **Large Container Cards & Viewports:** `10px` to `12px` corner radius for distinct grouping of primary camera feeds.
- **Technical Chips & Status Indicators:** `4px` corner radius for compact micro-labels, preserving maximum interior real estate for monospaced values.
- **Circular Indicators:** Used exclusively for live acquisition status pulses, camera lens toggles, and user avatars.

## Components

### Buttons
- **Primary:** Solid `#2563EB` fill, `#FFFFFF` Rubik 14px weight 500 text, 8px border radius, 8px 16px padding. Hover: `#1D4ED8`. Active: `#1E40AF`.
- **Secondary:** Surface `#FFFFFF`, 1px solid border `#E2E8F0`, text `#172B4D`. Hover: `#F4F7FA` with border `#CBD5E1`.
- **Destructive / Abort:** Solid `#E5484D`, `#FFFFFF` text. Used exclusively for halt commands, defect confirmations, or run discards.

### Chips & Defect Badges
- **Structure:** 4px radius, 2px 8px padding. Monospaced Space Mono 11px font for codes, paired with 6px circular semantic status dots.
- **Pass Badge:** `#E8F8F0` background, `#16A36A` text, 1px border `rgba(22, 163, 106, 0.2)`.
- **Defect Badge:** `#FDECEE` background, `#E5484D` text, 1px border `rgba(229, 72, 77, 0.2)`.
- **Review Badge:** `#F3EDFC` background, `#8957D5` text, 1px border `rgba(137, 87, 213, 0.2)`.
- **Warning Badge:** `#FEF6E9` background, `#E99A21` text, 1px border `rgba(233, 154, 33, 0.2)`.

### Input Fields & Controls
- **Text & Numeric Inputs:** 8px radius, 1px `#E2E8F0` border, `#FFFFFF` surface, 8px 12px padding. Focus: 2px outline `#2563EB` with an offset of 0.
- **Measurement Inputs:** Display units (`mm`, `µm`, `dB`, `%`) fixed in Space Mono `#738096` in the right accessory slot.
- **Checkboxes & Radios:** 18px box/circle, `#E2E8F0` border on surface `#FFFFFF`. Checked state: `#2563EB` fill with white checkmark/dot.

### Cards & Telemetry Panels
- **Structure:** Surface `#FFFFFF`, 8px to 12px radius, 1px solid `#E2E8F0`. 
- **Card Header:** 12px 16px padding, separated from card body by a 1px border bottom `#E2E8F0`. Features Rubik medium 14px title alongside a Space Mono ID or timestamp on the right.

### Tables & Defect Stream
- **Header:** Background `#F4F7FA`, uppercase Rubik 11px tracking-wide text (`#738096`), 8px 12px padding.
- **Rows:** Minimum height 40px, alternating hover state `#F8FAFC`, active state `#E8F0FE`. 1px bottom border `#E2E8F0`. All numerical metrics aligned to the right.

### Optical Viewport (AOI Bounding Box)
- **Overlay Layer:** High-contrast 1.5px vector rectangles. Corner handles (4px squares) highlight manual boundary adjustments.
- **Annotation Anchor:** Top-left attached tag: 4px border radius, Space Mono 11px bold, `#FFFFFF` text over semantic background matching the defect classification.