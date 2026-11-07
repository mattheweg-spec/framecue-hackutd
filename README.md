# FrameCue

FrameCue is a HackUTD prototype exploring how camera-based scene interpretation could be represented as a simulated tactile cue. It continuously sends successive camera frames to NVIDIA Nemotron, draws approximate labeled object boxes over the live preview, estimates relative depth and motion from the returned boxes, and highlights the highest-priority target in the simulated wearable.

**This is an experimental simulation, not a navigation aid.** Near/middle/far and motion labels are visual estimates, not measured distances or reliable collision predictions. The cue marks a likely obstacle location, not a safe route. Person boxes use the generic label `person`; no identity or face analysis is requested. Do not rely on this prototype for real-world mobility.

## Run it on Windows

1. Install Node.js 18 or newer if it is not already installed.
2. In this folder, make a private copy of `.env.example` named `.env.local`.
3. Get an NVIDIA API key from [build.nvidia.com](https://build.nvidia.com/) and put it after `NVIDIA_API_KEY=` in `.env.local`. Keep this file private; it is ignored by Git.
4. Open this folder in Cursor. Choose **Terminal → New Terminal** and run:

   ```powershell
   node server.js
   ```

5. Open [http://localhost:3000](http://localhost:3000) in Chrome or Edge, point the camera at a scene without confidential information, then press **Start live scan**. Frames that include people are sent to NVIDIA Nemotron for generic person-box detection. Allow camera access when the browser asks. This opens the preview and begins repeated analysis.
6. New boxes appear whenever Nemotron returns an interpretation; update speed depends on the model response. Press **Stop** to end capture and analysis.

If the camera does not start, close Windows Camera, Teams, Zoom, and other apps that may be using it, then retry. In Chrome, check the site camera permission for `localhost`.

While live scan is running, the page sends one reduced-size JPEG frame at a time to the local server and waits for Nemotron before capturing the next frame. The server forwards each image to NVIDIA Nemotron; the browser never receives the API key. The preview shows up to eight estimated boxes, ordered by a rough priority score that combines model depth category, box size/vertical position, and changes in the box between completed analyses. Box growth is treated as a possible approach; center movement is treated as possible lateral motion. These heuristics are noisy, especially in crowds and when the model changes its box placement.

## Phone camera

Browser camera access requires a secure context. `http://localhost:3000` is suitable for the computer running the server, but a phone visiting the computer's local network address over plain HTTP may block camera access. For phone testing, use an HTTPS deployment or an HTTPS tunnel to this server. Configure `NVIDIA_API_KEY` as a private server environment variable; never put it in a public web page.

## NVIDIA workflow

1. Capture and resize a camera frame in the browser.
2. Send the frame to the NVIDIA Nemotron vision endpoint from `server.js`.
3. Validate approximate normalized object boxes and map the primary object's position deterministically to a simulated zone.
4. Draw animated corner-bracket boxes over the camera preview, pulse the corresponding UI zone, and display the result in the workflow log.

The three manual preview buttons are only for checking the visual cue animation if the API is unavailable.

## Files

- `index.html` — responsive camera UI, event log, and simulated three-zone wearable.
- `server.js` — static web server, protected NVIDIA API call, response validation, and cue mapping.
- `.env.example` — key setup template; copy to the ignored `.env.local` file.
- `.gitignore` — excludes local secrets and the uploaded `drive-photos` directory.
