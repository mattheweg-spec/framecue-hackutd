# FrameCue

FrameCue is a HackUTD prototype exploring how camera-based scene interpretation could be represented as a simulated tactile cue. It continuously sends successive camera frames to NVIDIA Nemotron, draws approximate labeled object boxes over the live preview, maps the nearest reported object's position to a left, center, or right on-screen wearable zone, and records each step in a workflow log.

**This is an experimental simulation, not a navigation aid.** Object labels and boxes are approximate AI estimates. It does not tell a person which way is safe to walk and must not be relied on for real-world mobility.

## Run it on Windows

1. Install Node.js 18 or newer if it is not already installed.
2. In this folder, make a private copy of `.env.example` named `.env.local`.
3. Get an NVIDIA API key from [build.nvidia.com](https://build.nvidia.com/) and put it after `NVIDIA_API_KEY=` in `.env.local`. Keep this file private; it is ignored by Git.
4. Open this folder in Cursor. Choose **Terminal → New Terminal** and run:

   ```powershell
   node server.js
   ```

5. Open [http://localhost:3000](http://localhost:3000) in Chrome or Edge, point the camera at a scene without people or confidential information, then press **Start live scan**. Allow camera access when the browser asks. This opens the preview and begins repeated analysis.
6. New boxes appear whenever Nemotron returns an interpretation; update speed depends on the model response. Press **Stop** to end capture and analysis.

If the camera does not start, close Windows Camera, Teams, Zoom, and other apps that may be using it, then retry. In Chrome, check the site camera permission for `localhost`.

While live scan is running, the page sends one reduced-size JPEG frame at a time to the local server and waits for Nemotron before capturing the next frame. The server forwards each image to NVIDIA Nemotron; the browser never receives the API key. The preview shows estimated boxes only after an analysis response arrives.

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
