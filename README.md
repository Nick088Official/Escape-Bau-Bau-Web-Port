# Escape! BAU BAU!- Web Port

This is an **Unofficial Web Port** of the Free Godot game [**Escape! BAU BAU! by Ninhydro**](https://ninhydro.itch.io/escape-bau-bau-hololive-fangame). This port allows the game to be played directly in a web browser without needing any downloads/installations.


## How to play

There are 2 methods:

### Vercel
Go to https://escape-bau-bau-web-port.vercel.app/godot/Escape%21%20BAU%20BAU%21.html

### Local Server
1. Click Code -> Download ZIP -> Extract the Zip.
2. [Get Python](https://www.python.org/downloads/) installed and added to your system's PATH.
3. Open a CMD/Terminal **inside the root project folder** (I manually renamed the folder for a shorter url for github pages and to not confuse with the non-game files).
4. Run the following command to start a simple web server:
    ```bash
    python server.py
    ```
5. Open your web browser and go to the following address:
    **http://localhost:8000/godot/Escape%21%20BAU%20BAU%21.html**


## How did you make it?

This guide provides step-by-step instructions for building a web version of the game.

### Prerequisites

1. **Get the Game Files:** [Download the original game from the creator's itch.io page](https://ninhydro.itch.io/escape-bau-bau-hololive-fangame) and extract the files.
2. **Godot RE Tools:** [Download the Latest GDRETools/gdsdecomp](https://github.com/GDRETools/gdsdecomp/releases/latest) to Decompile the game.
3. **Godot**: Having [Godot](https://godotengine.org/download) installed, for this game, version [4.2.1-stable](https://github.com/godotengine/godot-builds/releases/tag/4.2.1-stable) specifically.
4. **Python (for running):** Having [Python](https://www.python.org/downloads/) installed and added to your system's PATH, to run the local web server.
5. **Git LFS (Optional, for uploading on GitHub):** [Git Large File Storage](https://git-lfs.github.com/) installed on your system. This is crucial for handling large game files in Git.


### Part A: Decompiling

We need to Decompile the game to get the Source Code from the `.exe`, to use to Build the Web Version.

1. Open Godot RE Tools -> RE Tools -> Recover project -> Select the Game Executable -> Extract it somewhere.

### Part B: Godot Build Web Version

1. Import the Decompiled Game in Godot [4.2.1-stable](https://github.com/godotengine/godot-builds/releases/tag/4.2.1-stable).
2. Editor > Manage Export Templates -> Download & Install.
3. Project -> Export -> Add -> Web.
4. In Options, in VRAM Texture Compression, Check For Mobile, and you will get a "Target platform requires 'ETC2/ASTC' texture compression. Enable 'Import ETC2 ASTC' to fix.", where you will just need to click "Fix Import" at the right of it.
5. Export Project to a dedicated, empty subfolder of your root project, name it like `godot` used in this repository for convenience. This subfolder will contain `.html`, `.js`, `.pck`, `.wasm`, etc.

   You may also consider:
   - Export with Debug: useful for checking errors in the browser console, though it produces a slightly larger and slower build.  
   - Save the file name as `index.html`: required for hosting on certain platforms (like itch.io).

### Part C: Adding Touch Controls Externally (Optional)

You can add Touch Controls via External Scripts.

1. Make a new `TouchControls` folder in your root project folder.
2. Inside that folder, make a new `TouchControls.js` file containing:
    ```js
    /**
    * @file TouchControls.js
    * @description
    * A universal, engine-agnostic virtual gamepad for web games, modified for Escape! BAU BAU!.
    *
    * Features:
    * - Dynamically calculates layout to fit any screen size and aspect ratio, preventing overlaps.
    * - Intelligently scales controls to be larger and more usable in landscape mode.
    * - Swappable D-Pad and Joystick for movement.
    * - User's control preference is saved locally.
    * - Ergonomic button placement for vertical and horizontal play.
    * - Easy top-level configuration for scale and padding.
    * - Clean, commented, and production-ready code.
    */

    (function() {
        'use strict';

        //================================================================================
        // 1. INITIAL CHECK & CONFIGURATION
        //================================================================================

        const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
        if (!isTouchDevice) {
            return; // Do not run the script on non-touch devices.
        }

        /**
        * Top-level configuration to easily fine-tune the control layout.
        */
        const CONFIG = {
            // Master scale for all controls. 1.0 is default. 0.8 = 80% size.
            scale: 1.0,
            // Padding from the screen edges as a percentage of the screen's shortest side.
            paddingPercent: 4,
            // Gap between action buttons as a percentage of the screen's shortest side.
            gapPercent: 3
        };

        /**
        * Maps element IDs to the keyboard events the game engine will receive.
        * Includes the modern 'code' property for better compatibility with engines like Godot.
        */
        const KEY_MAPPINGS = {
            'touch-z': { key: 'z', keyCode: 90, code: 'KeyZ' },
            'touch-x': { key: 'x', keyCode: 88, code: 'KeyX' },
            'touch-c': { key: 'c', keyCode: 67, code: 'KeyC' },
            'touch-v': { key: 'v', keyCode: 86, code: 'KeyV' },
            'touch-m': { key: 'm', keyCode: 77, code: 'KeyM' },
            'touch-q': { key: 'q', keyCode: 81, code: 'KeyQ' },
            'touch-esc': { key: 'Escape', keyCode: 27, code: 'Escape' },
            'touch-up': { key: 'ArrowUp', keyCode: 38, code: 'ArrowUp' },
            'touch-down': { key: 'ArrowDown', keyCode: 40, code: 'ArrowDown' },
            'touch-left': { key: 'ArrowLeft', keyCode: 37, code: 'ArrowLeft' },
            'touch-right': { key: 'ArrowRight', keyCode: 39, code: 'ArrowRight' }
        };

        //================================================================================
        // 2. STATE MANAGEMENT
        //================================================================================

        let isJoystickMode = localStorage.getItem('controlMode') === 'joystick';
        let currentJoystickDirection = null;

        //================================================================================
        // 3. DOM & STYLES SETUP
        //================================================================================

        /**
        * Creates and injects the control elements into the document body.
        */
        function buildControls() {
            const container = document.createElement('div');
            container.id = 'virtual-controls-container';
            container.innerHTML = `
                <!-- Action Button Cluster (Bottom Right) -->
                <div id="action-cluster" class="virtual-cluster">
                    <div id="touch-q" class="virtual-button action-button">Q</div>
                    <div id="touch-z" class="virtual-button action-button">Z</div>
                    <div id="touch-x" class="virtual-button action-button">X</div>
                    <div id="touch-m" class="virtual-button action-button">M</div>
                    <div id="touch-c" class="virtual-button action-button">C</div>
                    <div id="touch-v" class="virtual-button action-button">V</div>
                </div>

                <!-- System Button (Top Right) -->
                <div id="touch-esc" class="virtual-button system-button">ESC</div>

                <!-- Movement Controls (Bottom Left) -->
                <div id="dpad-container" class="virtual-cluster control-mode">
                    <div id="touch-up" class="virtual-button dpad-button"></div>
                    <div id="touch-down" class="virtual-button dpad-button"></div>
                    <div id="touch-left" class="virtual-button dpad-button"></div>
                    <div id="touch-right" class="virtual-button dpad-button"></div>
                </div>
                <div id="joystick-container" class="virtual-cluster control-mode">
                    <div id="joystick-base" class="virtual-button">
                        <div id="joystick-thumb"></div>
                    </div>
                </div>

                <!-- Toggle Button (Above Movement) -->
                <div id="control-toggle-button" class="virtual-button"></div>
            `;
            document.body.appendChild(container);
        }

        /**
        * Injects the base CSS for the controls.
        */
        function addBaseStyles() {
            const styles = `
                #virtual-controls-container {
                    z-index: 100;
                    position: fixed;
                    top: 0; left: 0;
                    width: 100%; height: 100%;
                    pointer-events: none;
                }
                .virtual-button, .virtual-cluster {
                    position: absolute;
                    box-sizing: border-box;
                    -webkit-tap-highlight-color: transparent;
                }
                .virtual-button {
                    background-color: rgba(100, 100, 110, 0.45);
                    border: 1px solid rgba(255, 255, 255, 0.5);
                    user-select: none;
                    pointer-events: auto;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-family: sans-serif;
                    font-weight: bold;
                    border-radius: 50%;
                }
                .virtual-button:active, .active {
                    background-color: rgba(255, 220, 0, 0.7);
                }
                .hidden { display: none !important; }

                /* -- D-Pad Grid Layout -- */
                #dpad-container {
                    display: grid;
                    grid-template-columns: 1fr 1fr 1fr;
                    grid-template-rows: 1fr 1fr 1fr;
                    pointer-events: none;
                }
                .dpad-button { border-radius: 25%; position: static; }
                #touch-up { grid-column: 2; grid-row: 1; }
                #touch-down { grid-column: 2; grid-row: 3; }
                #touch-left { grid-column: 1; grid-row: 2; }
                #touch-right { grid-column: 3; grid-row: 2; }

                /* -- Joystick -- */
                #joystick-container { display: flex; justify-content: center; align-items: center; pointer-events: none; }
                #joystick-base { position: static; }
                #joystick-thumb { position: absolute; background: rgba(200, 200, 200, 0.7); border-radius: 50%; }
            `;
            const styleSheet = document.createElement("style");
            styleSheet.innerText = styles;
            document.head.appendChild(styleSheet);
        }


        //================================================================================
        // 4. DYNAMIC LAYOUT ENGINE
        //================================================================================

        /**
        * Calculates and applies the size and position of all control elements.
        */
        function calculateAndApplyLayout() {
            const screenW = window.innerWidth;
            const screenH = window.innerHeight;
            const isLandscape = screenW > screenH;
            const shortSide = Math.min(screenW, screenH);

            const sizeMultiplier = isLandscape ? 1.4 : 1.0;
            const scale = CONFIG.scale * sizeMultiplier;

            const padding = (shortSide * CONFIG.paddingPercent / 100);
            const gap = (shortSide * CONFIG.gapPercent / 100);
            
            const actionButtonSize = (shortSide * 0.11) * scale;
            const movementClusterSize = (shortSide * 0.38) * scale;

            const applyStyle = (id, styles) => {
                const el = document.getElementById(id);
                if (el) Object.assign(el.style, styles);
            };

            // --- Position Action Button Cluster (2x3 Grid) ---
            const clusterWidth = (actionButtonSize * 3) + (gap * 2);
            const clusterHeight = (actionButtonSize * 2) + gap;
            applyStyle('action-cluster', {
                bottom: `${padding}px`,
                right: `${padding}px`,
                width: `${clusterWidth}px`,
                height: `${clusterHeight}px`
            });

            const actionBtnStyle = {
                width: `${actionButtonSize}px`,
                height: `${actionButtonSize}px`,
                position: 'absolute',
                fontSize: `${actionButtonSize * 0.45}px`
            };
            
            // Top Row
            applyStyle('touch-q', { ...actionBtnStyle, top: '0px', left: '0px' });
            applyStyle('touch-z', { ...actionBtnStyle, top: '0px', left: `${actionButtonSize + gap}px` });
            applyStyle('touch-x', { ...actionBtnStyle, top: '0px', right: '0px' });

            // Bottom Row
            applyStyle('touch-m', { ...actionBtnStyle, bottom: '0px', left: '0px' });
            applyStyle('touch-c', { ...actionBtnStyle, bottom: '0px', left: `${actionButtonSize + gap}px` });
            applyStyle('touch-v', { ...actionBtnStyle, bottom: '0px', right: '0px' });

            // --- Position ESC Button ---
            const escButtonSize = (shortSide * 0.10) * scale;
            applyStyle('touch-esc', {
                width: `${escButtonSize}px`,
                height: `${escButtonSize}px`,
                top: `${padding}px`,
                right: `${padding}px`,
                fontSize: `${escButtonSize * 0.4}px`
            });

            // --- Position Movement Clusters ---
            applyStyle('dpad-container', { width: `${movementClusterSize}px`, height: `${movementClusterSize}px`, bottom: `${padding}px`, left: `${padding}px` });
            applyStyle('joystick-container', { width: `${movementClusterSize}px`, height: `${movementClusterSize}px`, bottom: `${padding}px`, left: `${padding}px` });

            // --- Size Internal Elements ---
            const dpadButtonSize = movementClusterSize / 3.2;
            document.querySelectorAll('.dpad-button').forEach(el => Object.assign(el.style, { width: `${dpadButtonSize}px`, height: `${dpadButtonSize}px` }));
            const joystickBaseSize = movementClusterSize * 0.8;
            applyStyle('joystick-base', { width: `${joystickBaseSize}px`, height: `${joystickBaseSize}px` });
            applyStyle('joystick-thumb', { width: `${joystickBaseSize / 2}px`, height: `${joystickBaseSize / 2}px` });
            
            // --- Position Toggle Button ---
            const toggleButtonW = (shortSide * 0.22) * scale;
            const toggleButtonH = (shortSide * 0.07) * scale;
            const toggleBottom = padding + movementClusterSize + gap;
            const toggleLeft = padding + (movementClusterSize / 2) - (toggleButtonW / 2);
            applyStyle('control-toggle-button', { width: `${toggleButtonW}px`, height: `${toggleButtonH}px`, bottom: `${toggleBottom}px`, left: `${toggleLeft}px`, borderRadius: `${toggleButtonH / 4}px`, fontSize: `${toggleButtonH * 0.45}px` });
        }

        //================================================================================
        // 5. EVENT HANDLING
        //================================================================================

        /**
        * Attaches all necessary touch and click event listeners to the controls.
        */
        function setupEventListeners() {
            const joystickDeadzone = 0.20;
            const container = document.getElementById('virtual-controls-container');

            const simulateKeyEvent = (type, mapping) => {
                if (!mapping) return;
                const target = document.querySelector('canvas') || document;
                if (target.focus) target.focus();
                const event = new KeyboardEvent(type, { key: mapping.key, code: mapping.code, keyCode: mapping.keyCode, which: mapping.keyCode, bubbles: true, cancelable: true });
                target.dispatchEvent(event);
            };

            // --- Universal Button Events ---
            container.addEventListener('touchstart', (e) => {
                const button = e.target.closest('.virtual-button');
                if (button && (button.classList.contains('action-button') || button.classList.contains('dpad-button') || button.classList.contains('system-button'))) {
                    e.preventDefault();
                    button.classList.add('active');
                    simulateKeyEvent('keydown', KEY_MAPPINGS[button.id]);
                }
            }, { passive: false });

            container.addEventListener('touchend', (e) => {
                // Deactivate all buttons on any touchend to prevent "stuck" keys
                document.querySelectorAll('.virtual-button.active').forEach(b => b.classList.remove('active'));
                const button = e.target.closest('.virtual-button');
                if (button && (button.classList.contains('action-button') || button.classList.contains('dpad-button') || button.classList.contains('system-button'))) {
                    e.preventDefault();
                    simulateKeyEvent('keyup', KEY_MAPPINGS[button.id]);
                }
            });
            
            // --- Joystick Logic ---
            const joystickBase = document.getElementById('joystick-base');
            const joystickThumb = document.getElementById('joystick-thumb');
            let activeJoystickTouchId = null;

            function handleJoystickMove(x, y) {
                const rect = joystickBase.getBoundingClientRect();
                const centerX = rect.left + rect.width / 2;
                const centerY = rect.top + rect.height / 2;
                const deltaX = x - centerX;
                const deltaY = y - centerY;
                const angle = Math.atan2(deltaY, deltaX);
                const distance = Math.min(rect.width / 2, Math.sqrt(deltaX * deltaX + deltaY * deltaY));
                
                let direction = null;
                if (distance > rect.width / 2 * joystickDeadzone) {
                    const absAngle = Math.abs(angle);
                    if (absAngle > 2.356) direction = 'left';
                    else if (absAngle < 0.785) direction = 'right';
                    else if (angle < -0.785) direction = 'up';
                    else if (angle > 0.785) direction = 'down';
                }

                if (direction !== currentJoystickDirection) {
                    simulateKeyEvent('keyup', KEY_MAPPINGS['touch-' + currentJoystickDirection]);
                    simulateKeyEvent('keydown', KEY_MAPPINGS['touch-' + direction]);
                    currentJoystickDirection = direction;
                }

                const thumbX = distance * Math.cos(angle);
                const thumbY = distance * Math.sin(angle);
                joystickThumb.style.transform = `translate(${thumbX}px, ${thumbY}px)`;
            }

            joystickBase.addEventListener('touchstart', (e) => {
                e.preventDefault();
                activeJoystickTouchId = e.changedTouches[0].identifier;
                handleJoystickMove(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
            }, { passive: false });

            joystickBase.addEventListener('touchmove', (e) => {
                e.preventDefault();
                for (let i = 0; i < e.changedTouches.length; i++) {
                    if (e.changedTouches[i].identifier === activeJoystickTouchId) {
                        handleJoystickMove(e.changedTouches[i].clientX, e.changedTouches[i].clientY);
                        break;
                    }
                }
            }, { passive: false });

            joystickBase.addEventListener('touchend', (e) => {
                for (let i = 0; i < e.changedTouches.length; i++) {
                    if (e.changedTouches[i].identifier === activeJoystickTouchId) {
                        e.preventDefault();
                        simulateKeyEvent('keyup', KEY_MAPPINGS['touch-' + currentJoystickDirection]);
                        currentJoystickDirection = null;
                        joystickThumb.style.transform = 'translate(0, 0)';
                        activeJoystickTouchId = null;
                        break;
                    }
                }
            });

            // --- Control Toggle Button ---
            document.getElementById('control-toggle-button').addEventListener('click', () => {
                isJoystickMode = !isJoystickMode;
                localStorage.setItem('controlMode', isJoystickMode ? 'joystick' : 'dpad');
                updateControlVisibility();
            });
        }

        //================================================================================
        // 6. INITIALIZATION
        //================================================================================

        function updateControlVisibility() {
            document.getElementById('dpad-container').classList.toggle('hidden', isJoystickMode);
            document.getElementById('joystick-container').classList.toggle('hidden', !isJoystickMode);
            document.getElementById('control-toggle-button').textContent = isJoystickMode ? 'Use D-Pad' : 'Use Joystick';
        }
        
        function init() {
            buildControls();
            addBaseStyles();
            setupEventListeners();
            updateControlVisibility();
            
            calculateAndApplyLayout();
            window.addEventListener('resize', calculateAndApplyLayout);
            window.addEventListener('orientationchange', calculateAndApplyLayout);
        }

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', init);
        } else {
            init();
        }

    })();
    ```
3. In the `godot` folder, open `Escape! BAU BAU!.html` with a text editor, and before the `</body>` tag, add: `<script type="text/javascript" src="/TouchControls/TouchControls.js"></script>`

### Part D: Running the Game Locally

You need to run them using a local web server. Simply opening the `.html` file directly will not work due to browser security restrictions. You will need a slightly complex server setup than the built-in one to run it via Python, since Godot 4.0-4.2 games are multi-threaded, they require the server to have Cross Origin Isolation & SharedArrayBuffer enabled.

1. Create a file named `server.py` in the **root of your Git repository** (the same level as your `godot` folder) and add the following content:
    ```py
    import http.server
    import socketserver

    PORT = 8000

    class Handler(http.server.SimpleHTTPRequestHandler):
        def end_headers(self):
            self.send_header("Cross-Origin-Opener-Policy", "same-origin")
            self.send_header("Cross-Origin-Embedder-Policy", "require-corp")
            super().end_headers()

    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print("serving at port", PORT)
        httpd.serve_forever()
    ```
2. Open a CMD/Terminal **inside the root project folder**.
3. Run the following command to start a web server:
    ```bash
    python server.py
    ```
4. Open your web browser and go to the following address:
    **http://localhost:8000/godot/Escape%21%20BAU%20BAU%21.html**

The game should now start and be fully playable.

### Part E: Git Repository Setup (For Vercel) (with Git LFS) (Optional)

For uploading the repository to GitHub, it's essential to use Git Large File Storage (Git LFS) for the large game files and configure Vercel-specific settings.

1. Initialize Git & Git LFS to the root of your project where your `godot` project folder folder resides via running:
    ```bash
    git init
    git lfs install
    ```
2. Tell Git LFS to track your Godot game's package and WebAssembly files. Use:
    ```bash
    git lfs track "godot/*.pck"
    git lfs track "godot/*.wasm"
    ```
    This creates/updates the `.gitattributes` file.
3. Create a file named `vercel.json` in the **root of your Git repository** (the same level as your `godot` folder) and add the following content. This ensures Vercel sends the necessary Cross-Origin Isolation headers for Godot 4.0-4.2 games.
    ```json
    {
      "headers": [
        {
          "source": "/(.*)",
          "headers": [
            {
              "key": "Cross-Origin-Opener-Policy",
              "value": "same-origin"
            },
            {
              "key": "Cross-Origin-Embedder-Policy",
              "value": "require-corp"
            }
          ]
        }
      ]
    }
    ```
4. Add and Commit All Files via:
    ```bash
    git add .
    git commit -m "Add Godot web export, Git LFS tracking, and Vercel config"
    ```
5. Create a new repository on GitHub and push your local changes. Verify on GitHub that `.pck` and `.wasm` files show "Stored with Git LFS".
    
### Part F: Deploying to Vercel
1. Go to your [Vercel Dashboard](https://vercel.com/dashboard).
2. Click "Add New..." > "Project".
3. Select "Import Git Repository" and choose the GitHub repository you set up in Part C.
4. Once the project is created, go to its "Settings" tab, go to Git -> Git LFS Support and ensure it is ENABLED. This is critical for Vercel to download your large `.pck` and `.wasm` files.
5. Save your Vercel project settings. This will automatically trigger a new deployment. If not, go to the "Deployments" tab and manually click "Redeploy".
6. Open the Vercel deployment URL in your browser. The game should load past the initial loading bar. Check your browser's Developer Tools (F12) Console for errors and Network tab for correct HTTP headers.


## Why did you make it?

For pure educational purposes, fun, and to make this game accessible on more platforms.


## Credits

- **Game:** All credit for the game's creation goes to **Ninhydro**. Please support the original creator by visiting the [official itch.io page](https://ninhydro.itch.io/escape-bau-bau-hololive-fangame).
- **Web Port:** This web-based version was ported by [Nick088](https://linktr.ee/nick088).
- **Game Engine:** [Godot](https://godotengine.org/), specifically used version [4.2.1-stable](https://github.com/godotengine/godot-builds/releases/tag/4.2.1-stable) for this game.