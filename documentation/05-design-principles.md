# 5. Design System: Gonia v2.0

Gonia (meaning "Angle") is a **High-Precision Geometric** design system. In version 2.0, it evolved from a fixed aesthetic to a **Service-Centric Framework** powered by a **Dynamic Theme Engine**. It balances professional data density with modern visual experimentation.

## 5.1 Design Philosophy

1.  **Service-Centricity**: The UI is organized around business verticals (Ticket, Cargo, Hajj Umrah, General, Private) rather than technical functions. This reduces cognitive load for operators.
2.  **Theme Polymorphism**: The system supports radical aesthetic shifts via a Theme Engine. Components adapt their geometry (radius), depth (shadows vs lines), and palette based on the active skin.
3.  **Experimental Vibrancy**: While maintaining a professional "Financial Institution" core, version 2.0 introduces optional vibrancy to improve mood and focus in high-volume environments.
4.  **Density & Data**: Every container remains optimized to fit maximum data while maintaining clean spacing, with a new focus on single-column, natural flow forms.

---

## 5.2 Theme Engine Profiles

Gonia v2.0 uses a dynamic proxy to swap between entire theme definitions stored in `packages/ui/lib/themes`.

### Production: Gonia Classic (Deep Horizon)
The established production look. Sharp, boxy, high-contrast, and geometric.
*   **Geometry**: Zero border radius (`0px`) everywhere.
*   **Depth**: 2px solid primary borders and hard offset shadows.
*   **Palette**: Abyss Blue (#065084), Midnight Violet (#1E0741), Horizon Teal (#78B9B5).

### Experimental: Gonia Candy
A softer, modern alternative using glassmorphism and vibrant business-pastels.
*   **Geometry**: Softer `rounded-xl` (12px) corners for cards and buttons.
*   **Depth**: Subtle shadows and glowing boundaries instead of hard lines.
*   **Palette**: Electric Indigo, Soft Pink, and vibrant Emerald accents.
*   **Surfaces**: Semi-transparent white with `backdrop-blur` (Glassmorphism).

---

## 5.3 Typography

We prioritize readability for dense data while maintaining a bold display presence.

- **Global Workhorse**: **Geist Sans**. Optimized for high-density data and technical readability.
- **English Display**: **Geist Sans (Black weight)**. Used for `h1`, `h2` with tight tracking for an official registry look.
- **Bengali**: **Hind Siliguri**. Primary font for all localized content, integrated into the global fallback chain.
- **Data Display**: **Geist Mono**. Used for IDs, prices, and technical logs.

---

## 5.4 Theme Engineering

### CSS Variable Architecture
The system is built on a clean separation between **Definition** and **Application**:
1.  **Definitions** (`classic.css`, `profiles.css`): Contain raw Hex values.
2.  **Application** (`globals.css`): Maps raw values to semantic Tailwind tokens (e.g., `primary`, `background`).

### Gonia Palette Tuner
A developer-only tool (`palette-tuner.tsx`) used during the design phase to experiment with colors in real-time and export finalized CSS blocks.

---

## 5.5 Component Standards

#### Gonia Saturated Cards (`cardSaturated`)
Used for high-level KPIs. These cards utilize a signature **Linear Gradient** defined per profile (e.g., Violet to Blue in Horizon) and support color inversion on hover.

#### Technical Shadows
Instead of blurry ambient shadows, we use **Hard Offset Shadows** (e.g., `shadow-[3px_3px_0_0_var(--gonia-accent)]`). This maintains the sharp, geometric identity of the system.

## 5.6 Grounded Terminology

We avoid "overkill" jargon to keep the system professional and accessible.
*   **Maintenance** instead of 'Nexus'.
*   **System** instead of 'Core' or 'Oracle'.
*   **Registry** instead of 'Manifest'.