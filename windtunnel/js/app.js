// ============================================================================
// CORE VIEWPORT RENDERING CONTEXT & GLOBAL CONTROL SELECTION REGISTERS
// ============================================================================

const canvas = document.getElementById("renderCanvas");
const engine = new BABYLON.Engine(canvas, true);

let currentScene = null;
let isWireframe = false;

const CONFIG = {
    particleCount: 60000,              
    particleSize: 0.2,                 
    beamRadius: 1.75,                 
    tunnelLength: 12.0,
    baseSpeed: 2.0,
    turboSpeed: 10.0,
    zOffset: -0.6,
    minBaseAlpha: 0.5,
    flowDirection: 1
                 
};

let currentMix = 0.0;
const fanGroups = [];
const brakeGroups = [];
const invMat = new BABYLON.Matrix(); 

// ============================================================================
// ENVIRONMENT OVERRIDES & RENDER CONFIGURATION REGISTER
// ============================================================================

const wireframeBtn = document.getElementById("wireframe-btn");
if (wireframeBtn) {
    wireframeBtn.onclick = () => {
        isWireframe = !isWireframe;
        wireframeBtn.style.color = isWireframe ? "#ffffff" : "#aaa";
        wireframeBtn.style.borderColor = isWireframe ? "#ffffff" : "rgba(255,255,255,0.1)";
        if(currentScene) {
            currentScene.materials.forEach(mat => { 
                if (mat && mat.name !== "gpuMat") mat.wireframe = isWireframe; 
            });
        }
    };
}

const tonemapSelect = document.getElementById("tonemapSelect");
if (tonemapSelect) {
    tonemapSelect.onchange = (e) => {
        if(!currentScene) return;
        // Map hardware LUT parameters to dynamic image processing buffers
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

const createScene = async function () {
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) loadingScreen.style.display = 'flex';

    const scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color4(0.01, 0.01, 0.01, 1);
    scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
    scene.fogColor = new BABYLON.Color3(0.01, 0.01, 0.01);
    scene.fogDensity = 0.0001; 

    // Ingest production asset meta headers to verify payload footprint boundaries
    fetch("./assets/dron.glb", { method: 'HEAD' })
        .then(response => {
            const bytes = response.headers.get("content-length");
            if (bytes) {
                const mb = (bytes / (1024 * 1024)).toFixed(2);
                const sizeElement = document.getElementById("fileSize");
                if (sizeElement) sizeElement.innerText = `${mb} MB`;
            }
        }).catch(() => {});

    // Set cinematic look-development parameters via dynamic pipeline grading
    scene.imageProcessingConfiguration.toneMappingEnabled = true;
    scene.imageProcessingConfiguration.toneMappingType = BABYLON.ImageProcessingConfiguration.TONEMAPPING_ACES;
    scene.imageProcessingConfiguration.exposure = 1.0;
    scene.imageProcessingConfiguration.contrast = 2.00;

    // Load pre-filtered radiance maps to drive PBR environmental reflections
    scene.environmentTexture = BABYLON.CubeTexture.CreateFromPrefilteredData("https://assets.babylonjs.com/environments/studio.env", scene);
    scene.environmentIntensity = 1.2;

    const glowLayer = new BABYLON.GlowLayer("glow", scene);
    glowLayer.intensity = 0.75; 

    // ============================================================================
    // LUMINANCE ARCHITECTURE & SHADOW INFERENCE PIPELINE
    // ============================================================================

    // Low-intensity hemispheric fill to establish structural ambient depth
    const hemi = new BABYLON.HemisphericLight("hemi", new BABYLON.Vector3(0, 1, 0), scene);
    hemi.intensity = 0.15;
    hemi.diffuse = new BABYLON.Color3(0.1, 0.1, 0.15); 

    // Primary directional rim light configuration targeting the prototype boundaries
    const rimLight = new BABYLON.DirectionalLight("rimLight", new BABYLON.Vector3(0.45, -0.8, -0.2), scene);
    rimLight.position = new BABYLON.Vector3(0.0, 5.0, -8.0); 
    rimLight.diffuse = new BABYLON.Color3(1.0, 1.0, 1.5); 
    rimLight.specular = new BABYLON.Color3(1.0, 0.4, 0.4); 
    rimLight.intensity = 0.55; 

    // Instantiate high-resolution shadow maps utilizing Percentage Closer Filtering (PCF)
    const shadowGenerator = new BABYLON.ShadowGenerator(2048, rimLight);
    shadowGenerator.usePercentageCloserFiltering = true;
    shadowGenerator.setDarkness(0.5);

    const isMobilePortrait = window.innerWidth < window.innerHeight;
    
    // ============================================================================
    // TRANSFORMATION HIERARCHY & VIEWPORT MATRIX NORMALIZATION
    // ============================================================================
    scene.collisionsEnabled = true;

    const cameraTarget = new BABYLON.Vector3(0, 0, 0); 
    let initialRadius = 11.0;

    // Apply specific spatial coordinate translation vectors for mobile display frames
    if (isMobilePortrait) {
        cameraTarget.y = 0.3; 
        cameraTarget.x = 0.6; 
        initialRadius = 13.0; 
    }

    const initialAlpha = 1.57; 
    const initialBeta = 1.25;  

    const camera = new BABYLON.ArcRotateCamera("cam", initialAlpha, initialBeta, initialRadius, cameraTarget, scene);
    camera.attachControl(canvas, true);
    camera.minZ = 0.01; // Restrict transformation boundaries to eliminate clipping nearplane artifacts

    camera.checkCollisions = true;
    camera.collisionRadius = new BABYLON.Vector3(0.5, 0.5, 0.5);
    
    // Enforce strict projection matrix frustum constraints depending on device metadata
    if (isMobilePortrait) {
        camera.fovMode = BABYLON.ArcRotateCamera.FOVMODE_VERTICAL_FIXED;
        camera.fov = 0.75; 
    } else {
        camera.fovMode = BABYLON.ArcRotateCamera.FOVMODE_HORIZONTAL_FIXED;
        camera.fov = 1.15;  
    }

    // ============================================================================
    // DETERMINISTIC CAMERA TRANSFORMATION LIMITS
    // ============================================================================
    const isMobileOrTablet = window.innerWidth < 1200; 

    // Initialize viewport-specific spherical coordinate constraints
    if (isMobileOrTablet) {

        const alphaRangeMobile = 1.30; 
        camera.lowerAlphaLimit = initialAlpha - alphaRangeMobile; 
        camera.upperAlphaLimit = initialAlpha + alphaRangeMobile;
        } 
        else {
        // Enforce horizontal and vertical projection limits to prevent floor geometry clipping

        camera.lowerBetaLimit = 30 * (Math.PI / 180); 
        camera.upperBetaLimit = 100 * (Math.PI / 180); 

        const alphaRangeDesktop = 0.785; 
        camera.lowerAlphaLimit = initialAlpha - alphaRangeDesktop; 
        camera.upperAlphaLimit = initialAlpha + alphaRangeDesktop;
    }

    // Disable input-bound inertial transforms to maintain camera tracking stability
    camera.panningSensibility = 0; 
    camera.inertialPanningX = 0;
    camera.inertialPanningY = 0;
    camera.wheelPrecision = 60;

    camera.upperRadiusLimit = camera.radius;

    // Attach dynamic fill light proxy to the active camera transformation hierarchy
    const camLight = new BABYLON.PointLight("camLight", camera.position, scene);
    camLight.parent = camera;
    camLight.intensity = 0.6; 
    camLight.diffuse = new BABYLON.Color3(0.9, 0.95, 1.0);

    // Ingest primary scene graph payload asynchronously via loaders instance
    const result = await BABYLON.SceneLoader.ImportMeshAsync("", "./assets/", "dron.glb", scene);
    if (loadingScreen) loadingScreen.style.display = 'none';
    let wallsMesh = scene.getMeshByName("walls") || scene.getMeshByName("Walls");
    let sidesMesh = scene.getMeshByName("sides") || scene.getMeshByName("Sides");
    if (wallsMesh) wallsMesh.checkCollisions = true;
    wallsMesh.receiveShadows = true;
    if (sidesMesh) sidesMesh.checkCollisions = true;

    let Fuselage = scene.getMeshByName("Fuselage") || scene.getMeshByName("fuselage") || result.meshes[0];
    if (Fuselage) {
        shadowGenerator.addShadowCaster(Fuselage, true); 
    }

    // Isolate structural meshes to omit static background occlusion from the dynamic shadow maps
    if (wallsMesh) {
        shadowGenerator.removeShadowCaster(wallsMesh, true);
    }
    if (sidesMesh) {
        shadowGenerator.removeShadowCaster(sidesMesh, true);
    }

    // Traverse structural sub-meshes to inherit environment pre-filtered data maps
    Fuselage.getChildMeshes().forEach(child => {
        child.lightSources = scene.lights;
        if (child.material) {
            child.material.lightingEnabled = true;
            child.material.environmentTexture = scene.environmentTexture;
        }
         child.renderingGroupId = 1; 
    });

    // Compute scene index bounds to generate precise diagnostic performance summaries
    let trisSum = 0;
    let vertsSum = 0;
    result.meshes.forEach(m => {
        if (m.geometry) {
            trisSum += m.getIndices().length / 3;
            vertsSum += m.getTotalVertices();
        }
    });
    
    // Parse internal skeletal/transform tracks into active and conditional playback registers
    const trisElem = document.getElementById("tris");
    const vertsElem = document.getElementById("verts");
    if(trisElem) trisElem.innerText = Math.floor(trisSum).toLocaleString();
    if(vertsElem) vertsElem.innerText = Math.floor(vertsSum + CONFIG.particleCount).toLocaleString();

    scene.animationGroups.forEach(group => {
        const name = group.name.toLowerCase();
        if (name.includes("fan")) {
            group.play(true); 
            fanGroups.push(group);
        }
        else if (name.includes("brake") || name.includes("break") || name.includes("krilc") || name.includes("air")) {
            group.play(false);
            group.pause(); 
            group.goToFrame(group.from);
            brakeGroups.push(group);
        } else {
            group.play(true);
        }
    });

    // ============================================================================
    // PROCEDURAL GPU BUFFER ALLOCATION FOR REAL-TIME STREAMING PARTICLES
    // ============================================================================
    const positions = new Float32Array(CONFIG.particleCount * 3);
    const randomOffsets = new Float32Array(CONFIG.particleCount * 3);
    const particleIds = new Float32Array(CONFIG.particleCount);

    // Populate planar mathematical arrays with pseudo-random vector paths
    for (let i = 0; i < CONFIG.particleCount; i++) {
        positions[i * 3] = (Math.random() - 0.5) * CONFIG.tunnelLength;
        let r = Math.sqrt(Math.random()) * CONFIG.beamRadius;
        let theta = Math.random() * 2 * Math.PI;
        positions[i * 3 + 1] = r * Math.sin(theta);
        positions[i * 3 + 2] = r * Math.cos(theta) + CONFIG.zOffset;

        randomOffsets[i * 3] = Math.random();
        randomOffsets[i * 3 + 1] = Math.random();
        randomOffsets[i * 3 + 2] = Math.random();
        particleIds[i] = i / CONFIG.particleCount;
    }

    // Construct custom VBO (Vertex Buffer Object) target inside the active WebGL rendering target
    const customMesh = new BABYLON.Mesh("gpuParticles", scene);
    const vertexData = new BABYLON.VertexData();
    const indices = new Int32Array(CONFIG.particleCount);
    for (let i = 0; i < CONFIG.particleCount; i++) indices[i] = i;

    vertexData.positions = positions;
    vertexData.indices = indices;
    vertexData.applyToMesh(customMesh);
    // Bind unique shader input registers to pass parameters directly into custom hardware shaders
    customMesh.setVerticesData("randomOffset", randomOffsets, false, 3);
    customMesh.setVerticesData("particleId", particleIds, false, 1);

    // ============================================================================
    // HIGH-PERFORMANCE CUSTOM GLSL VERTEX & FRAGMENT SHADER REGISTERS
    // ============================================================================
    
    BABYLON.Effect.ShadersStore["gpuParticleVertexShader"] = `
        precision highp float;
        attribute vec3 position;
        attribute vec3 randomOffset;
        attribute float particleId;

        // Dynamic transformation registers mapping the active model boundaries
        uniform mat4 worldViewProjection;  
        uniform mat4 fuselageWorld;   
        uniform mat4 invMatrix;       
        
        uniform vec3 fusPos;
        uniform float uTime;
        uniform float uSlider;
        uniform float tunnelLength;
        uniform float beamRadius;
        uniform float realSpeed;
        uniform float particleSize;
        uniform float minBaseAlpha;
        uniform float flowDirection;
        uniform float zOffset;

        // Hardware texture samplers driving the fluid velocity vector arrays
        uniform sampler2D flowClosed;
        uniform sampler2D flowOpen;

        varying vec4 vColor;

        void main() {
            vec3 localPos = position;

            // Apply global transformation offsets to the incoming vertex stream
            localPos.z += zOffset; 
            localPos.y += -0.20; 

            float limit = tunnelLength * 0.5; 
            
            // Map deterministic, continuous lifecycle loops leveraging pseudo-random attributes
            float life = fract((uTime * realSpeed * flowDirection * 0.05) + randomOffset.x);
            localPos.x = mix(9.0, -9.5, life); 

            float dx = localPos.x;
            float dy = localPos.y;
            float dz = localPos.z - zOffset;

            // Evaluate mathematical ellipse intersection boundaries for proxy collision volumes
            float rx = 2.0; 
            float ry = 0.35; 
            float rz = 2.2; 
            float ellipVal = (dx*dx)/(rx*rx) + (dy*dy)/(ry*ry) + (dz*dz)/(rz*rz);
            
            float isHittingPlane = 0.0;
            if (ellipVal <= 0.85) {
                isHittingPlane = 1.0;
                vec3 normal = normalize(vec3(dx / (rx*rx), dy / (ry*ry), dz / (rz*rz)));
                float pushOut = (1.0 - sqrt(ellipVal)) * 0.4;
                localPos.xyz += normal * pushOut;
            }

            dx = localPos.x;
            dy = localPos.y;
            dz = localPos.z - zOffset;

            // Map standard normalized UV data channels for bi-linear texture array lookups
            vec2 uvCoords = vec2((dx / tunnelLength) + 0.5, (dz / 4.0) + 0.5);
            uvCoords.y = 1.0 - uvCoords.y; 

            if(uvCoords.x >= 0.0 && uvCoords.x <= 1.0 && uvCoords.y >= 0.0 && uvCoords.y <= 1.0) {
                vec3 dataClosed = texture(flowClosed, uvCoords).rgb;
                vec3 dataOpen = texture(flowOpen, uvCoords).rgb;
                
                vec3 forceClosed = dataClosed;
                vec3 forceOpen = dataOpen;
                
                // Execute linear interpolation (LERP) across vector arrays via user dashboard interface
                float smoothBlend = smoothstep(0.3, 0.7, uSlider);
                vec3 finalForce = mix(forceClosed, forceOpen, smoothBlend);
                float turbulenceStrength = 1.0 + (uSlider * 4.0);

                localPos.y += finalForce.y * 0.15 * turbulenceStrength * life;
                localPos.z += finalForce.z * 0.01 * turbulenceStrength * life; 
                localPos.x += finalForce.x * 0.05 * turbulenceStrength * life;
            }

            // Transform local particle coordinates into unified world space matrix
            vec4 worldPos = fuselageWorld * vec4(localPos, 1.0);

            float dist = abs(worldPos.x - fusPos.x) / limit;
            float alpha = 1.0;
            if (dist > 0.8) alpha = (1.0 - dist) * 5.0;
            
            // Generate deterministic opacity attenuation ramps across lifecycle keyframes
            if (life < 0.15) {
                float rightFade = life / 0.15;
                alpha *= clamp(rightFade, 0.0, 1.0);
            }
            if (life > 0.85) {
                float leftFade = (1.0 - life) / (1.0 - 0.85);
                alpha *= clamp(leftFade, 0.0, 1.0);
            }

            // Enforce radial falloff limits to eliminate geometry intersection clipping artifacts
            float radialDist = distance(worldPos.yz, fusPos.yz - vec2(0.0, -0.1));
            float fadeEdge = beamRadius * 1.2;
            if (radialDist > fadeEdge) {
                float radialFade = 1.0 - ((radialDist - fadeEdge) / (beamRadius - fadeEdge));
                alpha *= clamp(radialFade, 0.0, 1.0);
            }
            
            // Attenuate dynamic opacity curves depending on input velocity coefficients
            float speedFade = mix(0.4, 0.18, uSlider); 
            float baseAlpha = clamp(alpha * speedFade, minBaseAlpha * (1.0 - uSlider * 0.4), 0.9); 

            // Initialize chromatic PBR color profiles (Neon Blue vs Dynamic Hit Red)
            vec3 neonBlue = vec3(0.0, 0.5, 2.0); 
            vec3 hitRed = vec3(6.5, 0.1, 0.3);
            vec3 finalColor = neonBlue; 

            float speedThreshold = smoothstep(0.3, 0.6, uSlider);

            // Calculate active aerodynamic pressure variance thresholds to drive procedural color shift
            if (ellipVal < 3.0 || (abs(dy) < 0.4 && abs(dz) < 0.6 && dx < 0.0)) {
                float pressure = clamp(speedThreshold * (1.0 - (ellipVal / 3.0)), 0.0, 1.0);
                finalColor = mix(neonBlue, hitRed, pressure);
                
                float proximityFactor = smoothstep(3.0, 0.4, ellipVal) * speedThreshold;
                if (dx < 0.0) proximityFactor = max(proximityFactor, speedThreshold * 0.8);
                finalColor = mix(finalColor, hitRed, proximityFactor);
            }

            if (isHittingPlane > 0.5) {
                finalColor = mix(neonBlue, vec3(6.0, 0.2, 0.4), speedThreshold); 
            }
            
            // Pass values to fragment processing registers and compute dynamic screen projection
            vColor = vec4(finalColor, baseAlpha);
            gl_Position = worldViewProjection * worldPos;
            
            // Scale point sizes inversely against lifecycle square roots to optimize fill-rate budgets
            gl_PointSize = particleSize * (1.0 - (life * life));
        }
    `;

    BABYLON.Effect.ShadersStore["gpuParticleFragmentShader"] = `
        precision highp float;
        varying vec4 vColor;
        void main() {
            gl_FragColor = vColor;
        }
    `;

    // Instantiate custom shader compilation wrapper driven by uniform variables register
    const shaderMaterial = new BABYLON.ShaderMaterial("gpuMat", scene, {
        vertex: "gpuParticle",
        fragment: "gpuParticle",
    }, {
        attributes: ["position", "randomOffset", "particleId"],
        uniforms: ["worldViewProjection", "fuselageWorld", "invMatrix", "fusPos", "uTime", "uSlider", "tunnelLength", "beamRadius", "realSpeed", "particleSize", "minBaseAlpha", "flowDirection", "zOffset"],
        samplers: ["flowClosed", "flowOpen"]
    });

    // Ingest data textures using strict NEAREST sampling filters to maintain vector data layout integrity
    const textureClosed = new BABYLON.Texture("./assets/flow_closed.png", scene, 
        false, 
        false, 
        BABYLON.Constants.TEXTURE_NEAREST_SAMPLINGMODE
    );

    const textureOpen = new BABYLON.Texture("./assets/flow_open.png", scene, 
        false, 
        false, 
        BABYLON.Constants.TEXTURE_NEAREST_SAMPLINGMODE
    );


    // Enforce linear mathematical color space by disabling gamma space normalization
    // This preserves raw fluid vector telemetry layout data and limits engine lighting bias
    textureClosed.gammaSpace = false;
    textureOpen.gammaSpace = false;

    // Bind non-interpolated data fields directly to the global fragment uniform stack
    shaderMaterial.setTexture("flowClosed", textureClosed);
    shaderMaterial.setTexture("flowOpen", textureOpen);
    
    shaderMaterial.pointsCloud = true;
    shaderMaterial.pointSize = CONFIG.particleSize;
    shaderMaterial.alphaMode = BABYLON.Engine.ALPHA_COMBINE;
    shaderMaterial.backFaceCulling = false;
    shaderMaterial.disableDepthWrite = false;
    customMesh.renderingGroupId = 1;
    customMesh.material = shaderMaterial;
    
    let startTime = performance.now();
    const fpsText = document.getElementById("fps"); 

    // Initialize execution loop callback prior to rendering the active viewport matrix
    scene.registerBeforeRender(() => {
        let elapsedTime = (performance.now() - startTime) / 1000;
        camLight.position.copyFrom(camera.position);
        
        if (Fuselage) {
            // Compute real-time transform boundaries and execute analytical matrix inversions
            Fuselage.computeWorldMatrix(true);
            Fuselage.getWorldMatrix().invertToRef(invMat);
            
            shaderMaterial.setMatrix("fuselageWorld", Fuselage.getWorldMatrix());
            shaderMaterial.setMatrix("invMatrix", invMat);
            shaderMaterial.setVector3("fusPos", Fuselage.getAbsolutePosition());
        }
        
        // Synchronize environment vectors and time coefficients with the dynamic vertex shader
        shaderMaterial.setMatrix("worldViewProjection", scene.getTransformMatrix());
        shaderMaterial.setFloat("uTime", elapsedTime);
        shaderMaterial.setFloat("uSlider", currentMix);
        
        shaderMaterial.setFloat("tunnelLength", CONFIG.tunnelLength);
        shaderMaterial.setFloat("beamRadius", CONFIG.beamRadius);
        shaderMaterial.setFloat("realSpeed", CONFIG.baseSpeed + (currentMix * (CONFIG.turboSpeed - CONFIG.baseSpeed)));
        
        // Execute dynamic point cloud runtime expansion routines depending on turbulence coefficients
        let dynamicSize = 0.4 + (currentMix * 0.8); 
        shaderMaterial.setFloat("particleSize", dynamicSize);
        shaderMaterial.pointSize = dynamicSize; 
        
        // Attenuate transparency scales inside the alpha compositing pipeline as velocity increases
        let dynamicAlpha = 0.15 + (currentMix * 0.30);
        shaderMaterial.setFloat("minBaseAlpha", dynamicAlpha);
        
        // Apply spatial boundary translations along the localized Z-axis to simulate wake vortices
        let dynamicZOffset = CONFIG.zOffset - (currentMix * 0.5); 
        shaderMaterial.setFloat("zOffset", -0.6);
        shaderMaterial.setFloat("flowDirection", CONFIG.flowDirection);
        
        if (fpsText) fpsText.innerText = engine.getFps().toFixed(0);
    });

    // ============================================================================
    // DOM HARDWARE INPUT CONTROL MONITOR & REAL-TIME TELEMETRY CALCULATOR
    // ============================================================================
    const slider = document.getElementById("brakeSlider");
    const windSpeedText = document.getElementById("wind-speed-text");
    const reynoldsText = document.getElementById("reynolds-text");
    const flowStatusText = document.getElementById("flow-status-text");
    const vortexText = document.getElementById("vortex-text");
    
    if(slider) {
        slider.oninput = function() {
            currentMix = parseFloat(this.value);
            let currentWindSpeed = 1 + (currentMix * 999);
            
            // Render physical aerospace attributes directly into responsive UI containers
            windSpeedText.innerText = `${currentWindSpeed.toFixed(1)} m/s`;
            reynoldsText.innerText = `${(currentWindSpeed * 75000).toExponential(2).toUpperCase()}`;
            
            // Map state changes across distinct boundary thresholds for aerodynamic evaluation
            if (currentMix < 0.1) {
                flowStatusText.innerHTML = "<span>FLOW REGIME: LAMINAR</span>";
                flowStatusText.className = "stat active-stat";
                vortexText.innerText = "VORTEX INTENSITY: 0%";
            } else if (currentMix >= 0.1 && currentMix < 0.6) {
                flowStatusText.innerHTML = `<span>FLOW REGIME: BUFFETING (${(currentMix * 100).toFixed(0)}%)</span>`;
                flowStatusText.className = "stat";
                flowStatusText.style.color = "#ffaa00";
                vortexText.innerText = `VORTEX INTENSITY: ${(currentMix * 80 + Math.random() * 4).toFixed(1)}%`;
                vortexText.style.color = "#ccc";
            } else {
                flowStatusText.innerHTML = "<span>FLOW REGIME: MAX TURBULENCE</span>";
                flowStatusText.className = "stat danger-stat";
                flowStatusText.style.color = "";
                vortexText.innerText = `VORTEX INTENSITY: ${(90 + Math.random() * 8).toFixed(1)}%`;
                vortexText.style.color = "#ff2a55";
            }
            
            // Synchronize skeleton animation keyframes seamlessly with the user input value matrix
            brakeGroups.forEach(group => { group.pause(); group.goToFrame(group.from + currentMix * (group.to - group.from)); });
            fanGroups.forEach(group => { group.speedRatio = 1.0 + (currentMix * 4.0); });
        };
    }
    
    currentScene = scene;
};

// Initialize global engine lifecycles
createScene();
window.addEventListener("resize", function () { engine.resize(); });
engine.runRenderLoop(function () { if (currentScene) currentScene.render(); });
