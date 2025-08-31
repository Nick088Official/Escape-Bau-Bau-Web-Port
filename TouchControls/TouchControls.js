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