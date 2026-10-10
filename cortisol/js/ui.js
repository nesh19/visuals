document.addEventListener("DOMContentLoaded", () => {
    // ============================================================================
    // 1. MOBILE UI TOGGLE & RESPONSIVE PANELS
    // ============================================================================
    const mobileInfoBtn = document.getElementById("mobile-info-btn");
    const mobileStatsBtn = document.getElementById("mobile-stats-btn");
    const infoPanel = document.getElementById("info-panel");
    const statsPanel = document.getElementById("stats-panel");

    if (mobileInfoBtn && infoPanel) {
        mobileInfoBtn.addEventListener("click", () => {
            if (statsPanel && statsPanel.classList.contains("mobile-open")) {
                statsPanel.classList.remove("mobile-open");
                if (mobileStatsBtn) mobileStatsBtn.classList.remove("active");
            }
            const isOpen = infoPanel.classList.toggle("mobile-open");
            mobileInfoBtn.classList.toggle("active", isOpen);
        });
    }

    if (mobileStatsBtn && statsPanel) {
        mobileStatsBtn.addEventListener("click", () => {
            if (infoPanel && infoPanel.classList.contains("mobile-open")) {
                infoPanel.classList.remove("mobile-open");
                if (mobileInfoBtn) mobileInfoBtn.classList.remove("active");
            }
            const isOpen = statsPanel.classList.toggle("mobile-open");
            mobileStatsBtn.classList.toggle("active", isOpen);
        });
    }

    // ============================================================================
    // 2. FADE-IN TEXT INJECTOR
    // ============================================================================
    const typeBody = document.getElementById("type-body");
    
    if (typeBody) {
        typeBody.innerHTML = "CONCEPT: REAL-TIME BIOMETRIC CARDIOVASCULAR STRESS ANALYSIS.<br>TECH SOLUTIONS: MODELING INTERACTIVE PROCEDURAL DEFORMATIONS SYNCED WITH PROCEDURAL PARAMETRIC EMISSIVE LUMINANCE GRADIENTS.";
        void typeBody.offsetWidth;
        requestAnimationFrame(() => {
            setTimeout(() => {
                typeBody.classList.add("cinema-fade-active");
            }, 80); 
        });
    }

    // ============================================================================
    // 3. WIREFRAME CONFIGURATION CONTROLS
    // ============================================================================
    const wireframeButton = document.getElementById("wireframe-btn");
    if (wireframeButton) {
        wireframeButton.addEventListener("click", () => {
            wireframeButton.classList.toggle("active");
        });
    }
});
