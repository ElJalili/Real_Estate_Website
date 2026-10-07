# Leon — a new perspective on home

A standalone React real-estate digitalization concept developed by Nova SLT, closely following the supplied LeonHome Pinterest reference. Vite, React, Lucide icons, CSS animations, and locally optimized WebP photography.

## Run

```sh
npm install
npm run dev
```

## Production

```sh
npm run build
npm run preview
```

The homepage includes the layered architectural hero, introduction, expertise section, property carousel, digital gallery, editorial content, final CTA, and footer. Property cards open details; the exploration gallery switches between spaces; the visit form creates a browser-local demonstration brief. A production listings source, live 360° tours, and lead-delivery service can be connected later.

Properties, prices, advisor imagery, and locations are illustrative, explicitly labelled in the interface. Forms do not transmit or persist personal data. No analytics or cookies are used. Images and fonts are local, with serif and sans-serif system fallbacks.

The hero uses composited photographic layers, CSS perspective, cursor parallax, and scroll movement rather than WebGL. Motion is disabled for reduced-motion preferences; cursor parallax is disabled for coarse pointers. Dialogs provide Escape dismissal, focus trapping, and focus restoration.

The reference image ends within the property section; the gallery, journal, CTA, and footer extend its editorial visual language. The hero, cliffside villa, and woodland residence are generated with OpenAI imagegen; supporting interior, villa, and illustrative portrait photography is from Unsplash. `scripts/prepare-assets.mjs` documents the photo identifiers and local optimization workflow. Typography uses locally bundled Italiana and DM Sans from Google Fonts.

## Immersive refinement

The existing page now fills the viewport without an outer frame. `src/refinements.css` holds the visual refinements; `src/motion.js` manages eased cursor depth and visible image parallax using one shared requestAnimationFrame scheduler. It sleeps at rest except for the subtle desktop card float while the hero is visible, and stops motion when the page is hidden or reduced motion is enabled. Hero photography and its SVG cutout share cover geometry to keep the architecture aligned. Cards have restrained pointer tilt; touch devices and reduced-motion preferences simplify or disable motion. No dependencies were added.

Browser verification: run `node scripts/verify-browser.mjs` with the development server on port 5175, or set `LEON_URL` to its address. It checks responsive overflow, existing interactions, layered transforms, card tilt, reduced motion, touch behavior, image loading, and runtime errors. Screenshots are saved in `artifacts/`.

## Spatial depth

`src/depth.css` adds motion only, retaining the existing layout, type, colors, content and photography. The sky is isolated with `public/assets/hero-sky-mask.svg`; the existing architecture cutout continues to intersect the title. Layers have distinct cursor/scroll rates, perspective depths, and interpolated movement. Perspective size and position compensation keep the neutral composition intact. Depth flattens smoothly toward the end of the hero. Tablet motion is reduced; touch keeps restrained scroll parallax and tap feedback. Selected property cards tilt with independently moving images, and editorial/portrait images receive slow scroll drift. No Three.js or other dependencies are required.

Run `node scripts/verify-depth.mjs` for motion, frame delivery, overflow, console, and touch checks. For a before/after design comparison, `node scripts/capture-depth-baseline.mjs` captures the current neutral design before a future motion change; the depth check then compares all static design properties and screenshots against that baseline.

The hero title remains on a fixed rear plane behind the architectural cutout at every scroll position. There is no foreground text duplicate, scroll depth transition, mask release, or title scale animation. Existing cursor parallax preserves the front/back ordering. Desktop typography size and position remain intact; the mobile cutout matches the existing portrait image crop, with the title placed just above the roof for partial visibility. Reduced motion keeps the same static hierarchy. Run `node scripts/verify-title-depth.mjs` to verify constant depth and architectural masking.
