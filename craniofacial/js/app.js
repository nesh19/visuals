// ============================================================================
// CORE VIEWPORT RENDERING CONTEXT & GLOBAL CONTROL SELECTION REGISTERS
// ============================================================================

const canvas = document.getElementById("renderCanvas");
const engine = new BABYLON.Engine(canvas, true);

let currentScene = null;
let isWireframe = false;

const wireframeBtn = document.getElementById("wireframe-btn");
if (wireframeBtn) {
    wireframeBtn.onclick = () => {
        isWireframe = !isWireframe;
        wireframeBtn.style.color = isWireframe ? "#ffffff" : "#aaa";
        wireframeBtn.style.borderColor = isWireframe ? "#ffffff" : "rgba(255,255,255,0.1)";
        if(currentScene) {
            // Traverse scene graphics nodes to override geometry drawing modes
            currentScene.materials.forEach(mat => { if (mat) mat.wireframe = isWireframe; });
        }
    };
}

const tonemapSelect = document.getElementById("tonemapSelect");
if (tonemapSelect) {
    tonemapSelect.onchange = (e) => {
        if(!currentScene) return;
        // Map hardware look-up configurations to active post-processing pipelines
        if (e.target.value === "aces") {
            currentScene.imageProcessingConfiguration.toneMappingEnabled = true;
            currentScene.imageProcessingConfiguration.toneMappingType = BABYLON.ImageProcessingConfiguration.TONEMAPPING_ACES;
        } else if (e.target.value === "standard") {
            currentScene.imageProcessingConfiguration.toneMappingEnabled = true;
            currentScene.imageProcessingConfiguration.toneMappingType = BABYLON.ImageProcessingConfiguration.TONEMAPPING_STANDARD;
        } else {
            currentScene.imageProcessingConfiguration.toneMappingEnabled = false;
        }
    };
}

const iblSlider = document.getElementById("iblSlider");
if (iblSlider) {
    iblSlider.oninput = (e) => {
        const val = parseFloat(e.target.value);
        const iblValElem = document.getElementById("iblVal");
        if (iblValElem) iblValElem.innerText = val.toFixed(1);
        if(currentScene) currentScene.environmentIntensity = val;
    };
}
// ============================================================================
// ASYNCHRONOUS ENGINE INITIALIZATION & HARDWARE TARGET ALLOCATION
// ============================================================================
const initSimulation = async function () {
    const loadingScreen = document.getElementById('loading-screen');
    const crashScreen = document.getElementById('crash-screen');
    const uiToggleBtn = document.getElementById("ui-toggle-btn");

    if (loadingScreen) loadingScreen.style.display = 'flex';
    if (crashScreen) crashScreen.style.display = 'none';

    if (currentScene) {
        currentScene.dispose(); // Release graphic hardware instances to eliminate leaks
    }

    // Enforce baseline parameter states for incoming assets
    if (iblSlider) iblSlider.value = 1.0;
    const iblValElem = document.getElementById("iblVal");
    if (iblValElem) iblValElem.innerText = "1.0";
    if (tonemapSelect) tonemapSelect.value = "aces";

    const scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color4(0, 0, 0, 0);

    // Apply strict photographic tone grading properties
    scene.imageProcessingConfiguration.toneMappingEnabled = true;
    scene.imageProcessingConfiguration.toneMappingType = BABYLON.ImageProcessingConfiguration.TONEMAPPING_ACES;
    scene.imageProcessingConfiguration.exposure = 1.0;
    scene.imageProcessingConfiguration.contrast = 1;

    // Construct perspective projection matrix with rigid safety boundaries
    const camera = new BABYLON.ArcRotateCamera("camera", Math.PI / 2, Math.PI / 2, 5, BABYLON.Vector3.Zero(), scene);
    camera.attachControl(canvas, true);
    camera.inertia = 0.8;                
    camera.panningInertia = 0.5;         
    camera.angularSensibilityX = 500;   
    camera.angularSensibilityY = 500;   
    camera.panningSensibility = 0; 
    camera.targetScreenOffset = new BABYLON.Vector2(0.00, 0); 
    camera.wheelPrecision = 100; 
    camera.pinchPrecision = 200; 
    camera.minZ = 0.01; 
    camera.lowerRadiusLimit = 1.8; 
    camera.upperRadiusLimit = 20.0;
    if (window.innerWidth <= 1024) {
    camera.targetScreenOffset = new BABYLON.Vector2(0, 0.00); 
    }

    // Ingest pre-filtered radiance maps to calculate PBR surface equations
    scene.environmentTexture = BABYLON.CubeTexture.CreateFromPrefilteredData(`https://assets.babylonjs.com/environments/environmentSpecular.env`, scene);
    scene.environmentIntensity = 1.0;

    const extraLight = new BABYLON.HemisphericLight("extraLight", new BABYLON.Vector3(0, 1, 0), scene);
    extraLight.intensity = 0.0;
    extraLight.groundColor = new BABYLON.Color3(0.05, 0.05, 0.05);

    if (BABYLON.KhronosTextureContainer2) {
        BABYLON.KhronosTextureContainer2.URL = "https://preview.babylonjs.com/basis/";
    }
    const modelFilename = "anatomical-morph-viewer.glb";

    try {
        await BABYLON.SceneLoader.AppendAsync("./assets/", modelFilename, scene);
        if (loadingScreen) loadingScreen.style.display = 'none';

        const worldExtends = scene.getWorldExtends();
        const center = worldExtends.min.add(worldExtends.max).scale(0.5);
        camera.setTarget(center);

        scene.executeWhenReady(() => {
            // Apply automated framing constraints to avoid structural positioning shifts
            camera.useFramingBehavior = true;
            const framingBehavior = camera.getBehaviorByName("Framing");
            if (framingBehavior) {
                framingBehavior.framingTime = 0;
                framingBehavior.elevationReturnTime = -1;
                framingBehavior.zoomOnMeshesHierarchy(scene.meshes);
            }
        });

        // ============================================================================
        // PBR LOOK-DEVELOPMENT ENGINE OVERRIDES & CHANNEL-PACK VALIDATION
        // ============================================================================
        scene.materials.forEach(mat => {
            if (mat) mat.wireframe = isWireframe;
            if (mat instanceof BABYLON.PBRMaterial) {
                const matName = mat.name ? mat.name.toLowerCase() : "";
                if (!matName.includes("vagus") && !matName.includes("glass") && !matName.includes("optic")) {
                    if (mat.metallicTexture) {
                        mat.ambientTexture = mat.metallicTexture;
                        mat.useAmbientOcclusionFromMetallicTextureRed = true;
                        mat.ambientTextureStrength = 1.0; 
                    }
                    if (matName.includes("head") || matName.includes("skin") || matName.includes("body")) {
                        mat.sheen.isEnabled = true;
                        mat.sheen.intensity = 0.24;
                        mat.sheen.color = new BABYLON.Color3(1.0, 0.9, 0.85);
                        mat.sheen.useRoughnessFromMainTexture = true;
                        mat.iridescence.isEnabled = true;
                        mat.iridescence.intensity = 0.58;
                    }
                    mat.markDirty();
                }
            }
        });

        if (scene.animationGroups && scene.animationGroups.length > 0) {
            scene.animationGroups.forEach(anim => anim.play(true));
        }

        // Generate precise diagnostic geometric metrics
        let totalTris = 0;
        let totalVerts = 0;
        scene.meshes.forEach(m => {
            totalVerts += m.getTotalVertices() || 0;
            const indices = m.getIndices();
            if (indices) totalTris += (indices.length / 3);
        });
        
        const trisElem = document.getElementById("tris");
        const vertsElem = document.getElementById("verts");
        const fileSizeElem = document.getElementById("fileSize");
        const fpsElem = document.getElementById("fps");

        if (trisElem) trisElem.innerText = Math.round(totalTris).toLocaleString();
        if (vertsElem) vertsElem.innerText = totalVerts.toLocaleString();
        if (fileSizeElem) fileSizeElem.innerText = "Calculating...";

        // Extract explicit asset header data payloads to verify network memory footprints
        fetch(`./assets/${modelFilename}`, { method: 'HEAD' })
            .then(res => {
                const totalBytes = parseInt(res.headers.get('content-length') || 0, 10);
                if (fileSizeElem) fileSizeElem.innerText = totalBytes > 0 ? (totalBytes / (1024 * 1024)).toFixed(2) + " MB" : "Ready";
            }).catch(() => { if (fileSizeElem) fileSizeElem.innerText = "Unknown"; });

        let headMesh = null;
        scene.meshes.forEach(mesh => {
            if (mesh.morphTargetManager) headMesh = mesh;
        });

        // Initialize multi-layered shape key hierarchies
        if (headMesh && headMesh.morphTargetManager) {
            for (let i = 0; i < headMesh.morphTargetManager.numTargets; i++) {
                headMesh.morphTargetManager.getTarget(i).influence = 1.0;
            }
        }

        // ============================================================================
        // PARAMETRIC MORPH MATRIX INTERACTIVE DATA INTERPOLATION
        // ============================================================================
        const morphSliders = [
            { sliderId: "humpSlider", valId: "humpVal", index: 0 },
            { sliderId: "chinSlider", valId: "chinVal", index: 1 },
            { sliderId: "fatSlider",  valId: "fatVal",  index: 2 }
        ];

        // Register per-frame observer hook to evaluate deformer properties smoothly
        scene.onBeforeRenderObservable.add(() => {
            let currentFps = engine.getFps();
            if (fpsElem) fpsElem.innerText = isFinite(currentFps) && currentFps > 0 ? currentFps.toFixed() : "60";
            
            morphSliders.forEach(item => {
                const slider = document.getElementById(item.sliderId);
                const val = slider ? parseFloat(slider.value) : 0;
                
                // Track spatial states to render diagnostic metadata changes down to the DOM containers
                const label = document.getElementById(item.valId);
                if (label) {
                    if (val === 1) label.innerText = "1.00 (Before)";
                    else if (val === 0) label.innerText = "0.00 (After)";
                    else label.innerText = val.toFixed(2);
                }

                // Inject normalized slider influence weight coefficients straight into the active vertex targets
                if (headMesh && headMesh.morphTargetManager && headMesh.morphTargetManager.getTarget(item.index)) {
                    headMesh.morphTargetManager.getTarget(item.index).influence = val;
                }
            });
        });
        
        currentScene = scene;
    } catch (error) {
        // Exception handler matrix to deal with unexpected streaming failures or asset corruptions
        if (loadingScreen) loadingScreen.style.display = 'none';
        if (crashScreen) crashScreen.style.display = 'block';
        console.error("LOAD ERROR:", error);
    }
};

// Fire universal rendering engines lifecycles
initSimulation();

engine.runRenderLoop(() => {
    if (currentScene) currentScene.render();
});

window.addEventListener("resize", () => { engine.resize(); });
