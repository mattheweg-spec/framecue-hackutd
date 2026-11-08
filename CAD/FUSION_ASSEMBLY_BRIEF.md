# FrameCue FLUX: Fusion assembly brief

## Purpose

Create an editable, technical-looking concept assembly for a shoe-mounted obstacle cue and a separate ankle-mounted route guidance band. The model should make the two tactile channels easy to tell apart by location and form. This is a visualization and fit discussion model, not a validated wearable, actuator, or mobility aid.

## Current Fusion build

- Saved in the Autodesk Fusion **Default Project** as `FrameCue FLUX Pneumatic Exoskeleton Concept`.
- Built as an assembly with separate components for the translucent shoe reference, left/right side rails, heel link, two webbing bands, four rail-mounted band adjusters, controller enclosure and bracket, three cue cartridges, and three pneumatic route placeholders.
- The cue cartridges are color coded blue / amber / red. Their dark compliant volumes, cradle lips, and inlet bosses are visual placeholders for a future soft-actuator study.
- `CAD/fusion_navigation_cuff.py` adds a separate two-rail ankle cuff and left / forward / right rounded haptic motor pods. Run it from Fusion's Scripts and Add-Ins panel with the FrameCue FLUX assembly open. The browser viewer builds a matching interactive cuff over the existing Fusion mesh.
- The Fusion design includes editable extrusion features and user parameters for `railWall`, `strapThickness`, and `bladderLift`.
- The local sketch/STL concept files remain preliminary; the Fusion assembly is the current editable CAD artifact.

## Design intent

- Exoskeleton-style open frame over a closed shoe; avoid a bulky full shell.
- Keep the outsole, toe underside, and walking surface completely clear.
- Use two narrow adjustable bands and replaceable soft contact pads.
- Make left, center, and right cue modules distinct and replaceable.
- Keep obstacle avoidance on the instep claws and route guidance on the separate ankle cuff. They are independent outputs: camera detections must not move the ankle motors, and route turns must not curl the instep claws.
- Route conceptual tubing/wiring visibly and cleanly along the frame.
- Keep the shoe as a separate, translucent reference component, not part of the device.
- Use rounded edges and intentional ribs, fasteners, mounting bosses, and part boundaries so the model reads as an assembly.

## Proposed Fusion component tree

1. `Shoe_Reference` — translucent envelope only; suppress or hide for exports.
2. `Left_Side_Rail` and `Right_Side_Rail` — separate curved rails outside the shoe upper.
3. `Heel_Link` — rear cross-link above the heel/outsole boundary; avoid a rigid part beneath the foot.
4. `Band_Adjuster_<station>_<side>` — four rail-mounted clamp blocks with raised tabs that meet the bands. The current positions are illustrative; a true sliding slot and locking joint still need to be modeled.
5. `Band_Front` and `Band_Rear` — separate flexible-strap representations with buckles.
6. `Contact_Pad_*` — replaceable soft pads at shoe-contact locations.
7. `Cue_Module_Left`, `Cue_Module_Center`, `Cue_Module_Right` — three separate cartridges and seats.
8. `Controller_Pod` — enclosure concept with lid seam, a rail bracket, and three color-coded manifold union bosses.
9. `Tube_or_Cable_Route` — visible paths from controller area to each cue cartridge.

## Actuator direction for the concept

Model each cue cartridge as a **pneumatic soft-actuator concept**: a compliant bladder/cushion captured in a rigid carrier, with a small inlet barb/port and a protective cover. Show a feed route from each cartridge toward a controller/pump/valve volume in the pod. Keep these as separate components so the pressure element and support structure are legible.

Do not imply that a miniature pump, valve, or bladder has been selected or validated. A complete pneumatic wearable needs pressure/flow components, power, control, tubing, and safe limits; the current app only simulates the cue states. For the demo, describe actuation as simulated. A vibration motor is a simpler physical fallback if a tangible cue is needed, but it communicates vibration rather than pressure.

## Modeling sequence

1. Create user parameters for shoe length, shoe width, rail clearance, band spacing, and module spacing. Treat the ranges as fit placeholders until checked against several shoes.
2. Build a translucent shoe reference envelope and use it to shape the frame clearances.
3. Model one side rail, then mirror it across the center plane; add rounded ends and a real slot/slider interface for band adjustment.
4. Add the heel link, strap anchors, bands, and replaceable contact pads as separate components.
5. Design one cue cartridge with a soft bladder volume, rigid cradle, cap, and inlet port; pattern or place three cartridges across the instep.
6. Add the controller enclosure and visually route three independent lines to the cue modules.
7. Add the separate ankle cuff and three rounded motor pods for left / forward / right route cues; keep the haptic motor assemblies separate from the instep obstacle actuators.
8. Create a clean assembled view, an exploded view, and a section view through one cue module to show its support and contact parts.

## Visual review checklist

- Parts have clear functions and visible joins; avoid floating decorative shapes.
- The red instep claw modules communicate obstacle location; the ankle band communicates route direction in a visibly separate location.
- The three ankle navigation motors are easy to distinguish and service.
- Adjustment is visible: anchors slide along rails and straps have buckles.
- Tube/cable paths connect to ports and do not cross the sole or snag the toe.
- The reference shoe remains separate and can be hidden.
- An exploded view and actuator section explain how the concept fits together.
- Labels say `concept` or `simulated`; no claims of safe navigation or proven pressure perception.

## Open decisions for later

- Which shoe size range to represent with the first parameter set.
- Whether the final demo remains simulation-only or includes a low-risk vibration cue.
- If pneumatic hardware is pursued later, the exact pump, valves, bladder material, power source, pressure limits, and independent safety review must be researched and tested before any wearer trial.
