# FrameCue — Field Notes

An original graphic direction combining industrial science-fiction interfaces, ZeroDay's hacking context, and loose animation-inspired editorial energy. The Field Notes revision adds two original penguin illustrations, paper-map details, and handwritten annotations. No franchise characters, logos, or reproduced artwork.

## Visual rules

- Soft sage `#e4e7d7` forms the page, warm cream `#faf7ed` forms the cards, and dark ink `#263d35` carries the text. The camera's idle scene uses pale mint, the model sits on cream graph paper, and the GPS retains its folded-paper treatment. Broad, quiet background shapes tie the panels together.
- Yellow-green marks the camera action. Deep teal `#267468` identifies route controls; the 3D route motors retain their luminous cyan. Vermilion `#ff6354` identifies obstacle cues. Text and location distinguish these channels in addition to color.
- Condensed display typography carries the headline and wordmark. Segoe UI carries instructions and sentence-case panel titles; Consolas carries instrument labels. Segoe Print carries only short decorative notes. Use installed fonts, with no runtime font download.
- Original ink illustration, a folded-paper route panel, drawn route strokes, registration marks, and narrow rules provide character. Avoid perpetual glitching, moving scanlines, decorative live telemetry, and glow on every element.
- The map penguin introduces the page. The framing penguin appears only in the camera-off placeholder; it disappears completely during live scanning. Keep decoration away from live video and tracking brackets.
- Red three-bar glyphs depict obstacle position. Teal bent arrows depict navigation direction. Plain labels preserve this distinction without relying on color. A red obstacle cue is not an instruction to turn toward it.
- The wearable is the first panel in the right column. Camera and routing occupy the left. Mechanism controls, processing steps, explanations, and logs expand on request. Keep current results and errors visible.
- Keep copy economical: one headline and one supporting sentence, one idle-camera prompt, and short channel labels. Avoid repeated slogans, duplicate location legends, technical stamps, and extra paragraphs alongside the illustrations.
- Tracking brackets maintain their dimensions across priority changes. Hazard state changes color and label emphasis, never padding or control-button styling.
- Responsive layout collapses below 800 px. Controls wrap; labels never rely on ellipsis. Reduced-motion preferences disable transitions.

## Assets and implementation

`framecue.css` owns the base layout and instrument states. `field-notes.css` owns the illustrated theme, all of its breakpoints, and its reduced-motion rule. `assets/route-trail.svg` and the inline control icons are original vectors. `assets/signal-study.svg` is retained from the earlier Signal Studies design but is not displayed in the new hero. See `assets/ARTWORK.md` for illustration provenance and generation briefs.

Existing interaction IDs and event handlers remain the interface contract. CAD mesh geometry and its articulation are unchanged; the viewer uses a warmer neutral light rig. Dynamic labels have no nested decorative elements that would be erased by `textContent` updates. Tracking elements remain isolated from button styles. The camera frame follows the video aspect ratio without a max-height crop.

The illustrations load as local transparent PNGs; no runtime image-generation or font service is required. The local server explicitly serves PNG with `image/png` while keeping its `nosniff` header.

Do not describe the simulation as tested physical haptics or a validated navigation aid. Do not use the older gallery OBJ views to imply that the later ankle cuff is shown.
