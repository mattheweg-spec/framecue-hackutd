# FrameCue

FrameCue is a HackUTD prototype exploring how camera-based scene interpretation could be represented as a simulated tactile cue. It uses NVIDIA Nemotron to interpret an occasional camera frame, maps the reported image position to a left, center, or right on-screen wearable zone, and records each step in a small workflow log.

**This is an experimental simulation, not a navigation aid.** It does not tell a person which way is safe to walk and must not be relied on for real-world mobility.

## Run it on Windows

1. Install Node.js 18 or newer if it is not already installed.
2. In this folder, make a private copy of `.env.example` named `.env.local`.
3. Get an NVIDIA API key from [build.nvidia.com](https://build.nvidia.com/) and put it after `NVIDIA_API_KEY=` in `.env.local`. Keep this file private; it is ignored by Git.
4. Open this folder in Cursor. Choose **Terminal → New Terminal** and run:

   ```powershell
   node server.js
   ```

5. Open [http://localhost:3000](http://localhost:3000) in Chrome or Edge and press **Start camera**. Allow camera access when the browser asks. This opens the preview only.
6. Point the camera at a test scene without people or confidential information, then press **Start scene analysis**. The app sends a reduced-size frame to NVIDIA about every three seconds. Press **Stop** to end capture and analysis.

If the camera does not start, close Windows Camera, Teams, Zoom, and other apps that may be using it, then retry. In Chrome, check the site camera permission for `localhost`.

After you start scene analysis, the page sends a reduced-size JPEG frame to the local server about every three seconds. The server forwards the image to NVIDIA Nemotron; the browser never receives the API key.

## Phone camera

Browser camera access requires a secure context. `http://localhost:3000` is suitable for the computer running the server, but a phone visiting the computer's local network address over plain HTTP may block camera access. For phone testing, use an HTTPS deployment or an HTTPS tunnel to this server. Configure `NVIDIA_API_KEY` as a private server environment variable; never put it in a public web page.

## NVIDIA workflow

1. Capture and resize a camera frame in the browser.
2. Send the frame to the NVIDIA Nemotron vision endpoint from `server.js`.
3. Validate the model's object position and map it deterministically to a simulated zone.
4. Animate the corresponding UI zone and display the result in the workflow log.

The three manual preview buttons are only for checking the visual cue animation if the API is unavailable.

## Files

- `index.html` — responsive camera UI, event log, and simulated three-zone wearable.
- `server.js` — static web server, protected NVIDIA API call, response validation, and cue mapping.
- `.env.example` — key setup template; copy to the ignored `.env.local` file.
- `.gitignore` — excludes local secrets and the uploaded `drive-photos` directory.
