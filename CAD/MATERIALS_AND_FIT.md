# FrameCue shoe-mounted wearable: material and fit notes

## Design brief

Build a conspicuous, open-frame wearable that straps **over a closed shoe**. The wearer should not need a foot scan or a custom shoe. The frame must leave the sole, toe box, and normal shoe fit unobstructed. A high-contrast outer badge should make the device look intentional and assistive, while the prototype remains clearly marked as experimental.

The first model is a visual/fit prototype. It does not generate real pressure, provide a safe route, or establish that a user can perceive cues through their particular shoe. Test the fit while seated first; do not use it for navigation.

## Candidate materials

| Material | Best place in the design | Comfort / inconvenience | Durability / upkeep | Prototype practicality |
|---|---|---|---|---|
| **Polyester webbing** | Adjustable straps over the shoe | Broad, soft straps can spread load; smooth edges and removable straps reduce rubbing. Straps can loosen without a scan. | Low moisture uptake helps it dry and retain a consistent feel. Inspect hook-and-loop and stitched ends for wear. Exact behavior depends on weave and finish. | Easy to buy and cut; stitch or use low-profile buckles. Preferred strap material for the first mock-up. |
| **EVA foam** | Replaceable padding between frame and shoe upper | Soft and easy to trim; useful to protect the shoe from hard edges. | Compresses and can retain sweat/dirt, so make pads removable and washable/replaceable. | Cheap sheet foam; cut with scissors and attach with hook-and-loop. |
| **PETG** | Rigid side rails, sliding strap anchors, and actuator display pods | Rigid, so it should sit outside the shoe and never press directly into skin. Round every edge. | Practical toughness and layer adhesion for a light, open frame; still needs inspection for cracks around holes and layer lines. | Best first printed frame material when a typical desktop FDM printer is available. Easier than flexible TPU. |
| **TPU (about 95A)** | Flexible bumpers, cable guides, or soft cue-pad covers | More compliant than PETG; can soften edges and reduce hard contact. | Flexible parts can flex repeatedly; design them as replaceable pieces. | Printing is slower and printer-dependent. Polymaker recommends a direct-drive extruder for its softer TPU90; verify the exact filament and printer before relying on it. |
| **PA12 nylon** | Later, durable production-style frame | A rigid frame still needs padding and straps; PA12 itself does not solve fit comfort. | Strong and ductile, with low water absorption in Formlabs' SLS data sheet. Properties vary with print orientation and process. | Best candidate if a service or lab offers SLS printing; not the default for a beginner FDM mock-up. |

## Recommendation

Use a **hybrid construction**, not one all-purpose material:

1. **First demonstration:** PETG open-frame side rails and rounded slider blocks, 20–25 mm polyester webbing, and removable thin EVA foam pads. Keep all hard plastic off bare skin and away from the shoe sole.
2. **Optional comfort parts:** TPU bumpers or cue-pad covers, only if the available printer can make reliable TPU parts.
3. **Later durable version:** consider SLS PA12 for the frame after fit testing; retain textile straps and replaceable padding.

### Quick design screen

This is a **preliminary design judgment**, not a measured materials test. Scores are 1 (poor) to 5 (strong); weights favor comfortable, low-hassle wear, then durability.

| Construction | Wear comfort (35%) | Durability (30%) | Adjustability / upkeep (20%) | Easy to prototype (15%) | Weighted screen |
|---|---:|---:|---:|---:|---:|
| **SLS PA12 rails + polyester webbing + removable EVA pads** | 4 | 5 | 5 | 2 | **4.2 / 5** |
| **FDM PETG rails + polyester webbing + removable EVA pads** | 4 | 3 | 5 | 5 | **4.1 / 5** |
| TPU-only body and straps | 3 | 3 | 3 | 2 | 2.9 / 5 |
| Rigid PETG shell and rigid shoe contact | 2 | 3 | 2 | 5 | 2.8 / 5 |

The strongest eventual design is the **PA12/textile/replaceable-padding hybrid**. The best practical first prototype is the **PETG/textile/replaceable-padding hybrid**; its screen is close, and it is easier to make. Both avoid a custom foot scan because fit comes from moving the strap anchors and adjusting the webbing. Re-score after trying the prototype on several shoes and asking wearers about pressure, heat, rubbing, and how quickly they can put it on.

One open-access study comparing custom EVA and TPU foot orthoses found comfort benefits for EVA in some submaximal running conditions. Those results are about orthoses inside shoes, not this outside-the-shoe frame, so they support EVA as a cushioning candidate rather than proving this device will be comfortable. Comfort must be tested with people and different shoes.

## Fit rules carried into CAD

- Fit **over the shoe**, with two adjustable straps and strap anchors that can move along the side rails. This avoids making the user scan their foot or replacing their shoe.
- Fit over closed shoes of different lengths and widths by repositioning the straps and changing strap length. The demonstration model exposes shoe length, width, and upper height as editable parameters; the model is not claiming a validated universal size range.
- Keep the outsole and bottom of the shoe completely clear. Do not put a part underfoot or across the toe.
- Use a replaceable pad at each shoe-contact point, rounded edges, and broad straps. Avoid tight straps and concentrated contact points.
- Put the recognizable high-visibility/reflective badge on the outside of the shoe, where another person can see it. A label such as **ASSISTIVE NAVIGATION** can clarify its purpose; visibility alone cannot guarantee that strangers will identify it correctly.
- Treat the three colored raised zones as **visual mock-ups** of left / center / right cues. This CAD model does not actuate them or show that pressure will be felt through every shoe.

## Sources

- [EVA and TPU custom foot orthoses: comfort and running outcomes (open-access study)](https://pmc.ncbi.nlm.nih.gov/articles/PMC7739627/). The study concerns custom insoles and running, so applicability to a shoe-mounted wearable is limited.
- [Polymaker PolyFlex TPU90 product information](https://shop.polymaker.com/products/polyflex-tpu90). Manufacturer lists 90A hardness and recommends a direct-drive extruder for this soft filament.
- [Polymaker PETG material information](https://polymaker.com/material/petg/). Manufacturer information on PETG durability and printability; actual results depend on the grade and print settings.
- [Formlabs Nylon 12 Powder technical data sheet](https://formlabs.com/materials/tds/nylon-12-powder/). Manufacturer SLS data include tensile strength, ductility, and printed-part water absorption; the values are process- and geometry-dependent.
- [Nylon vs. polyester webbing comparison](https://www.nationalwebbing.com/nylon-webbing-articles/nylon-webbing/nylon-polyester-webbing-strap-271.html). A webbing supplier summarizes moisture-regain values and notes that abrasion behavior depends on weave and wear pattern; choose an actual strap sample and test it.
