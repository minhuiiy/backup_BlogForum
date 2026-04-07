# Design System Document: Kinetic Light Editorial

## 1. Overview & Creative North Star
**Creative North Star: The Technical Atelier**
This design system moves away from the "generic documentation" aesthetic toward a high-end, editorial experience tailored for developers. It treats code and technical discourse with the same reverence as a luxury fashion magazine. By blending the mathematical precision of **Space Grotesk** with a "Kinetic Luminescence"—a feeling of light trapped within glass—we create an environment that feels fast, breathable, and intellectually stimulating.

The layout intentionally avoids the rigid, boxed-in feeling of standard forums. We utilize "Breathable Asymmetry"—using generous, intentional white space to guide the eye, allowing content to bleed into the margins to suggest an infinite canvas of ideas.

---

## 2. Colors: The Luminescent Spectrum
The palette is rooted in a crisp, surgical foundation, punctuated by a high-energy electric blue that feels "charged."

### Surface Hierarchy & The "No-Line" Rule
To achieve a premium feel, **1px solid borders are strictly prohibited for sectioning.** Boundaries are defined through background shifts or tonal transitions.
- **Base Layer:** Use `surface` (#f5f7f9) for the primary application background.
- **Nesting:** Place `surface_container_lowest` (#ffffff) cards on top of `surface_container_low` (#eef1f3) sections to create natural, soft-edge separation.
- **The "Glass & Gradient" Rule:** Floating elements (Modals, Hovering Popovers) must use a semi-transparent `surface_container_lowest` with a `backdrop-filter: blur(12px)`.

### Signature Textures
- **Kinetic Glow:** For primary CTAs and Hero accents, use a linear gradient: `primary` (#0058bb) to `primary_container` (#6c9fff) at a 135-degree angle. This provides a "soul" to the digital interface that flat hex codes cannot replicate.

---

## 3. Typography: Editorial Logic
We pair a high-character geometric sans with a workhorse neo-grotesque to balance personality with long-form legibility.

- **Display & Headlines (Space Grotesk):** These are your "Statement" pieces. Use `display-lg` for hero blog titles to establish an authoritative, technical tone. The tight apertures of Space Grotesk feel like modern engineering.
- **Body & Titles (Inter):** All functional text and Q&A content uses Inter. Its tall x-height ensures that complex code snippets and dense explanations remain readable even at `body-sm` scales.
- **Labeling:** Use `label-md` in all-caps with +0.05em tracking for category tags (e.g., "TYPESCRIPT", "ARCHITECTURE") to differentiate metadata from content.

---

## 4. Elevation & Depth: Tonal Layering
Traditional shadows are often "dirty." In this system, depth is achieved through light and layering.

- **The Layering Principle:** Instead of shadows, stack your tokens. An article card (`surface_container_lowest`) sitting on a page body (`surface`) provides enough contrast for the eye without visual noise.
- **Ambient Shadows:** When a card requires a "lift" (e.g., on hover), use a shadow tinted with the `on_surface` color: `box-shadow: 0 12px 32px -8px rgba(44, 47, 49, 0.06)`.
- **The Ghost Border:** If a container sits on an identical color background, use a "Ghost Border": `outline_variant` (#abadaf) at **15% opacity**. It should be felt, not seen.
- **Kinetic Depth:** Use the `surface_tint` (#0058bb) at 2% opacity as an overlay on `surface_container_high` to give a subtle "blue-shift" to deeply nested technical sidebars.

---

## 5. Components: Functional Elegance

### Buttons
- **Primary:** Gradient fill (Primary to Primary Container), `full` roundedness, `title-sm` (Inter Semi-Bold).
- **Secondary:** `surface_container_high` background with `on_primary_container` text. No border.
- **Tertiary:** Ghost style. No background; `primary` text. Use for low-emphasis actions like "Cancel" or "View Source."

### Cards & Lists
- **The Divider Ban:** Strictly forbid `<hr>` or border-bottom dividers. Separate forum threads and blog previews using `1.5rem` to `2rem` of vertical white space or a subtle shift from `surface` to `surface_container_low`.
- **Code Blocks:** Use `surface_container_highest` (#d9dde0) with a 4px left-border of `primary`. Typography must be a high-quality monospaced font (e.g., JetBrains Mono), sized at `body-sm`.

### Input Fields
- **State Logic:** Default state is `surface_container_low` with a Ghost Border. On focus, the border opacity jumps to 100% using the `primary` token, and a subtle `primary` glow (4px blur) is applied.

### Additional Signature Components
- **Progressive Disclosure Chips:** For "Tags" in the Q&A section, use `secondary_container` with `on_secondary_container` text. Use `md` (0.375rem) roundedness to keep them looking "engineered" rather than "bubbly."
- **Author Glass Rail:** A floating sidebar for blog posts using the Glassmorphism rule to hold author data and social links, keeping the reading experience focused.

---

## 6. Do's and Don'ts

### Do
- **Do** use asymmetrical padding. Give the right side of a blog post more "air" than the left to mimic high-end print layouts.
- **Do** use `primary_fixed_dim` for links within body text to ensure they pop without being vibratingly bright.
- **Do** lean into the "Kinetic" feel by using 200ms `ease-out` transitions for all hover states.

### Don't
- **Don't** use black (#000000) for text. Use `on_surface` (#2c2f31) to maintain a soft, premium legibility.
- **Don't** use "Drop Shadows" on text. If you need contrast, adjust the surface tier behind the text.
- **Don't** use 90-degree sharp corners. The `DEFAULT` (0.25rem) or `md` (0.375rem) should be your baseline for a technical yet approachable feel.