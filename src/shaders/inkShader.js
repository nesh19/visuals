export const inkVertexShader = `
    precision highp float;
    attribute vec3 position;
    attribute vec2 uv;
    uniform mat4 worldViewProjection;
    varying vec2 vUv;

    void main() {
        vec4 p = vec4(position, 1.0);
        gl_Position = worldViewProjection * p;
        vUv = uv;
    }
`;
export const inkFragmentShader = `
    precision highp float;
    varying vec2 vUv;
    uniform float time;
    uniform vec2 resolution;
    
    uniform float mouseTrailX[10]; 
    uniform float mouseTrailY[10];

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
        for(int i = 0; i < 4; i++) {
            f += amp * noise(p); p *= 2.0; amp *= 0.5;
        }
        return f;
    }

    void main() {
        vec2 p = vUv * 2.0 - 1.0;
        p.x *= resolution.x / resolution.y; 

        float glowInteraction = 0.0;
        float waveInteraction = 0.0;

        for(int i = 0; i < 10; i++) {
            vec2 m = vec2(mouseTrailX[i], mouseTrailY[i]) * 2.0 - 1.0;
            m.x *= resolution.x / resolution.y;
            m.y = -m.y; 

            float mouseDist = length(p - m);
            float age = float(i) / 9.0; 
            float weight = 1.0 - age; 
            
            // Glava komete ostaje uska
            float gInt = exp(-mouseDist * (30.0 + age * 50.0)) * weight;
            glowInteraction += gInt;

            // OSLOBOĐENI TALASI: Smanjeno sa 10.0 na 4.0 kako bi se talas širio dublje u prostor
            float wInt = exp(-mouseDist * (16.0 + age * 1.0)) * weight;
            waveInteraction += wInt;
        }

        glowInteraction = clamp(glowInteraction, 0.0, 1.0);
        waveInteraction = clamp(waveInteraction, 0.0, 1.0);

        vec2 scaledP = p * 3.0; 
        
        // MORSKI TOK: Mastilo konstantno klizi dijagonalno
        vec2 flowP = scaledP + vec2(time * 0.2, time * 0.2);
        
        vec2 q = vec2(0.0);
        q.x = fbm(flowP + 0.05 * time);
        q.y = fbm(flowP + vec2(1.0) + 0.05 * time);

        vec2 r = vec2(0.0);
        
        // POJAČAN UDARAC: Snaga talasa podignuta na 18.0 za jaču distorziju prostora
        r.x = fbm(flowP + 2.0 * q + vec2(1.7, 9.2) + 0.1 * time + waveInteraction * 18.0);
        r.y = fbm(flowP + 2.0 * q + vec2(8.3, 2.8) + 0.1 * time - waveInteraction * 18.0);

        float f = fbm(flowP + r);

        float fluidContrast = smoothstep(0.4, 0.9, f);

        vec3 color = mix(
            vec3(0.001, 0.001, 0.003), 
            vec3(0.01, 0.06, 0.2),     
            fluidContrast
        );

        color += vec3(0.05, 0.25, 0.6) * glowInteraction * (f + 0.5);
        
        // POJAČAN KONTRAST TALASA: Plava nijansa je posvijetljena da se jasno vidi trag
        color += vec3(0.02, 0.1, 0.3) * waveInteraction * fluidContrast;

        gl_FragColor = vec4(color, 1.0);
    }
`;