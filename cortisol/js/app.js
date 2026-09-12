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
            // Traverse scene graph hierarchy to toggle structural rendering topologies
            currentScene.materials.forEach(mat => { if (mat) mat.wireframe = isWireframe; });
        }
    };
}

const tonemapSelect = document.getElementById("tonemapSelect");
if (tonemapSelect) {
    tonemapSelect.onchange = (e) => {
        if(!currentScene) return;
        // Map hardware lookup matrices directly to dynamic image processing buffers
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
// ASYNCHRONOUS SIMULATION INITIALIZATION & HARDWARE PIPELINE LIFECYCLES
// ============================================================================
const initSimulation = async function () {
    const loadingScreen = document.getElementById('loading-screen');
    const crashScreen = document.getElementById('crash-screen');
    const uiToggleBtn = document.getElementById("ui-toggle-btn");

    if (loadingScreen) loadingScreen.style.display = 'flex';
    if (crashScreen) crashScreen.style.display = 'none';

    if (currentScene) {
        currentScene.dispose();
    }

    // Set fallback dashboard control configurations
    if (iblSlider) iblSlider.value = 1.0;
    const iblValElem = document.getElementById("iblVal");
    if (iblValElem) iblValElem.innerText = "1.0";
    if (tonemapSelect) tonemapSelect.value = "aces";

    const scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color4(0, 0, 0, 0);

    // Establish production photographic tone grading parameters
    scene.imageProcessingConfiguration.toneMappingEnabled = true;
    scene.imageProcessingConfiguration.toneMappingType = BABYLON.ImageProcessingConfiguration.TONEMAPPING_ACES;
    scene.imageProcessingConfiguration.exposure = 1.6;
    scene.imageProcessingConfiguration.contrast = 1;

    // Initialize camera transformation vectors with nearplane safety clipping limits
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

    // Apply specific viewport projection coordinate translates for mobile displays
    if (window.innerWidth <= 1024) {
    camera.targetScreenOffset = new BABYLON.Vector2(0, 0.06); 
    }

    // Bind pre-filtered environmental radiance textures to manage linear PBR specular reflections
    scene.environmentTexture = BABYLON.CubeTexture.CreateFromPrefilteredData(`https://assets.babylonjs.com/environments/studio.env`, scene);
    scene.environmentIntensity = 1.0;

    // Structural luminance configurations driving the anatomical scene context
    const extraLight = new BABYLON.HemisphericLight("extraLight", new BABYLON.Vector3(0, 1, 0), scene);
    extraLight.intensity = 0.5;
    extraLight.groundColor = new BABYLON.Color3(0.05, 0.05, 0.05);

    const stressLight = new BABYLON.DirectionalLight("stressLight", new BABYLON.Vector3(-1, -2, -1), scene);
    stressLight.position = new BABYLON.Vector3(20, 40, 20);
    stressLight.diffuse = new BABYLON.Color3(1.0, 0.0, 0.0); 
    stressLight.intensity = 0; 

    const glowLayer = new BABYLON.GlowLayer("glow", scene);
    glowLayer.intensity = 0.8; 

    if (BABYLON.KhronosTextureContainer2) {
        BABYLON.KhronosTextureContainer2.URL = "https://preview.babylonjs.com/basis/";
    }
    const modelFilename = "human_stress_v01.glb";

    try {
        // Stream primary scene payload graph asynchronously from remote path
        await BABYLON.SceneLoader.AppendAsync("./assets/", modelFilename, scene);
        if (loadingScreen) loadingScreen.style.display = 'none';

        // Calculate absolute world bounding dimensions to normalize scene framing variables
        const worldExtends = scene.getWorldExtends();
        const center = worldExtends.min.add(worldExtends.max).scale(0.5);
        camera.setTarget(center);

        scene.executeWhenReady(() => {
            camera.useFramingBehavior = true;
            const framingBehavior = camera.getBehaviorByName("Framing");
            if (framingBehavior) {
                framingBehavior.framingTime = 0;
                framingBehavior.elevationReturnTime = -1;
                framingBehavior.zoomOnMeshesHierarchy(scene.meshes);
            }
        });

        // ============================================================================
        // MATERIAL LOOK-DEVELOPMENT ENGINE OVERRIDES & CHANNEL-PACK CODES
        // ============================================================================
        scene.materials.forEach(mat => {
            if (mat) mat.wireframe = isWireframe;
            if (mat instanceof BABYLON.PBRMaterial) {
                const matName = mat.name ? mat.name.toLowerCase() : "";
                // Isolate structural medical sub-elements from universal channel updates
                if (!matName.includes("vagus") && !matName.includes("glass") && !matName.includes("optic")) {
                    if (mat.metallicTexture) {
                        // Enforce unified ORM layouts by routing packed channels to Red ambient occlusion slots
                        mat.ambientTexture = mat.metallicTexture;
                        mat.useAmbientOcclusionFromMetallicTextureRed = true;
                        mat.ambientTextureStrength = 1.0; 
                    }
                    if (matName.includes("head") || matName.includes("skin") || matName.includes("body")) {
                        // Implement dynamic subsurface scattering proxies (Sheen/Iridescence) for organic data layers
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

        // Compute localized index distributions to output clean performance telemetry profiles
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

        // Query asset binary headers asynchronously to evaluate real-time network budgets
        fetch(`./assets/${modelFilename}`, { method: 'HEAD' })
            .then(res => {
                const totalBytes = parseInt(res.headers.get('content-length') || 0, 10);
                if (fileSizeElem) fileSizeElem.innerText = totalBytes > 0 ? (totalBytes / (1024 * 1024)).toFixed(2) + " MB" : "Ready";
            }).catch(() => { if (fileSizeElem) fileSizeElem.innerText = "Unknown"; });

        // ============================================================================
        // MATERIAL RUNTIME CLONING & HARDWARE EMISSIVE INTENSITY REGISTERS
        // ============================================================================

        let atlasMat = scene.getMaterialByName("mat_opaque_atlas");
        let cortexMat = scene.getMaterialByName("mat_transparent_cortex");
        
        // Deep clone material graphs to isolate individual organ lighting overrides
        let medullaMat = atlasMat ? atlasMat.clone("mat_medulla_glow") : null;
        let midbrainMat = atlasMat ? atlasMat.clone("mat_midbrain_glow") : null;
        let pituitaryMat = atlasMat ? atlasMat.clone("mat_pituitary_glow") : null;
        let liverMat = atlasMat ? atlasMat.clone("mat_liver_glow") : null;
        let cortexInstanceMat = cortexMat ? cortexMat.clone("mat_cortex_glow") : (atlasMat ? atlasMat.clone("mat_cortex_glow") : null);
        
        // Re-assign localized material pointers down to specific structural mesh channels
        let applyMat = (meshName, mat) => { let m = scene.getMeshByName(meshName); if(m && mat) m.material = mat; };
        applyMat("geo_adrenal_medulla", medullaMat);
        applyMat("geo_brain_midbrain", midbrainMat);
        applyMat("geo_pituitary", pituitaryMat);
        applyMat("geo_liver", liverMat);
        applyMat("geo_adrenal_cortex", cortexInstanceMat);

        let matOpticNerve = scene.getMaterialByName("mat_optic_nerve");
        let matTrailNeural = scene.getMaterialByName("mat_trail_neural");
        let matTrailBlood = scene.getMaterialByName("mat_trail_blood");
        
        if (matOpticNerve) {
            matOpticNerve.emissiveColor = new BABYLON.Color3(0.0, 0.5, 2.0); 
            if (!matOpticNerve.emissiveTexture && matOpticNerve.albedoTexture) {
                matOpticNerve.emissiveTexture = matOpticNerve.albedoTexture;
            }
            matOpticNerve.emissiveIntensity = 0;
            // Force strict UV address wrapping to prevent planar streaming clipping artifacts
            if (matOpticNerve.albedoTexture) matOpticNerve.albedoTexture.wrapV = BABYLON.Texture.WRAP_ADDRESSMODE;
            if (matOpticNerve.emissiveTexture) matOpticNerve.emissiveTexture.wrapV = BABYLON.Texture.WRAP_ADDRESSMODE;
        }

        [matTrailNeural, matTrailBlood].forEach(mat => {
            if(mat) {
                mat.albedoColor = new BABYLON.Color3(0, 0, 0); 
                mat.emissiveColor = new BABYLON.Color3(1, 1, 1); 
                mat.emissiveIntensity = 0;
                // Enforce hardware additive alpha blending for dynamic signal flow meshes
                mat.transparencyMode = BABYLON.PBRMaterial.PBRMATERIAL_ALPHABLEND;
                mat.alphaMode = BABYLON.Engine.ALPHA_ADD;
                mat.alpha = 0.99; 
                mat.environmentIntensity = 0; 
                if(mat.albedoTexture) mat.albedoTexture.wrapV = BABYLON.Texture.WRAP_ADDRESSMODE;
                if(mat.emissiveTexture) mat.emissiveTexture.wrapV = BABYLON.Texture.WRAP_ADDRESSMODE;
            }
        });

        // ============================================================================
        // ENDOCRINE SIMULATION STATE-MACHINE STEP LOCK CONFIGURATION
        // ============================================================================

        const slider = document.getElementById("stressSlider");
        const sliderWrapper = document.getElementById("slider-wrapper");
        const annoContainer = document.getElementById("annotation-container");
        const annoTitle = document.getElementById("anno-title");
        const annoText = document.getElementById("anno-text");
        const annoBtn = document.getElementById("anno-unlock-btn");

        const checkpoints = [
            { limit: 0.1, target: "geo_eye", title: "Eyes & Optic Nerve", text: "Visual stimuli trigger the optical pathways, sending high-priority environmental data directly to the brain's processing centers." },
            { limit: 0.3, target: "geo_brain_midbrain", title: "Amygdala & Hypothalamus", text: "Threat detected. The amygdala processes the risk and alerts the hypothalamus, the body's master command center, to initiate fight-or-flight." },
            { limit: 0.6, target: "geo_adrenal_medulla", title: "Adrenal Medulla (Inner)", text: "Immediate Shock. The sympathetic nervous system triggers the adrenal medulla to flood the bloodstream with Epinephrine (Adrenaline)." },
            { limit: 0.8, target: "geo_heart", title: "Heart & Lungs", text: "Cardiopulmonary Overdrive. Heart rate spikes to pump blood rapidly, while lungs expand bronchioles for maximum oxygen absorption." },
            { limit: 0.9, target: "geo_adrenal_cortex", title: "Adrenal Cortex (Outer)", text: "The Sustained Response. The HPA axis reaches the adrenal cortex, releasing Cortisol to mobilize energy reserves and sustain the body through prolonged stress." },
            { limit: 1.0, target: "geo_liver", title: "Liver", text: "Metabolic Sustenance. Cortisol triggers the liver to manufacture new glucose (gluconeogenesis), ensuring a steady, long-term fuel supply dedicated primarily to the brain." }
        ];
        
        let currentPhaseIndex = 0;
        let isSliderLocked = false;
        let maxReachedValue = 0; 
        let time = 0;
        let eyeTarget = new BABYLON.Vector3(0, 0, -10);

        if (slider) {
            slider.oninput = (e) => {
                let val = parseFloat(e.target.value);

                // Reset entire layout registers if boundary drops back to absolute zero
                if (val === 0) {
                    currentPhaseIndex = 0;
                    maxReachedValue = 0;
                    isSliderLocked = false;
                    if (annoContainer) annoContainer.style.display = "none";
                    if (sliderWrapper) sliderWrapper.style.display = "block";
                }

                let nextCheckpoint = checkpoints[currentPhaseIndex];

                // Execute strict threshold normalization near checkpoint positions
                if (nextCheckpoint && val >= nextCheckpoint.limit - 0.02) {
                    val = nextCheckpoint.limit; 
                }

                // Block inverse execution vectors to secure a deterministic timeline flow
                if (maxReachedValue < 1.0 && val < maxReachedValue && val !== 0) {
                    e.target.value = maxReachedValue; 
                    return; 
                }

                if (isSliderLocked) {
                    e.target.value = nextCheckpoint ? nextCheckpoint.limit : maxReachedValue;
                    return;
                }

                if (val > maxReachedValue) {
                    maxReachedValue = val;
                }
                
                e.target.value = val;

                // Engage structural frame locks and fire UI dynamic text container node bindings
                if (nextCheckpoint && val >= nextCheckpoint.limit) {
                    e.target.value = nextCheckpoint.limit; 
                    maxReachedValue = nextCheckpoint.limit;
                    isSliderLocked = true;
                    
                    if (annoTitle) annoTitle.innerText = nextCheckpoint.title;
                    if (annoText) annoText.innerText = nextCheckpoint.text;
                    if (sliderWrapper) sliderWrapper.style.display = "none";
                    if (annoContainer) annoContainer.style.display = "block";
                }
            };
        }

        // Unregister timeline execution flags upon direct user confirmation event
        if (annoBtn) {
            annoBtn.onclick = () => {
                isSliderLocked = false;
                if (annoContainer) annoContainer.style.display = "none";
                if (sliderWrapper) sliderWrapper.style.display = "block";
                currentPhaseIndex++; 
                if (currentPhaseIndex >= checkpoints.length) maxReachedValue = 1.0; 
            };
        }
        // Register pointer track observabilities to establish eye target tracking vectors
        scene.onPointerObservable.add((pi) => {
            if (pi.type === BABYLON.PointerEventTypes.POINTERMOVE) {
                let x = (scene.pointerX / engine.getRenderWidth()) * 2 - 1;
                let y = -(scene.pointerY / engine.getRenderHeight()) * 2 + 1;
                eyeTarget.set(x * 3, (y * 3) + 1.5, 10);
            }
        });
        
        // ============================================================================
        // FRAME OBSERVABLE RENDERING SIMULATION MATRIX & HORMONAL CASCADE LERPS
        // ============================================================================

        scene.onBeforeRenderObservable.add(() => {
            let currentFps = engine.getFps();
            if (fpsElem) fpsElem.innerText = isFinite(currentFps) && currentFps > 0 ? currentFps.toFixed() : "60";
            // Accumulate hardware delta step weights to drive uniform phase timers
            time += engine.getDeltaTime() * 0.001;
            
            const stressLevel = slider ? parseFloat(slider.value) : 0;
            stressLight.intensity = stressLevel * 0.8; 
            glowLayer.intensity = Math.max(0.6, stressLevel * 1.5); 

            // Execute spatial tracking vectors for eyeball hardware constraints
            let eyeMesh = scene.getMeshByName("geo_eye");
            if (eyeMesh) {
                eyeMesh.lookAt(eyeTarget); 
                if (eyeMesh.morphTargetManager) {
                    // Update pupillary scale target values directly via input stress thresholds
                    let pupilTarget = eyeMesh.morphTargetManager.getTargetByName("pupil_dilate") || eyeMesh.morphTargetManager.getTargetByName("stress_pupil");
                    if (pupilTarget) pupilTarget.influence = stressLevel; 
                }
            }

            // Dynamically modulate skeletal timeline speeds relative to stress values
            if (scene.animationGroups) {
                scene.animationGroups.forEach(anim => {
                    anim.speedRatio = isSliderLocked ? 0.1 : 1.0 + (stressLevel * 1.5); 
                });
            }

            // Compute clamped linear interpolation boundaries for distinct anatomical cascade segments
            let alarmPhase = BABYLON.Scalar.Clamp(stressLevel / 0.1, 0, 1);           
            let midbrainPhase = BABYLON.Scalar.Clamp((stressLevel - 0.1) / 0.2, 0, 1); 
            let medullaPhase = BABYLON.Scalar.Clamp((stressLevel - 0.3) / 0.3, 0, 1);  
            let heartPhase = BABYLON.Scalar.Clamp((stressLevel - 0.6) / 0.2, 0, 1);
            let cortexPhase = BABYLON.Scalar.Clamp((stressLevel - 0.8) / 0.1, 0, 1);
            let liverPhase = BABYLON.Scalar.Clamp((stressLevel - 0.9) / 0.1, 0, 1);    
            
            // Execute texture transformation offsets to visualize real-time neural data streaming
            if (matOpticNerve) {
                matOpticNerve.emissiveIntensity = alarmPhase > 0 ? alarmPhase * 25 : 0; 
                if (matOpticNerve.emissiveTexture) matOpticNerve.emissiveTexture.vOffset -= 0.08; 
            }
            if (matTrailNeural && matTrailNeural.emissiveTexture) {
                matTrailNeural.emissiveIntensity = (stressLevel > 0.15 && stressLevel < 0.65) ? 20 : 0; 
                matTrailNeural.emissiveTexture.vOffset -= 0.15; 
            }
            if (matTrailBlood && matTrailBlood.emissiveTexture) {
                matTrailBlood.emissiveIntensity = (stressLevel > 0.55 && stressLevel < 0.95) ? 20 : 0; 
                matTrailBlood.emissiveTexture.vOffset -= 0.05; 
            }
            
            // Update individual organ runtime material clones with specific chromatic profiles
            if (midbrainMat) {
                midbrainMat.emissiveColor = new BABYLON.Color3(1.0, 0.2, 0.2);
                midbrainMat.emissiveIntensity = midbrainPhase * 1.5; 
            }
            if (medullaMat) {
                medullaMat.emissiveColor = new BABYLON.Color3(0.0, 0.5, 1.0); 
                medullaMat.emissiveIntensity = medullaPhase * 4;
            }
            if (pituitaryMat) {
                pituitaryMat.emissiveColor = new BABYLON.Color3(0.8, 0.8, 1.0);
                pituitaryMat.emissiveIntensity = cortexPhase * 3;
            }
            if (cortexInstanceMat) {
                cortexInstanceMat.emissiveColor = new BABYLON.Color3(1.0, 0.4, 0.0); 
                cortexInstanceMat.emissiveIntensity = cortexPhase * 5;
            }
            if (liverMat) {
                // Apply cyclic harmonic wave overrides to simulate cellular metabolic surge pacing
                let pulse = (Math.sin(time * 6) + 1) / 2; 
                liverMat.emissiveColor = new BABYLON.Color3(1.0, 0.0, 0.0); 
                liverMat.emissiveIntensity = liverPhase * 1.5 * pulse; 
            }
        });
        
        currentScene = scene;
    } catch (error) {
        // Exception catchment block to filter hardware allocation and streaming anomalies
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