// ============================================================================
// CORE VIEWPORT RENDERING CONTEXT & GLOBAL CONTROL SELECTION REGISTERS
// ============================================================================

const canvas = document.getElementById("renderCanvas");
const engine = new BABYLON.Engine(canvas, true);

let currentScene = null;
let isWireframe = false;

const isMobileDevice = window.innerWidth < 768;

const CONFIG = {
    particleCount: isMobileDevice ? 8000 : 60000,         
    particleSize: 0.05,                 
    beamRadius: 3.5,                 
    tunnelLength: 8.0,
    baseSpeed: 18.0,
    turboSpeed: 50.0,
    zOffset: -0.6,
    minBaseAlpha: 0.5,
    flowDirection: 1
};

let currentMix = 0.0;
const fanGroups = [];
const brakeGroups = [];
const invMat = new BABYLON.Matrix(); 
let particlePhase = 0; // FIKS: Akumulator za tečnu brzinu partikala (sprečava skokove)

// ============================================================================
// ENVIRONMENT OVERRIDES & RENDER CONFIGURATION REGISTER
// ============================================================================

const wireframeBtn = document.getElementById("wireframe-btn");
if (wireframeBtn) {
    wireframeBtn.onclick = () => {
        isWireframe = !isWireframe;
        
        wireframeBtn.style.color = isWireframe ? "#ffffff" : "#aaa";
        wireframeBtn.style.borderColor = isWireframe ? "#ffffff" : "rgba(255,255,255,0.1)";

        if (currentScene) {
            currentScene.materials.forEach(mat => { 
                // Ignorišemo gpuMat (partikli) i inkMat (pozadina)
                if (mat && mat.name !== "gpuMat" && mat.name !== "inkMat") {
                    mat.wireframe = isWireframe; 
                }
            });
        }
    };
}

// ============================================================================
// INK BACKGROUND SHADER (Samo za Desktop)
// ============================================================================
if (!isMobileDevice) {
    BABYLON.Effect.ShadersStore["inkVertexShader"] = `
        precision highp float;
        attribute vec3 position;
        attribute vec2 uv;
        uniform mat4 worldViewProjection;
        varying vec2 vUv;

        void main() {
            gl_Position = worldViewProjection * vec4(position, 1.0);
            vUv = uv;
        }
    `;

    BABYLON.Effect.ShadersStore["inkFragmentShader"] = `
        precision highp float;
        varying vec2 vUv;
        uniform float time;
        uniform float speed;
        
        float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

        float noise(vec2 p) {
            vec2 i = floor(p); vec2 f = fract(p);
            f = f * f * (3.0 - 2.0 * f);
            float a = hash(i); float b = hash(i + vec2(1.0, 0.0));
            float c = hash(i + vec2(0.0, 1.0)); float d = hash(i + vec2(1.0, 1.0));
            return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
        }

        float fbm(vec2 p) {
            float f = 0.0; float amp = 0.5;
            for(int i = 0; i < 2; i++) {
                f += amp * noise(p); p *= 2.0; amp *= 0.5;
            }
            return f;
        }

        void main() {
            vec2 p = vUv * 2.0 - 1.0;
            vec2 scaledP = p * 1.8; 
            
            float dynamicTime = time * (1.0 + speed * 2.5);
            vec2 flowP = scaledP + vec2(0.0, dynamicTime * 0.4); 
            
            vec2 q = vec2(0.0);
            q.x = fbm(flowP + 0.05 * dynamicTime);
            q.y = fbm(flowP + vec2(1.0) + 0.05 * dynamicTime);

            vec2 r = vec2(0.0);
            r.x = fbm(flowP + 2.0 * q + vec2(1.7, 9.2) + 0.05 * dynamicTime);
            r.y = fbm(flowP + 2.0 * q + vec2(8.3, 2.8) + 0.05 * dynamicTime);

            float f = fbm(flowP + r);
            float fluidContrast = smoothstep(0.2, 0.8, f);
            float centerMask = smoothstep(0.45, 0.0, abs(p.x)); 
            fluidContrast *= centerMask;

            vec3 color = mix(
                vec3(0.002, 0.003, 0.008), 
                vec3(0.02, 0.12, 0.38),     
                fluidContrast
            );

            gl_FragColor = vec4(color, 1.0);
        }
    `;
}

const createScene = async function () {
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) loadingScreen.style.display = 'flex';

    const scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color4(0.01, 0.01, 0.01, 1);
    scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
    scene.fogColor = new BABYLON.Color3(0.01, 0.01, 0.01);
    scene.fogDensity = 0.0001; 

    fetch("./assets/dron.glb", { method: 'HEAD' })
        .then(response => {
            const bytes = response.headers.get("content-length");
            if (bytes) {
                const mb = (bytes / (1024 * 1024)).toFixed(2);
                const sizeElement = document.getElementById("fileSize");
                if (sizeElement) sizeElement.innerText = `${mb} MB`;
            }
        }).catch(() => {});

    scene.imageProcessingConfiguration.toneMappingEnabled = true;
    scene.imageProcessingConfiguration.toneMappingType = BABYLON.ImageProcessingConfiguration.TONEMAPPING_ACES;
    scene.imageProcessingConfiguration.exposure = 1.0;
    scene.imageProcessingConfiguration.contrast = 2.00;

    scene.environmentTexture = BABYLON.CubeTexture.CreateFromPrefilteredData("https://assets.babylonjs.com/environments/studio.env", scene);
    scene.environmentIntensity = 1.2;

    const glowLayer = new BABYLON.GlowLayer("glow", scene);
    glowLayer.intensity = 0.75; 

    // ============================================================================
    // LUMINANCE ARCHITECTURE
    // ============================================================================

    const hemi = new BABYLON.HemisphericLight("hemi", new BABYLON.Vector3(0, 1, 0), scene);
    hemi.intensity = 0.15;
    hemi.diffuse = new BABYLON.Color3(0.1, 0.1, 0.15); 

    const rimLight = new BABYLON.DirectionalLight("rimLight", new BABYLON.Vector3(0.45, -0.8, -0.2), scene);
    rimLight.position = new BABYLON.Vector3(0.0, 5.0, -8.0); 
    rimLight.diffuse = new BABYLON.Color3(1.0, 1.0, 1.5); 
    rimLight.specular = new BABYLON.Color3(1.0, 0.4, 0.4); 
    rimLight.intensity = 1.05; 

    const shadowGenerator = new BABYLON.ShadowGenerator(2048, rimLight);
    shadowGenerator.usePercentageCloserFiltering = true;
    shadowGenerator.setDarkness(0.5);

    // ============================================================================
    // TRANSFORMATION HIERARCHY & CAMERA (Identična za Desktop i Mobilne)
    // ============================================================================
    scene.collisionsEnabled = true;

    const cameraTarget = new BABYLON.Vector3(0, -0.3, -1); 
    const initialRadius = isMobileDevice ? 8.2 : 6.2; // Blago prilagođena udaljenost za staklo mobilnog
    const initialAlpha = 0; 
    const initialBeta = 1.25;  

    const camera = new BABYLON.ArcRotateCamera("cam", initialAlpha, initialBeta, initialRadius, cameraTarget, scene);
    camera.attachControl(canvas, true);
    camera.minZ = 0.01; 

    if (!isMobileDevice) {
        camera.targetScreenOffset = new BABYLON.Vector2(0.55, 0);
    }

    if (isMobileDevice) {
        camera.fovMode = BABYLON.ArcRotateCamera.FOVMODE_VERTICAL_FIXED;
        camera.fov = 0.90; 
    } else {
        camera.fovMode = BABYLON.ArcRotateCamera.FOVMODE_HORIZONTAL_FIXED;
        camera.fov = 1.15;  
    }

    camera.lowerBetaLimit = 0.1; 
    camera.upperBetaLimit = Math.PI - 0.1; 
    camera.lowerAlphaLimit = null; 
    camera.upperAlphaLimit = null; 

    camera.panningSensibility = 0; 
    camera.inertialPanningX = 0;
    camera.inertialPanningY = 0;
    camera.wheelPrecision = 60;
    
    camera.lowerRadiusLimit = 3.0;
    camera.upperRadiusLimit = isMobileDevice ? 12.0 : 6.0; 

    const camLight = new BABYLON.PointLight("camLight", camera.position, scene);
    camLight.parent = camera;
    camLight.intensity = 0.6; 
    camLight.diffuse = new BABYLON.Color3(0.9, 0.95, 1.0);

    // ============================================================================
    // INK PLANE KREIRANJE (Samo za Desktop)
    // ============================================================================
    let inkMat = null;

    if (!isMobileDevice) {
        const inkPlane = BABYLON.MeshBuilder.CreatePlane("inkPlane", { size: 150 }, scene);
        inkPlane.parent = camera; 
        inkPlane.position.z = 40; 
        inkPlane.renderingGroupId = 0; 
        inkPlane.isPickable = false; 
        
        inkMat = new BABYLON.ShaderMaterial("inkMat", scene, {
            vertex: "ink",
            fragment: "ink",
        }, {
            attributes: ["position", "uv"],
            uniforms: ["worldViewProjection", "time", "mixLevel"]
        });
        inkMat.backFaceCulling = false;
        inkMat.disableLighting = true;
        inkMat.depthFunction = BABYLON.Engine.ALWAYS;
        inkPlane.material = inkMat;
    }

    // ============================================================================
    // DRONE 
    // ============================================================================
    const result = await BABYLON.SceneLoader.ImportMeshAsync("", "./assets/", "dron.glb", scene);
    if (loadingScreen) loadingScreen.style.display = 'none';
    
    let Fuselage = scene.getMeshByName("Fuselage") || scene.getMeshByName("fuselage") || result.meshes[0];
    if (Fuselage) {
        shadowGenerator.addShadowCaster(Fuselage, true); 
    }

    Fuselage.getChildMeshes().forEach(child => {
        child.lightSources = scene.lights;
        if (child.material) {
            child.material.lightingEnabled = true;
            child.material.environmentTexture = scene.environmentTexture;
        }
        child.renderingGroupId = 1; 
    });
 
    scene.materials.forEach((mat) => {
        if (mat instanceof BABYLON.PBRMaterial) {
            mat.emissiveColor = new BABYLON.Color3(1.0, 1.0, 1.0); 
            mat.emissiveIntensity = 6.5; 
            mat.useEmissiveAsIllumination = true;
            mat.environmentTexture = scene.environmentTexture;
            mat.lightingEnabled = true;
        }
    });

    let trisSum = 0;
    let vertsSum = 0;
    result.meshes.forEach(m => {
        if (m.geometry) {
            trisSum += m.getIndices().length / 3;
            vertsSum += m.getTotalVertices();
        }
    });
    
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
    // PROCEDURAL GPU BUFFER ALLOCATION
    // ============================================================================
    const positions = new Float32Array(CONFIG.particleCount * 3);
    const randomOffsets = new Float32Array(CONFIG.particleCount * 3);
    const particleIds = new Float32Array(CONFIG.particleCount);

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

    const customMesh = new BABYLON.Mesh("gpuParticles", scene);
    const vertexData = new BABYLON.VertexData();
    const indices = new Int32Array(CONFIG.particleCount);
    for (let i = 0; i < CONFIG.particleCount; i++) indices[i] = i;

    vertexData.positions = positions;
    vertexData.indices = indices;
    vertexData.applyToMesh(customMesh);
    customMesh.setVerticesData("randomOffset", randomOffsets, false, 3);
    customMesh.setVerticesData("particleId", particleIds, false, 1);

    // ============================================================================
    // HIGH-PERFORMANCE CUSTOM GLSL VERTEX SHADER
    // ============================================================================
    
    BABYLON.Effect.ShadersStore["gpuParticleVertexShader"] = `
        precision highp float;
        attribute vec3 position;
        attribute vec3 randomOffset;
        attribute float particleId;

        uniform mat4 worldViewProjection;  
        uniform mat4 fuselageWorld;   
        uniform mat4 invMatrix;       
        
        uniform vec3 fusPos;
        uniform float uPhase; 
        uniform float uSlider;
        uniform float tunnelLength;
        uniform float beamRadius;
        uniform float particleSize;
        uniform float minBaseAlpha;
        uniform float zOffset;

        uniform sampler2D flowClosed;
        uniform sampler2D flowOpen;

        varying vec4 vColor;

        void main() {
            vec3 localPos = position;
            localPos.z += zOffset; 
            localPos.y += -0.20; 
            float limit = tunnelLength * 0.5; 
            
            float life = fract(uPhase + randomOffset.x);
            localPos.x = mix(9.0, -9.5, life); 

            float dx = localPos.x;
            float dy = localPos.y;
            float dz = localPos.z - zOffset;

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

            vec2 uvCoords = vec2((dx / tunnelLength) + 0.5, (dz / 4.0) + 0.5);
            uvCoords.y = 1.0 - uvCoords.y; 

            if(uvCoords.x >= 0.0 && uvCoords.x <= 1.0 && uvCoords.y >= 0.0 && uvCoords.y <= 1.0) {
                vec3 forceClosed = texture(flowClosed, uvCoords).rgb;
                vec3 forceOpen = texture(flowOpen, uvCoords).rgb;
                
                float smoothBlend = smoothstep(0.3, 0.7, uSlider);
                vec3 finalForce = mix(forceClosed, forceOpen, smoothBlend);
                float turbulenceStrength = 1.0 + (uSlider * 4.0);

                localPos.y += finalForce.y * 0.15 * turbulenceStrength * life;
                localPos.z += finalForce.z * 0.01 * turbulenceStrength * life; 
                localPos.x += finalForce.x * 0.05 * turbulenceStrength * life;
            }

            vec4 worldPos = fuselageWorld * vec4(localPos, 1.0);

            float dist = abs(worldPos.x - fusPos.x) / limit;
            float alpha = 1.0;
            if (dist > 0.8) alpha = (1.0 - dist) * 5.0;
            
            if (life < 0.15) {
                float rightFade = life / 0.15;
                alpha *= clamp(rightFade, 0.0, 1.0);
            }
            if (life > 0.85) {
                float leftFade = (1.0 - life) / (1.0 - 0.85);
                alpha *= clamp(leftFade, 0.0, 1.0);
            }

            float radialDist = distance(worldPos.yz, fusPos.yz - vec2(0.0, -0.1));
            float fadeEdge = beamRadius * 1.2;
            if (radialDist > fadeEdge) {
                float radialFade = 1.0 - ((radialDist - fadeEdge) / (beamRadius - fadeEdge));
                alpha *= clamp(radialFade, 0.0, 1.0);
            }
            
            float speedFade = mix(0.4, 0.18, uSlider); 
            float baseAlpha = clamp(alpha * speedFade, minBaseAlpha * (1.0 - uSlider * 0.4), 0.9); 

            float randSizeMultiplier = mix(0.7, 1.1, randomOffset.y);
            baseAlpha *= mix(0.4, 1.0, randomOffset.z);

            vec3 neonBlue = vec3(0.0, 0.5, 2.0); 
            vec3 hitRed = vec3(14.0, 0.3, 0.15);
            vec3 finalColor = neonBlue; 

            float speedThreshold = smoothstep(0.3, 0.6, uSlider);

            if (ellipVal < 3.0 || (abs(dy) < 0.4 && abs(dz) < 0.6 && dx < 0.0)) {
                float pressure = clamp(speedThreshold * (1.0 - (ellipVal / 3.0)), 0.0, 1.0);
                finalColor = mix(neonBlue, hitRed, pressure);
                
                float proximityFactor = smoothstep(3.0, 0.4, ellipVal) * speedThreshold;
                if (dx < 0.0) proximityFactor = max(proximityFactor, speedThreshold * 0.8);
                finalColor = mix(finalColor, hitRed, proximityFactor);
                
                baseAlpha = mix(baseAlpha, 1.0, pressure);
                randSizeMultiplier *= (1.0 + pressure * 0.2); 
            }

            if (isHittingPlane > 0.5) {
                finalColor = mix(neonBlue, vec3(12.0, 0.1, 0.3), speedThreshold); 
                baseAlpha = 1.0;
                randSizeMultiplier *= 1.2; 
            }
            
            vColor = vec4(finalColor, baseAlpha);
            gl_Position = worldViewProjection * worldPos;
            
            float finalSize = particleSize * randSizeMultiplier * (1.0 - (life * life));
            gl_PointSize = max(finalSize, 1.0);
        }
    `;

    BABYLON.Effect.ShadersStore["gpuParticleFragmentShader"] = `
        precision highp float;
        varying vec4 vColor;
        void main() {
            gl_FragColor = vColor;
        }
    `;

    const shaderMaterial = new BABYLON.ShaderMaterial("gpuMat", scene, {
        vertex: "gpuParticle",
        fragment: "gpuParticle",
    }, {
        attributes: ["position", "randomOffset", "particleId"],
        uniforms: ["worldViewProjection", "fuselageWorld", "invMatrix", "fusPos", "uPhase", "uSlider", "tunnelLength", "beamRadius", "particleSize", "minBaseAlpha", "zOffset"],
        samplers: ["flowClosed", "flowOpen"]
    });

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

    textureClosed.gammaSpace = false;
    textureOpen.gammaSpace = false;

    shaderMaterial.setTexture("flowClosed", textureClosed);
    shaderMaterial.setTexture("flowOpen", textureOpen);
    
    shaderMaterial.pointsCloud = true;
    shaderMaterial.pointSize = CONFIG.particleSize;
    shaderMaterial.alphaMode = BABYLON.Engine.ALPHA_ADD; 
    shaderMaterial.backFaceCulling = false;
    shaderMaterial.disableDepthWrite = true; 
    customMesh.renderingGroupId = 1;
    customMesh.material = shaderMaterial;
    
    let startTime = performance.now();
    const fpsText = document.getElementById("fps"); 

    scene.registerBeforeRender(() => {
        let elapsedTime = (performance.now() - startTime) / 1000;
        let dt = engine.getDeltaTime() / 1000.0;
        
        camLight.position.copyFrom(camera.position);
        
        if (Fuselage) {
            Fuselage.computeWorldMatrix(true);
            Fuselage.getWorldMatrix().invertToRef(invMat);
            
            shaderMaterial.setMatrix("fuselageWorld", Fuselage.getWorldMatrix());
            shaderMaterial.setMatrix("invMatrix", invMat);
            shaderMaterial.setVector3("fusPos", Fuselage.getAbsolutePosition());
        }
        
        let currentRealSpeed = CONFIG.baseSpeed + (currentMix * (CONFIG.turboSpeed - CONFIG.baseSpeed));
        particlePhase += dt * currentRealSpeed * CONFIG.flowDirection * 0.05;
        
        shaderMaterial.setMatrix("worldViewProjection", scene.getTransformMatrix());
        shaderMaterial.setFloat("uPhase", particlePhase);
        shaderMaterial.setFloat("uSlider", currentMix);
        
        // Ažuriranje Ink Pozadine samo ako postoji (na desktopu)
        if (inkMat) {
            inkMat.setFloat("time", elapsedTime);
            inkMat.setFloat("mixLevel", currentMix);
        }

        shaderMaterial.setFloat("tunnelLength", CONFIG.tunnelLength);
        shaderMaterial.setFloat("beamRadius", CONFIG.beamRadius);
        
        let hardwareDpr = window.devicePixelRatio || 2.0;
        let responsiveScale;

        if (window.innerWidth < 768) {
            responsiveScale = (1.0 / hardwareDpr) * 0.7; 
        } else if (window.innerWidth >= 768 && window.innerWidth < 1200) {
            responsiveScale = (1.0 / hardwareDpr) * 1.8; 
        } else {
            responsiveScale = 1.0;
        }

        let dynamicSize = (0.4 + (currentMix * 0.8)) * responsiveScale; 
        shaderMaterial.setFloat("particleSize", dynamicSize);
        
        let dynamicAlpha = 0.15 + (currentMix * 0.30);
        shaderMaterial.setFloat("minBaseAlpha", dynamicAlpha);
        
        shaderMaterial.setFloat("zOffset", -0.6);
        
        if (fpsText) fpsText.innerText = engine.getFps().toFixed(0);
    });

    // ============================================================================
    // DOM HARDWARE INPUT CONTROL & SLIDER 
    // ============================================================================
    const slider = document.getElementById("brakeSlider");
    const windSpeedText = document.getElementById("wind-speed-text");
    const reynoldsText = document.getElementById("reynolds-text");
    const flowStatusText = document.getElementById("flow-status-text");
    const vortexText = document.getElementById("vortex-text");
    
    if(slider) {
        slider.addEventListener("input", function() {
            currentMix = parseFloat(this.value);
            let currentWindSpeed = 1 + (currentMix * 999);
            
            if (windSpeedText) windSpeedText.innerText = `${currentWindSpeed.toFixed(1)} M/S`;
            if (reynoldsText) reynoldsText.innerText = `${(currentWindSpeed * 75000).toExponential(2).toUpperCase()}`;
            
            if (currentMix < 0.1) {
                if (flowStatusText) flowStatusText.innerText = "LAMINAR";
                if (vortexText) vortexText.innerText = "0%";
            } else if (currentMix >= 0.1 && currentMix < 0.6) {
                if (flowStatusText) flowStatusText.innerText = `BUFFETING (${(currentMix * 100).toFixed(0)}%)`;
                if (vortexText) vortexText.innerText = `${(currentMix * 80 + Math.random() * 4).toFixed(1)}%`;
            } else {
                if (flowStatusText) flowStatusText.innerText = "MAX TURBULENCE";
                if (vortexText) vortexText.innerText = `${(90 + Math.random() * 8).toFixed(1)}%`;
            }
            
            brakeGroups.forEach(group => { 
                group.pause(); 
                group.goToFrame(group.from + currentMix * (group.to - group.from)); 
            });
            
            fanGroups.forEach(group => { 
                group.speedRatio = 1.0 + (currentMix * 4.0); 
            });
        });
    }
    
    currentScene = scene;
};

// ============================================================================
// INITIALIZE GLOBAL ENGINE LIFECYCLES
// ============================================================================
createScene();
window.addEventListener("resize", function () { engine.resize(); });
engine.runRenderLoop(function () { if (currentScene) currentScene.render(); });