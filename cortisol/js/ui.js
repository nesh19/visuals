document.addEventListener("DOMContentLoaded", () => {
    const uiToggleBtn = document.getElementById("ui-toggle-btn");
    const leftContainer = document.getElementById("left-container");
    const floatingToolbar = document.getElementById("floating-toolbar");
    let uiVisible = true;

    uiToggleBtn.addEventListener("click", () => {
        uiVisible = !uiVisible;
        if(uiVisible) {
            leftContainer.classList.remove("hidden");
            if (window.innerWidth <= 768) floatingToolbar.classList.remove("hidden");
            uiToggleBtn.innerText = "HIDE UI";
        } else {
            leftContainer.classList.add("hidden");
            floatingToolbar.classList.add("hidden");
            uiToggleBtn.innerText = "SHOW UI";
        }
    });

    document.querySelectorAll('.tool-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            if (window.innerWidth > 768) return;
            const panelName = e.target.getAttribute('data-panel');
            const panel = document.getElementById('panel-' + panelName);
            const isOpen = panel && panel.classList.contains('active-panel');
            
            document.querySelectorAll('#left-container > .panel-box:not(#panel-sliders)').forEach(box => box.classList.remove('active-panel'));
            document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
            
            if (!isOpen && panel) {
                panel.classList.add('active-panel');
                e.target.classList.add('active');
            }
        });
    });

    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const target = e.target.getAttribute('data-target');
            
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');

            document.querySelectorAll('.panel-section').forEach(p => p.classList.remove('active'));
            const targetControls = document.getElementById(`${target}-controls`);
            if (targetControls) targetControls.classList.add('active');

            if(window.loadSimulation) {
                window.loadSimulation(target);
            }
        });
    });
});