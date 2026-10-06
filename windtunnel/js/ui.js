document.addEventListener("DOMContentLoaded", () => {
    // ============================================================================
    // 1. MOBILNI UI TOGGLE
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
    // NOVO: LOGIKA ZA MOBILNE POP-UP PANELE (Cortisol standard)
    // ============================================================================
    const infoBtn = document.getElementById("mobile-info-btn");
    const statsBtn = document.getElementById("mobile-stats-btn");
    const infoPanel = document.getElementById("info-panel");
    const statsPanel = document.getElementById("stats-panel");

    if (infoBtn && statsBtn && infoPanel && statsPanel) {
        // Otvaranje/Zatvaranje INFO panela
        infoBtn.addEventListener("click", () => {
            if (statsPanel.classList.contains("mobile-open")) {
                statsPanel.classList.remove("mobile-open");
                statsBtn.classList.remove("active");
            }
            infoPanel.classList.toggle("mobile-open");
            infoBtn.classList.toggle("active");
        });

        // Otvaranje/Zatvaranje STATS panela
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
    // 2. TELETYPE EFEKAT (Aerodynamics Log)
    // ============================================================================
    const typeBody = document.getElementById("type-body");
    const loadingScreen = document.getElementById("loading-screen");

    const textToType = "CONCEPT: REAL-TIME AERODYNAMIC DRONE SIMULATION.\\nTECH SOLUTIONS: ENGINEERED IN BABYLON.JS UTILIZING GPU PARTICLE SYSTEMS, DYNAMIC WIND VELOCITY PARAMETERS, AND INTERACTIVE FLOW REGIME TRANSITIONS.";
    
    let isTyping = false;

    function pokreniTeletypeKucanje() {
        if (!typeBody || isTyping) return;
        isTyping = true;
        
        let index = 0; 
        typeBody.innerHTML = ""; 
        
        function typeChar() {
            if (index < textToType.length) {
                let char = textToType.charAt(index);
                
                if (char === '\\' && textToType.charAt(index + 1) === 'n') {
                    typeBody.innerHTML += "<br>"; 
                    index += 2; 
                } else {
                    typeBody.innerHTML += char;
                    index++;
                }
                
                setTimeout(typeChar, Math.random() * 30 + 15);
            } else {
                isTyping = false; 
            }
        }
        typeChar();
    }

    // ============================================================================
    // 3. WIREFRAME SPHERE KLASA
    // ============================================================================
    const wireframeButton = document.getElementById("wireframe-btn");
    if (wireframeButton) {
        wireframeButton.addEventListener("click", () => {
            wireframeButton.classList.toggle("active");
        });
    }

    // ============================================================================
    // 4. STRIPOVANJE LOADING PARAVANA
    // ============================================================================
    if (loadingScreen) {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.attributeName === "style" && loadingScreen.style.display === "none") {
                    setTimeout(pokreniTeletypeKucanje, 500);
                    observer.disconnect(); 
                }
            });
        });
        observer.observe(loadingScreen, { attributes: true });
    } else {
        setTimeout(pokreniTeletypeKucanje, 1000);
    }
});