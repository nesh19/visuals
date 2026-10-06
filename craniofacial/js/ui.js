document.addEventListener("DOMContentLoaded", () => {
    // 1. NOVI TOP BAR SISTEM (Otvaranje I i S panela)
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

            // NOVO: Svaki put kada se otvori panel, resetuj i pokreni kucanje!
            if (isOpen) {
                pokreniTeletypeKucanje();
            }
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

    // 2. TELETYPE EFEKAT ZA OPIS
    const typeBody = document.getElementById("type-body");
    const loadingScreen = document.getElementById("loading-screen");
    const textToType = "CONCEPT: REAL-TIME MAXILLOFACIAL MORPHOLOGICAL SURGERY OUTCOMES.\\nTECH SOLUTIONS: POWERED BY THE BABYLON.JS MORPHTARGETMANAGER OPTIMIZED FOR REAL-TIME, SLIDER-DRIVEN PARAMETRIC VERTEX DEFORMATION.";
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

    // 3. SFERA AKTIVACIJA KLASA
    const wireframeButton = document.getElementById("wireframe-btn");
    if (wireframeButton) {
        wireframeButton.addEventListener("click", () => {
            wireframeButton.classList.toggle("active");
        });
    }

    // 4. STRIPOVANJE LOADING PARAVANA
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