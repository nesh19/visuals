// ============================================================================
// CORE VIEWPORT RENDERING CONTEXT & GLOBAL CONTROL SELECTION REGISTERS
// ============================================================================

const { 
    Engine, Scene, UniversalCamera, Vector3, MeshBuilder, 
    Color4, ShaderMaterial, Vector2, Effect, SceneLoader,
    StandardMaterial, Color3
} = window.BABYLON;

import { inkVertexShader, inkFragmentShader } from "./shaders/inkShader.js";
import { haloVertexShader, haloFragmentShader } from "./shaders/haloShader.js";

// Init canvas and engine
const canvas = document.getElementById("renderCanvas");
const engine = new Engine(canvas, true, { antialias: true });

const createScene = function () {
    const scene = new Scene(engine);
    
    // Crna pozadina
    scene.clearColor = new Color4(0.0, 0.0, 0.0, 1.0); 
    
    // ACES Tone Mapping podešavanje za bioskopski kvalitet
    scene.imageProcessingConfiguration.toneMappingEnabled = true;
    scene.imageProcessingConfiguration.toneMappingType = window.BABYLON.ImageProcessingConfiguration.TONEMAPPING_ACES;

    // ============================================================================
    // UNIVERSAL CAMERA SPECIFICATION & OPTICAL TARGETS
    // ============================================================================
    const camera = new UniversalCamera("mainCamera", new Vector3(0, 0, -20), scene);
    camera.setTarget(Vector3.Zero());

    camera.fov = 0.8; 

    const updateCameraFOV = () => {
        if (engine.getRenderWidth() < engine.getRenderHeight()) {
            camera.fovMode = window.BABYLON.Camera.FOVMODE_HORIZONTAL_FIXED;
        } else {
            camera.fovMode = window.BABYLON.Camera.FOVMODE_VERTICAL_FIXED;
        }
    };
    updateCameraFOV();

    // ============================================================================
    // SISTEM OSVJETLJENJA I OKRUŽENJA (PBR HDRI + Camera Light)
    // ============================================================================
    const hdrTexture = BABYLON.CubeTexture.CreateFromPrefilteredData("./assets/abstract2.env", 
    scene
    );
    hdrTexture.rotationY = 3.14;
    scene.environmentTexture = hdrTexture;


    // ============================================================================
    // PROCEDURAL FLUID INK BUFFER & SCREEN GRAPH PIPELINE
    // ============================================================================
    const backgroundQuad = MeshBuilder.CreatePlane("backgroundQuad", { size: 200 }, scene);
    backgroundQuad.parent = camera;
    backgroundQuad.position = new Vector3(0, 0, 50); 
    backgroundQuad.isPickable = false; 
    
    Effect.ShadersStore["inkVertexShader"] = inkVertexShader;
    Effect.ShadersStore["inkFragmentShader"] = inkFragmentShader;

    const inkMaterial = new ShaderMaterial("inkMaterial", scene, {
        vertex: "ink",
        fragment: "ink",
    }, {
        attributes: ["position", "uv"],
        uniforms: ["worldViewProjection", "time", "mouseTrailX", "mouseTrailY", "resolution"]
    });
    
    backgroundQuad.material = inkMaterial;

    // ============================================================================
    // NOISE HALO SHADER ARCHITECTURE & ALPHA BLENDING SETUP
    // ============================================================================
    Effect.ShadersStore["haloVertexShader"] = haloVertexShader;
    Effect.ShadersStore["haloFragmentShader"] = haloFragmentShader;

    const haloQuad = MeshBuilder.CreatePlane("haloQuad", { size: 7 }, scene); 
    haloQuad.parent = camera;
    haloQuad.position = new Vector3(0, 0, 8); 
    haloQuad.isPickable = false;

    const haloMaterial = new ShaderMaterial("haloMaterial", scene, {
        vertex: "halo",
        fragment: "halo",
    }, {
        attributes: ["position", "uv"],
        uniforms: ["worldViewProjection", "time"],
        needAlphaBlending: true 
    });

    haloQuad.material = haloMaterial;

    // ============================================================================
    // REAL-TIME ENVIRONMENT PROBE 
    // ============================================================================
    const probe = new window.BABYLON.ReflectionProbe("probe", 512, scene);
    probe.renderList.push(backgroundQuad);
    probe.renderList.push(haloQuad);
    probe.position = new Vector3(0, 0, -12); 
    

    // ============================================================================
    // SOLID VOLUME PBR GLASS 
    // ============================================================================
    const baseGlassMat = new window.BABYLON.PBRMaterial("baseGlassMat", scene);
    
    baseGlassMat.transparencyMode = 0; 
    baseGlassMat.alpha = 1.0; 
    baseGlassMat.backFaceCulling = true; 
    
    baseGlassMat.metallic = 0.4;
    baseGlassMat.roughness = 0.3; 
    baseGlassMat.albedoColor = new Color3(0.1, 0.1, 0.1); 
    
    baseGlassMat.clearCoat.isEnabled = true;
    baseGlassMat.clearCoat.intensity = 0.75;
    baseGlassMat.clearCoat.roughness = 0.002; 

    baseGlassMat.environmentIntensity = 5.5;
    
    baseGlassMat.subSurface.isRefractionEnabled = true;
    baseGlassMat.subSurface.refractionTexture = probe.cubeTexture; 
    baseGlassMat.subSurface.refractionIntensity = 2.2; 
    baseGlassMat.subSurface.indexOfRefraction = 1.15; 
    baseGlassMat.subSurface.maximumThickness = 4.0; 
    baseGlassMat.subSurface.useThicknessAsDepth = true;
    baseGlassMat.subSurface.tintColor = new Color3(0.9, 0.9, 1.0); 
    baseGlassMat.subSurface.isTranslucencyEnabled = true;
    baseGlassMat.subSurface.translucencyIntensity = 0.55;
    
    baseGlassMat.iridescence.isEnabled = true;
    baseGlassMat.iridescence.intensity = 1.0;
    baseGlassMat.iridescence.indexOfRefraction = 0.9;

    // ============================================================================
    // GEOMETRIC BOUNDING BOX & HARDWARE PIVOT CENTERING
    // ============================================================================
    const centrirajPivotObjekta = (rootMesh) => {
        const childMeshes = rootMesh.getChildMeshes(false, (node) => node.isVisible);
        if (childMeshes.length === 0) return;

        let min = new Vector3(Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE);
        let max = new Vector3(-Number.MAX_VALUE, -Number.MAX_VALUE, -Number.MAX_VALUE);
        let hasGeometry = false;

        childMeshes.forEach(m => {
            if (m.getTotalVertices() > 0) {
                m.computeWorldMatrix(true);
                const meshMin = m.getBoundingInfo().boundingBox.minimumWorld;
                const meshMax = m.getBoundingInfo().boundingBox.maximumWorld;
                min = Vector3.Minimize(min, meshMin);
                max = Vector3.Maximize(max, meshMax);
                hasGeometry = true;
            }
        });

        if (hasGeometry) {
            const centar = Vector3.Center(min, max);
            rootMesh.setPivotPoint(centar, window.BABYLON.Space.WORLD);
            rootMesh.position.x = 0;
            rootMesh.position.y = 0; 
        }
    };

    // ============================================================================
    // UNIVERZALNA FUNKCIJA SA AUTOMATSKIM RE-PIVOTING PIPELINE-OM
    // ============================================================================
    const processLoadedModel = (result, zPosition, targetMeshName, scaleFactor = 1.0) => {
        const root = result.meshes[0];
        root.scaling = new Vector3(scaleFactor, scaleFactor, scaleFactor);
        
        // Pretvaramo parametar u niz malih slova radi lakšeg poređenja
        const allowedKeywords = Array.isArray(targetMeshName) 
            ? targetMeshName.map(name => name.toLowerCase())
            : [targetMeshName.toLowerCase()];

        for (let mesh of result.meshes) {
            const meshNameLower = mesh.name.toLowerCase();
            
            // Proveravamo da li naziv mesha sadrži bilo koju od navedenih reči
            const isAllowed = allowedKeywords.some(keyword => meshNameLower.includes(keyword));

            if (mesh.name !== "__root__" && !isAllowed) {
                mesh.isVisible = false;
                mesh.setEnabled(false); 
                mesh.isPickable = false;
                continue;
            }
            if (mesh.getTotalVertices() > 0) {
                mesh.hasVertexAlpha = false; 
                mesh.useVertexColors = false; 
                mesh.material = baseGlassMat;
                mesh.isPickable = true;
            }
        }
        centrirajPivotObjekta(root);
        root.position.z = zPosition;
        return root;
    };

    // ============================================================================
    // PIPELINE ZA UČITAVANJE ASINKRONIH GEOMETRIJSKIH JEDINICA
    // ============================================================================
    const models = [null, null, null];
    
    // MODEL 0: Human Stress 
    SceneLoader.ImportMeshAsync("", "cortisol/assets/", "human_stress_v01.glb", scene).then((result) => {
        const root = processLoadedModel(result, -12, "mesh_heart", 26);
        root.position.y = 0.1;
        root.setEnabled(false);
        models[0] = root;
    }).catch(err => console.error("Error loading Stress model:", err));

    // MODEL 1: Craniofacial Morph Viewer 
    SceneLoader.ImportMeshAsync("", "craniofacial/assets/", "anatomical-morph-viewer.glb", scene).then((result) => {
        const root = processLoadedModel(result, -12, "mesh_head", 10);
        root.setEnabled(false);
        models[1] = root;
    }).catch(err => console.error("Error loading Craniofacial model:", err));

    // MODEL 2: Dron 
    SceneLoader.ImportMeshAsync("", "windtunnel/assets/", "dron.glb", scene).then((result) => {
        const root = processLoadedModel(result, -12, "fuselage",  1.0); 
        root.position.x = 0.5;
        root.setEnabled(false);
        models[2] = root;
    }).catch(err => console.error("Error loading Drone:", err));

    // ============================================================================
    // 7. INPUT SCROLL MECHANICS & TIMING CONTEXT REGISTER
    // ============================================================================
    let time = 0;
    const resolution = new Vector2(engine.getRenderWidth(), engine.getRenderHeight());
    
    const trailLength = 10;
    const mouseTrailX = new Float32Array(trailLength).fill(-10.0);
    const mouseTrailY = new Float32Array(trailLength).fill(-10.0);
    
    let targetScroll = 0;
    let currentScroll = 0;
    let activeModelIndex = 0;
    
    // VARIJABLE ZA KONTROLU UI STANJA
    let interakcijaUToku = false; 
    let originalnaSkala = null;
    let trenutniKliknutiModel = null;
    
    window.addEventListener("wheel", (e) => {
        // Blokiramo skrol ukoliko smo ušli u model
        if (!interakcijaUToku) {
            targetScroll += e.deltaY * 0.004; 
        }
    });
    
    // ============================================================================
    // 7.5 HOVER I KLIK NA MODEL - PROMJENA KURSORA I DIREKTAN ULAZAK
    // ============================================================================
    scene.onPointerObservable.add((pointerInfo) => {
        if (interakcijaUToku) return;

        // 1. HOVER DETEKCIJA (Eksplicitan raycast pri pokretu miša)
        if (pointerInfo.type === window.BABYLON.PointerEventTypes.POINTERMOVE) {
            const pick = scene.pick(scene.pointerX, scene.pointerY, (mesh) => {
                return mesh.isVisible && mesh.isEnabled() && mesh.isPickable;
            });

            if (pick && pick.hit && pick.pickedMesh) {
                canvas.style.cursor = "pointer";
            } else {
                canvas.style.cursor = "default";
            }
        }

        // 2. KLIK NA MODEL (Direktan ulazak u simulaciju)
        if (pointerInfo.type === window.BABYLON.PointerEventTypes.POINTERDOWN) {
            const pick = scene.pick(scene.pointerX, scene.pointerY, (mesh) => {
                return mesh.isVisible && mesh.isEnabled() && mesh.isPickable;
            });

            if (pick && pick.hit && pick.pickedMesh) {
                interakcijaUToku = true; 
                canvas.style.cursor = "default";
                
                if (activeModelIndex === 0) {
                    window.location.href = "./cortisol/index.html"; 
                } else if (activeModelIndex === 1) {
                    window.location.href = "./craniofacial/index.html";
                } else if (activeModelIndex === 2) {
                    window.location.href = "./windtunnel/index.html";
                }
            }
        }
    });
    
    // ============================================================================
    // 8. GRAPHICS PIPELINE & RENDERING LOOP STATE MACHINE
    // ============================================================================
    scene.onBeforeRenderObservable.add(() => {
        time += engine.getDeltaTime() * 0.001; 
        
        resolution.x = engine.getRenderWidth();
        resolution.y = engine.getRenderHeight();
        
        currentScroll += (targetScroll - currentScroll) * 0.15;
        
        let normalizedScroll = currentScroll % 3.0;
        if (normalizedScroll < 0) {
            normalizedScroll += 3.0; 
        }
        
        activeModelIndex = Math.floor(normalizedScroll);

        models.forEach((m, idx) => {
            if (m) {
                if (idx === activeModelIndex) {
                    m.setEnabled(true);
                    
                    if (idx === 2) {
                        m.rotationQuaternion = null;
                        m.rotation.x = 0;
                        m.rotation.y = 0; 
                        m.rotation.z = 0;
                        
                        if (scene.animationGroups) {
                            scene.animationGroups.forEach(anim => {
                                if (anim.name.toLowerCase().includes("dron") || anim.name.toLowerCase().includes("windtunnel")) {
                                    anim.play(true); 
                                }
                            });
                        }
                    } 
                    else if (idx === 1) {
                        m.rotationQuaternion = null;
                        m.rotation.y = (time * 0.2) + (currentScroll * 2.0);
                        m.rotation.x = Math.sin(time * 0.5) * 0.1;
                        m.rotation.z = 0;
                    } 
                    else if (idx === 0) {
                        m.rotationQuaternion = null;
                        const offsetX_degrees = 35;   
                        const offsetY_degrees = 0;  
                        const offsetZ_degrees = -15;   
                        
                        const scrollRotation = (time * 0.2) + (currentScroll * 2.0);
                        
                        m.rotation.x = offsetX_degrees * (Math.PI / 180);
                        m.rotation.y = scrollRotation + (offsetY_degrees * (Math.PI / 180));
                        m.rotation.z = offsetZ_degrees * (Math.PI / 180); 
                    }
                } else {
                    m.setEnabled(false);
                    if (idx === 2 && scene.animationGroups) {
                        scene.animationGroups.forEach(anim => {
                            if (anim.name.toLowerCase().includes("dron") || anim.name.toLowerCase().includes("windtunnel")) {
                                anim.stop();
                            }
                        });
                    }
                }
            }
        });

        const distance = 50.0; 
        let visibleHeight, visibleWidth;

        if (camera.fovMode === window.BABYLON.Camera.FOVMODE_VERTICAL_FIXED) {
            visibleHeight = 2.0 * distance * Math.tan(camera.fov / 2.0);
            visibleWidth = visibleHeight * (resolution.x / resolution.y);
        } else {
            visibleWidth = 2.0 * distance * Math.tan(camera.fov / 2.0);
            visibleHeight = visibleWidth / (resolution.x / resolution.y);
        }

        backgroundQuad.scaling.x = visibleWidth / 200.0;
        backgroundQuad.scaling.y = visibleHeight / 200.0;

        backgroundQuad.scaling.x = visibleWidth / 200.0;
        backgroundQuad.scaling.y = visibleHeight / 200.0;

        for(let i = trailLength - 1; i > 0; i--) {
            mouseTrailX[i] = mouseTrailX[i - 1];
            mouseTrailY[i] = mouseTrailY[i - 1];
        }
        mouseTrailX[0] = scene.pointerX / resolution.x;
        mouseTrailY[0] = scene.pointerY / resolution.y;

        haloMaterial.setFloat("time", time);
        inkMaterial.setFloat("time", time);
        inkMaterial.setVector2("resolution", resolution);
        inkMaterial.setFloats("mouseTrailX", mouseTrailX); 
        inkMaterial.setFloats("mouseTrailY", mouseTrailY); 
    });

    return scene;
};

// ============================================================================
// SCROLL GUIDE TRIGGER
// ============================================================================
let hasScrolledOnce = false;
const scrollGuide = document.getElementById("scroll-guide");

function handleFirstScroll() {
    if (!hasScrolledOnce) {
        hasScrolledOnce = true;
        
        if (scrollGuide) {
            // Dodajemo CSS klasu koja pokreće meko sklanjanje naniže
            scrollGuide.classList.add("scroll-disappear");
            
            // Potpuno brišemo element iz memorije nakon 800ms kada završi animaciju
            setTimeout(() => {
                scrollGuide.remove();
            }, 800);
        }
        
        // ISTOG TRENUTKA SKIDAMO OSLUŠKIVAČE DA RASTERETIMO PROCESOR
        window.removeEventListener("wheel", handleFirstScroll);
        window.removeEventListener("touchmove", handleFirstScroll);
    }
}

// Kačimo ponovo detekciju na prozor pretraživača (uz passive: true za bolje performanse)
window.addEventListener("wheel", handleFirstScroll, { passive: true });
window.addEventListener("touchmove", handleFirstScroll, { passive: true });

// ============================================================================
// HARDWARE INITIALIZATION & RUNTIME EXECUTION PETLJA
// ============================================================================
const scene = createScene();

engine.runRenderLoop(() => {
    scene.render();
});

window.addEventListener("resize", () => {
    engine.resize();
    updateCameraFOV(); 
});