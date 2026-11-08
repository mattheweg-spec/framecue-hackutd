# FrameCue illustration notes

Created November 8, 2026, for Matthew's request for a more personal, original interface with penguins. These are fictional interface illustrations, not photographs, CAD renders, or evidence of a working physical device.

## Original character

An expressive penguin with an ink-black body, warm ivory belly, oversized sneakers, a restrained acid-yellow strap, and a faded teal bag. Uneven ink contours and print-like texture give the drawings a handmade character. The character is not a franchise mascot. Its visual role is curiosity and exploration; it does not represent or stereotype a disabled person.

Generated using the built-in OpenAI image-generation tool, with transparent backgrounds. The second illustration used the first as a character reference. Original full-size outputs were preserved in Codex's generated-images folder; the project copies below are the delivered assets.

## Generation briefs

These describe the art direction used, rather than claiming to be verbatim transcripts of the tool prompts.

- `penguin-map.png` — Original full-body illustrated penguin, folded map in one flipper and other flipper raised, chunky sneakers, subtle sideways attitude, scruffy hand-inked and risograph-like texture, warm ivory / ink / muted teal / acid-yellow palette, transparent background, no text or logos. The page pairs it with a drawn orbit and small field-note sticker.
- `penguin-frame.png` — The same character, costume, proportions, palette, and drawing style, holding a cream cardboard frame and peering through it. Transparent background, full body, clean margins, no text or logos. This illustrates the idle camera state.

## Placement and accessibility

- Preserve natural proportions with `object-fit: contain`. Do not stretch the character.
- Map character: descriptive alternative text; smaller ornamentation is hidden from assistive technology.
- Camera character: decorative empty alternative text because the adjacent copy explains the action.
- No perpetual bobbing, blinking, or parallax. Honor reduced-motion preferences.
- Keep both illustrations out of live video, detection boxes, and actual cue indicators.
- `route-trail.svg` and the inline SVG control symbols were drawn directly for this interface. They do not depend on external icon packages.

The original map illustration is 1126 × 1397 px. The original framing illustration is 1181 × 1331 px.
