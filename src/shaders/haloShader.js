export const haloVertexShader = `
    precision highp float;
    attribute vec3 position;
    attribute vec2 uv;
    uniform mat4 worldViewProjection;
    varying vec2 vUv;

    void main() {
        vUv = uv;
        gl_Position = worldViewProjection * vec4(position, 1.0);
    }
`;

export const haloFragmentShader = `
    precision highp float;
    varying vec2 vUv;
    uniform float time;

    // Based on 'UI noise halo' by magician0809 on Shadertoy

    vec3 hash33(vec3 p3) {
        p3 = fract(p3 * vec3(.1031,.11369,.13787));
        p3 += dot(p3, p3.yxz+19.19);
        return -1.0 + 2.0 * fract(vec3(p3.x+p3.y, p3.x+p3.z, p3.y+p3.z)*p3.zyx);
    }

    float snoise3(vec3 p) {
        const float K1 = 0.333333333;
        const float K2 = 0.166666667;
        
        vec3 i = floor(p + (p.x + p.y + p.z) * K1);
        vec3 d0 = p - (i - (i.x + i.y + i.z) * K2);
        
        vec3 e = step(vec3(0.0), d0 - d0.yzx);
        vec3 i1 = e * (1.0 - e.zxy);
        vec3 i2 = 1.0 - e.zxy * (1.0 - e);
        
        vec3 d1 = d0 - (i1 - K2);
        vec3 d2 = d0 - (i2 - K1);
        vec3 d3 = d0 - 0.5;
        
        vec4 h = max(0.6 - vec4(dot(d0, d0), dot(d1, d1), dot(d2, d2), dot(d3, d3)), 0.0);
        vec4 n = h * h * h * h * vec4(dot(d0, hash33(i)), dot(d1, hash33(i + i1)), dot(d2, hash33(i + i2)), dot(d3, hash33(i + 1.0)));
        
        return dot(vec4(31.316), n);
    }

    vec4 extractAlpha(vec3 colorIn) {
        vec4 colorOut;
        float maxValue = min(max(max(colorIn.r, colorIn.g), colorIn.b), 1.0);
        if (maxValue > 1e-5) {
            colorOut.rgb = colorIn.rgb * (1.0 / maxValue);
            colorOut.a = maxValue;
        } else {
            colorOut = vec4(0.0);
        }
        return colorOut;
    }

    const vec3 color1 = vec3(0.611765, 0.262745, 0.996078);
    const vec3 color2 = vec3(0.298039, 0.760784, 0.913725);
    const vec3 color3 = vec3(0.062745, 0.078431, 0.600000);
    const float innerRadius = 0.6;
    const float noiseScale = 0.95;

    float light1(float intensity, float attenuation, float dist) {
        return intensity / (1.0 + dist * attenuation);
    }
    float light2(float intensity, float attenuation, float dist) {
        return intensity / (1.0 + dist * dist * attenuation);
    }

    void main() {
        // Remapiranje UV koordinata sa [0, 1] na [-1, 1] za polarnu matematiku
        vec2 uv = vUv * 2.0 - 1.0;
        
        float ang = atan(uv.y, uv.x);
        float len = length(uv);
        float v0, v1, v2, v3, cl;
        float r0, d0, n0;
        float r, d;
        
        // ring
        n0 = snoise3( vec3(uv * noiseScale, time * 0.5) ) * 0.5 + 0.5;
        r0 = mix(mix(innerRadius, 1.0, 0.4), mix(innerRadius, 1.0, 0.6), n0);
        d0 = distance(uv, r0 / len * uv);
        v0 = light1(1.0, 10.0, d0);
        v0 *= smoothstep(r0 * 1.05, r0, len);
        cl = cos(ang + time * 2.0) * 0.5 + 0.5;
        
        // high light
        float a = time * -1.0;
        vec2 pos = vec2(cos(a), sin(a)) * r0;
        d = distance(uv, pos);
        v1 = light2(1.5, 5.0, d);
        v1 *= light1(1.0, 50.0 , d0);
        
        // back decay
        v2 = smoothstep(1.0, mix(innerRadius, 1.0, n0 * 0.5), len);
        
        // hole
        v3 = smoothstep(innerRadius, mix(innerRadius, 1.0, 0.5), len);
        
        vec3 col = mix(color1, color2, cl);
        col = mix(color3, col, v0);
        col = (col + v1) * v2 * v3;
        col = clamp(col, 0.0, 1.0);
        
        // Vraća čistu boju sa ekstraktovanim alfa kanalom za blending
        gl_FragColor = extractAlpha(col);
    }
`;