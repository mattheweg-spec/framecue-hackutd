# FrameCue

FrameCue is a HackUTD prototype exploring how camera-based scene interpretation could be represented as a simulated tactile cue. A compact TensorFlow.js COCO-SSD model detects common objects locally in the browser, while NVIDIA Nemotron provides a slower periodic reference scan. Local detections update boxes and the simulated zone without waiting for the cloud response.

**This is an experimental simulation, not a navigation aid.** Near/middle/far and motion labels are visual estimates, not measured distances or reliable collision predictions. The cue marks a likely obstacle location, not a safe route. Person boxes use the generic label `person`; no identity or face analysis is requested. Do not rely on this prototype for real-world mobility.

## Run it on Windows

1. Install Node.js 18 or newer if it is not already installed.
2. In this folder, make a private copy of `.env.example` named `.env.local`.
3. Get an NVIDIA API key from [build.nvidia.com](https://build.nvidia.com/) and put it after `NVIDIA_API_KEY=` in `.env.local`. Keep this file private; it is ignored by Git.
4. Open this folder in Cursor. Choose **Terminal → New Terminal** and run:

   ```powershell
   node server.js
   ```

5. Open [http://localhost:3000](http://localhost:3000) in Chrome or Edge and wait for the status to show **Local detector ready**. On first use, the page downloads the TensorFlow.js libraries and compact model weights in the background; the camera remains off during this download. Then point the camera at a scene without confidential information and press **Start live scan**. Allow camera access when the browser asks.
6. Local detections run sequentially at a target interval of 120 ms (up to about 8 scans/second); the actual rate depends on the computer and model inference time. Nemotron receives one reduced-size reference frame about every 12 seconds; if the local model cannot load, FrameCue falls back to slower cloud-only scans. Press **Stop** to end capture and analysis.

If the camera does not start, close Windows Camera, Teams, Zoom, and other apps that may be using it, then retry. In Chrome, check the site camera permission for `localhost`.

Camera frames are processed locally by COCO-SSD after its JavaScript libraries and model weights are downloaded from the CDNs. Only the periodic smaller reference frame is sent to the local Node server and forwarded to NVIDIA; the browser never receives the API key. If local inference is unavailable, the app uses the slower Nemotron-only mode. Local boxes are ordered by a rough priority score combining box size/vertical position and changes in the box over time. The browser smooths center and size changes, then projects each box up to 0.85 seconds ahead between local detections; predicted boxes are dashed, labeled, and fade because a direction change can invalidate a projection. These estimates are noisy, especially in crowds. COCO-SSD covers 80 common classes and can miss uncommon hazards; this remains a demo, not a navigation aid.

## Phone camera

Browser camera access requires a secure context. `http://localhost:3000` is suitable for the computer running the server, but a phone visiting the computer's local network address over plain HTTP may block camera access. For phone testing, use an HTTPS deployment or an HTTPS tunnel to this server. Configure `NVIDIA_API_KEY` as a private server environment variable; never put it in a public web page.

## NVIDIA workflow

1. Run COCO-SSD locally on the browser's video element for frequent detections.
2. Track the detections locally, estimate rough relative priority, and update the simulated zone.
3. Periodically send a reduced-size frame to Nemotron for a slower reference scan.
4. Keep the NVIDIA key on the local server; never expose it in the browser.

The three manual preview buttons are only for checking the visual cue animation if the API is unavailable.

## Files

- `index.html` — responsive camera UI, event log, and simulated FLUX wearable. Its left / center / right actuator markers are driven directly by the same cue state as the manual preview buttons and obstacle mapping.
- `server.js` — static web server, protected NVIDIA API call, response validation, and cue mapping.
- `.env.example` — key setup template; copy to the ignored `.env.local` file.
- `.gitignore` — excludes local secrets and the uploaded `drive-photos` directory.
- `CAD/framecue_flux_exoshoe.scad` — current adjustable FLUX concept: a close-fitting side chassis, slim top bands, heel cradle, controller pod, and three separated cue pods. Edit the length and width values at the top in OpenSCAD. This is still a visual concept and needs fit and structural review.
- `CAD/framecue_flux_exoshoe.stl` — mesh export of the current model for CAD viewing or importing.
- `CAD/framecue_flux_exoshoe_preview.png` — rendered concept preview.
- `CAD/framecue_shoe_exoskeleton.scad` and its STL / preview — earlier draft, retained for comparison; superseded by FLUX.
- `CAD/MATERIALS_AND_FIT.md` — preliminary material comparison, adjustable-fit requirements, and sources.

The Tinkercad workspace is named **FrameCue FLUX Exoshoe Concept** and now contains the full over-shoe STL assembly. Tinkercad treats that imported mesh as one shape, so it can be resized, repositioned, recolored, or replaced, but its individual components are not separate there. Use the parameterized OpenSCAD source above to edit the geometry and fit values by component.
