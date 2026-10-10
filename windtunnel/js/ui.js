function initUI() {
    // ============================================================================
    // 1. MOBILE UI TOGGLE
    // ============================================================================
    const uiToggleBtn = document.getElementById("ui-toggle-btn");
    const leftContainer = document.getElementById("left-container");
    const floatingToolbar = document.getElementById("floating-toolbar");
    let uiVisible = true;

    if (uiToggleBtn) {
        uiToggleBtn.addEventListener("click", () => {
            uiVisible = !uiVisible;
            if (uiVisible) {
                if (leftContainer) leftContainer.style.display = "block";
                if (window.innerWidth <= 1024 && floatingToolbar) floatingToolbar.style.display = "flex";
                uiToggleBtn.innerText = "HIDE UI";
            } else {
                if (leftContainer) leftContainer.style.display = "none";
                if (floatingToolbar) floatingToolbar.style.display = "none";
                uiToggleBtn.innerText = "SHOW UI";
            }
        });
    }

    // ============================================================================
    // MOBILNE POP-UP PANEL LOGIC
    // ============================================================================
    const infoBtn = document.getElementById("mobile-info-btn");
    const statsBtn = document.getElementById("mobile-stats-btn");
    const infoPanel = document.getElementById("info-panel");
    const statsPanel = document.getElementById("stats-panel");

    if (infoBtn && statsBtn && infoPanel && statsPanel) {
        infoBtn.addEventListener("click", () => {
            if (statsPanel.classList.contains("mobile-open")) {
                statsPanel.classList.remove("mobile-open");
                statsBtn.classList.remove("active");
            }
            infoPanel.classList.toggle("mobile-open");
            infoBtn.classList.toggle("active");
        });

        statsBtn.addEventListener("click", () => {
            if (infoPanel.classList.contains("mobile-open")) {
                infoPanel.classList.remove("mobile-open");
                infoBtn.classList.remove("active");
            }
            statsPanel.classList.toggle("mobile-open");
            statsBtn.classList.toggle("active");
        });
    }

    // ============================================================================
    // 2. FADE-IN TEXT INJECTOR 
    // ============================================================================
    const typeBody = document.getElementById("type-body");
    
    if (typeBody) {
        typeBody.innerHTML = "CONCEPT: REAL-TIME AERODYNAMIC DRONE SIMULATION.<br>TECH SOLUTIONS: ENGINEERED IN BABYLON.JS UTILIZING GPU PARTICLE SYSTEMS, DYNAMIC WIND VELOCITY PARAMETERS, AND INTERACTIVE FLOW REGIME TRANSITIONS.";
        void typeBody.offsetWidth;
        requestAnimationFrame(() => {
            setTimeout(() => {
                typeBody.classList.add("cinema-fade-active");
            }, 80); 
        });
    }

    // ============================================================================
    // 3. WIREFRAME SPHERE CLASS
    // ============================================================================
    const wireframeButton = document.getElementById("wireframe-btn");
    if (wireframeButton) {
        wireframeButton.addEventListener("click", () => {
            wireframeButton.classList.toggle("active");
        });
    }
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initUI);
} else {
    initUI();
}