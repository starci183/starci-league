import "./fire-stream-lab.css"

const vertex = "attribute vec2 aPosition; void main(){gl_Position=vec4(aPosition,0.,1.);}"
const fragment = `
precision highp float;
uniform vec2 uResolution;
uniform float uTime;
uniform float uPower;
uniform float uMode;
uniform vec2 uOrb;
uniform vec2 uDirection;
uniform vec2 uHit0;
uniform vec2 uHit1;
uniform vec2 uHit2;
uniform vec3 uHitAge;
uniform float uOrbVisible;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
float fbm(vec2 p){float f=0.,a=.5;mat2 m=mat2(1.6,1.2,-1.2,1.6);for(int i=0;i<4;i++){f+=a*noise(p);p=m*p+3.7;a*=.5;}return f;}
void main(){
 vec2 p=gl_FragCoord.xy/uResolution.y;
 if(uMode>.5){
  vec3 rgb=vec3(0.);float alpha=0.;
  for(int j=0;j<3;j++){
   vec2 at=j==0?uHit0:(j==1?uHit1:uHit2);
   float age=j==0?uHitAge.x:(j==1?uHitAge.y:uHitAge.z);
   if(age>=0. && age<1.05){
    vec2 q=p-at;float radius=.026+age*.115;
    if(length(q)<radius*2.2){
     q.y-=age*.065;float fade=pow(1.-age/1.05,1.7);
     float n=fbm(q*48.-vec2(age*2.,age*5.));
     float field=1.-length(q*vec2(.85,1.15))/radius+(n-.5)*1.2;
     float body=smoothstep(.03,.55,field)*fade;
     float hot=exp(-dot(q,q)/max(.0001,radius*radius*.20))*fade;
     vec3 c=mix(vec3(1.,.10,.006),vec3(1.,.68,.10),smoothstep(.3,1.,field));
     c=mix(c,vec3(1.,.95,.7),hot);
     float glow=exp(-dot(q,q)/(radius*radius*1.5))*fade*.19;
     rgb+=c*body+vec3(1.,.24,.01)*glow;alpha=max(alpha,max(body,glow));
    }
   }
  }
  if((uMode<1.5 || uMode>2.5) && uOrbVisible>.01){
   vec2 d=p-uOrb;
   if(length(d)<.24){
    float along=dot(d,uDirection),side=dot(d,vec2(-uDirection.y,uDirection.x));
    float warp=fbm(vec2(along*55.-uTime*10.,side*70.));
    float radius=.026+(warp-.5)*.012;
    float ball=1.-smoothstep(radius*.35,radius*1.4,length(d));
    float hot=exp(-dot(d,d)*6500.);
    float trail=(1.-smoothstep(-.015,.012,along))*exp(min(0.,along)*15.);
    float width=.012+max(0.,-along)*.13;
    float tongues=smoothstep(.1,.65,1.-abs(side+(warp-.5)*.025)/width+(warp-.5)*.9)*trail;
    float a=max(ball,tongues*.86)*uOrbVisible;
    vec3 c=mix(vec3(1.,.13,.004),vec3(1.,.66,.10),max(ball*.7,tongues*.3));
    c=mix(c,vec3(1.,.97,.76),hot*.93);
    float halo=exp(-dot(d,d)*850.)*.18*uOrbVisible;
    rgb+=c*a+vec3(1.,.23,.015)*halo;alpha=max(alpha,max(a,halo));
   }
  }
  gl_FragColor=vec4(rgb,clamp(alpha,0.,1.));return;
 }
 float aspect=uResolution.x/uResolution.y;
 vec2 source=vec2(aspect*.19,.50);
 float lengthJet=aspect*.62;
 float x=(p.x-source.x)/lengthJet;
 float y=p.y-source.y;
 if(x < -.03 || x > 1.22 || abs(y) > .24){gl_FragColor=vec4(0.);return;}
 float t=uTime;
 // Advected low-frequency flow bends the continuous body; independent finer
 // octaves tear the edge. There are no isolated circles making up the flame.
 float flow=fbm(vec2(x*4.-t*1.8,y*7.+t*.27));
 float center=.016*sin(x*15.-t*4.)*smoothstep(0.,.45,x);
 center+=(flow-.5)*.085*smoothstep(0.,.3,x);
 float widening=mix(.015,.105,smoothstep(0.,.85,x));
 float wobble=fbm(vec2(x*10.-t*5.2,y*22.+flow*3.));
 float cross=abs(y-center)/max(.005,widening);
 float tail=1.-smoothstep(.65,1.08+(flow-.5)*.16,x);
 float head=smoothstep(-.012,.035,x);
 float billow=fbm(vec2(x*22.-t*7.5,(y-center)*30.+flow*4.));
 float body=1.-cross+(wobble-.5)*.95+(billow-.5)*.45;
 float tongue=smoothstep(.05,.43,body)*tail*head;
 float hot=pow(max(0.,1.-cross),2.4)*tail*head;
 hot*=smoothstep(.28,.82,billow*.6+wobble*.4);
 // A hot core is broken into moving tongues, rather than a white solid tube.
 vec3 color=mix(vec3(.65,.025,.002),vec3(1.,.26,.012),smoothstep(.05,.65,body));
 color=mix(color,vec3(1.,.72,.12),smoothstep(.62,1.15,body)*.75);
 color=mix(color,vec3(1.,.94,.65),hot*.88);
 float flameAlpha=tongue*.94;
 float halo=exp(-cross*cross*.8)*tail*head*.14;
 vec3 rgb=color*flameAlpha+vec3(1.,.19,.012)*halo;
 float alpha=max(flameAlpha,halo);
 // Faint turbulent smoke is behind the glowing stream, not a grey blur on it.
 float smokeNoise=fbm(vec2(x*6.-t*.9,y*13.+t*.15));
 float smoke=exp(-pow((y-center-.055)/(.065+x*.055),2.))*smoothstep(.2,.6,x)*(1.-smoothstep(.85,1.18,x));
 smoke*=smoothstep(.38,.7,smokeNoise)*.16;
 rgb+=vec3(.13,.09,.065)*smoke*(1.-flameAlpha);
 alpha=max(alpha,smoke);
 // Small ballistic embers shed from the body with independent lifetimes.
 for(int i=0;i<14;i++){
  float seed=float(i),age=fract(t*(.48+hash(vec2(seed,9.))*.3)+hash(vec2(seed,2.)));
  float born=hash(vec2(seed,3.))*.7;
  vec2 e=vec2(born+age*.38,(hash(vec2(seed,4.))-.5)*.10+age*.15-age*age*.05);
  e.y+=sin(age*8.+seed)*.013;
  vec2 delta=vec2((x-e.x)*lengthJet,y-e.y);
  float spark=exp(-dot(delta*vec2(1.,2.),delta*vec2(1.,2.))*220000.);
  spark*=sin(age*3.14159)*(1.-smoothstep(.95,1.2,e.x));
  rgb+=vec3(1.,.55,.10)*spark*.8;alpha=max(alpha,spark);
 }
 // End-of-stream contact flutter, independent of the moving inner tongues.
 vec2 impact=p-vec2(source.x+lengthJet*.99,source.y);
 float hit=exp(-dot(impact,impact)*650.)*(.45+.25*sin(t*24.))*head;
 rgb+=vec3(1.,.38,.045)*hit*.35;alpha=max(alpha,hit*.3);
 gl_FragColor=vec4(rgb*uPower,clamp(alpha*uPower,0.,1.));
}`

/** Isolated GPU experiment. It emits no gameplay events and cannot apply damage. */
export function mountFireStreamLab() {
    document.title = "Brand · Thử luồng lửa GPU"
    document.body.innerHTML = `<main class="fire-lab"><section class="fire-lab-stage">
        <div class="fire-lab-ground"></div><header><small>STARCI · VFX THỬ NGHIỆM</small><h1>Brand · Q / E / R</h1><p>Q · Cầu lửa bay — E · Nổ đồng thời — R · Cầu lửa nảy từng mục tiêu</p></header>
        <article class="fire-lab-card source"><img src="/heroes-square/brand.jpg" alt="Brand"><b>Brand</b></article>
        <article class="fire-lab-card target t0"><img src="/heroes-square/ashe.jpg" alt="Ashe"><b>Ashe</b></article><article class="fire-lab-card target t1"><img src="/heroes-square/garen.jpg" alt="Garen"><b>Garen</b></article><article class="fire-lab-card target t2"><img src="/heroes-square/lux.jpg" alt="Lux"><b>Lux</b></article>
        <canvas aria-label="Luồng lửa phun từ Brand tới mục tiêu"></canvas>
        <footer><button data-skill="Q">Q · Cầu lửa</button><button data-skill="E">E · Bùng lửa</button><button data-skill="R">R · Nảy lửa</button><button data-fire="hold" aria-pressed="false">Giữ lửa</button><button data-fire="stop">Dừng</button><span role="status">Đang chuẩn bị GPU…</span><a href="/vfx">Kho VFX</a></footer>
    </section></main>`
    const stage = document.querySelector<HTMLElement>(".fire-lab-stage")!
    const canvas = stage.querySelector("canvas")!
    const status = stage.querySelector<HTMLElement>("[role=status]")!
    attachFireStreamRenderer(stage,
        canvas,
        status)
}

export function attachFireStreamRenderer(stage: HTMLElement, canvas: HTMLCanvasElement, status: HTMLElement, anchors?: () => { source: number[]; targets: number[][] }) {
    const gl = canvas.getContext("webgl",
        {
            alpha: true, premultipliedAlpha: true, antialias: false
        })
    if (!gl) { status.textContent = "Thiết bị chưa bật WebGL."; return }
    const shader = (kind: number, source: string) => {
        const value = gl.createShader(kind)!
        gl.shaderSource(value,
            source); gl.compileShader(value)
        if (!gl.getShaderParameter(value,
            gl.COMPILE_STATUS)) { const message = gl.getShaderInfoLog(value); gl.deleteShader(value); throw new Error(message ?? "Shader compile failed") }
        return value
    }
    let program: WebGLProgram
    try {
        program = gl.createProgram()!
        const vs = shader(gl.VERTEX_SHADER,
                vertex), fs = shader(gl.FRAGMENT_SHADER,
                fragment)
        gl.attachShader(program,
            vs); gl.attachShader(program,
            fs); gl.linkProgram(program)
        gl.deleteShader(vs); gl.deleteShader(fs)
        if (!gl.getProgramParameter(program,
            gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) ?? "Shader link failed")
    } catch (error) { status.textContent = String(error); return }
    gl.useProgram(program)
    const buffer = gl.createBuffer()!
    gl.bindBuffer(gl.ARRAY_BUFFER,
        buffer)
    gl.bufferData(gl.ARRAY_BUFFER,
        new Float32Array([-1,
            -1,
            1,
            -1,
            -1,
            1,
            -1,
            1,
            1,
            -1,
            1,
            1]),
        gl.STATIC_DRAW)
    const attribute = gl.getAttribLocation(program,
        "aPosition")
    gl.enableVertexAttribArray(attribute); gl.vertexAttribPointer(attribute,
        2,
        gl.FLOAT,
        false,
        0,
        0)
    const resolution = gl.getUniformLocation(program,
            "uResolution"), time = gl.getUniformLocation(program,
            "uTime"), power = gl.getUniformLocation(program,
            "uPower")
    const locations = Object.fromEntries(["uMode",
        "uOrb",
        "uDirection",
        "uHit0",
        "uHit1",
        "uHit2",
        "uHitAge",
        "uOrbVisible"].map(name => [name,
        gl.getUniformLocation(program,
            name)]))
    const resize = () => {
        canvas.style.setProperty("width",
            stage.clientWidth + "px",
            "important")
        canvas.style.setProperty("height",
            stage.clientHeight + "px",
            "important")
        // Bound fill rate; the shader still reconstructs the soft edges at output size.
        const scale = Math.min(devicePixelRatio || 1,
            1.25,
            960 / stage.clientWidth)
        canvas.width = Math.round(stage.clientWidth * scale); canvas.height = Math.round(stage.clientHeight * scale)
        gl.viewport(0,
            0,
            canvas.width,
            canvas.height)
    }
    const observer = new ResizeObserver(resize); observer.observe(stage); resize()
    const start = performance.now()
    let held = false, strength = 0, frame = 0, previous = start, elapsed = 0, samples = 0, sampleAt = start
    let mode = 0, skillStarted = start, lastHop = -1
    const hitTimes = [-100,
        -100,
        -100]
    const holdButton = stage.querySelector<HTMLButtonElement>("[data-fire=\"hold\"]")!
    const points = () => {
        if (anchors) return anchors()
        const r = stage.getBoundingClientRect()
        const center = (selector: string) => {
            const image = stage.querySelector(selector)!.getBoundingClientRect()
            return [(image.x + image.width / 2 - r.x) / r.height,
                1 - (image.y + image.height / 2 - r.y) / r.height]
        }
        return {
            source: center(".source img"), targets: [0,
                1,
                2].map(i => center(".t" + i + " img"))
        }
    }
    for (const button of stage.querySelectorAll<HTMLButtonElement>("[data-skill]")) button.addEventListener("click",
        () => {
            mode = ({
                Q: 1, E: 2, R: 3
            } as Record<string, number>)[button.dataset.skill!]
            held = false; strength = 0; holdButton.setAttribute("aria-pressed",
                "false")
            skillStarted = performance.now(); lastHop = -1; hitTimes.fill(-100)
            stage.dataset.activeSkill = button.dataset.skill
        })
    holdButton.addEventListener("click",
        () => { mode = 0; held = !held; holdButton.setAttribute("aria-pressed",
            String(held)) })
    stage.querySelector("[data-fire=\"stop\"]")!.addEventListener("click",
        () => { mode = 0; held = false; holdButton.setAttribute("aria-pressed",
            "false") })
    let contextLost = false
    canvas.addEventListener("webglcontextlost",
        event => { event.preventDefault(); contextLost = true; cancelAnimationFrame(frame); status.textContent = "GPU bị gián đoạn · tải lại để tiếp tục" })
    const render = (now: number) => {
        if (contextLost) return
        const dt = Math.min((now - previous) / 1000,
            .06); previous = now
        if (!document.hidden) elapsed += dt
        const desired = !document.hidden && held ? 1 : 0
        strength += (desired - strength) * (1 - Math.exp(-dt * (desired ? 12 : 5)))
        gl.uniform2f(resolution,
            canvas.width,
            canvas.height); gl.uniform1f(time,
            elapsed); gl.uniform1f(power,
            strength)
        gl.uniform1f(locations.uMode,
            mode)
        if (mode) {
            const { source, targets } = points(), age = Math.max(0,
                (now - skillStarted) / 1000)
            let from = source, to = targets[1], progress = Math.min(1,
                    age / .65), visible = age < .65 ? 1 : 0
            if (mode === 1 && age >= .65 && hitTimes[1] < 0) hitTimes[1] = .65
            if (mode === 2 && hitTimes[0] < 0) hitTimes.fill(0)
            if (mode === 3) {
                const sequence = [0,
                        1,
                        2,
                        0,
                        2], hop = Math.floor(age / .48)
                progress = (age % .48) / .48; visible = hop < sequence.length ? 1 : 0
                if (hop > lastHop) {
                    for (let h = lastHop + 1; h <= hop; h++) if (h > 0 && h <= sequence.length) hitTimes[sequence[h - 1]] = h * .48
                    lastHop = hop
                }
                if (hop < sequence.length) { from = hop === 0 ? source : targets[sequence[hop - 1]]; to = targets[sequence[hop]] }
            }
            const dx = to[0] - from[0], dy = to[1] - from[1], distance = Math.hypot(dx,
                dy) || 1
            gl.uniform2f(locations.uOrb,
                from[0] + dx * progress,
                from[1] + dy * progress + Math.sin(progress * Math.PI) * .025)
            gl.uniform2f(locations.uDirection,
                dx / distance,
                dy / distance)
            gl.uniform1f(locations.uOrbVisible,
                visible)
            for (let i = 0; i < 3; i++) gl.uniform2f(locations["uHit" + i],
                targets[i][0],
                targets[i][1])
            const ages = hitTimes.map(hit => hit < 0 ? -1 : age - hit)
            gl.uniform3f(locations.uHitAge,
                ages[0],
                ages[1],
                ages[2])
            stage.dataset.hop = String(mode === 3 ? Math.min(5,
                lastHop) : 0)
        }
        gl.drawArrays(gl.TRIANGLES,
            0,
            6)
        if (samples === 0 && gl.getError() !== gl.NO_ERROR) { status.textContent = "Lỗi GPU khi render"; return }
        samples++
        if (now - sampleAt > 1000) { status.textContent = `GPU · ${Math.round(samples * 1000 / (now - sampleAt))} fps · demo, không gây sát thương`; samples = 0; sampleAt = now }
        frame = requestAnimationFrame(render)
    }
    frame = requestAnimationFrame(render)
    window.addEventListener("pagehide",
        () => { cancelAnimationFrame(frame); observer.disconnect(); gl.deleteBuffer(buffer); gl.deleteProgram(program) },
        {
            once: true
        })
    return {
        play(skill: "Q" | "E" | "R") { stage.querySelector<HTMLButtonElement>("[data-skill=\"" + skill + "\"]")?.click() },
        stop() { mode = 0; held = false },
        destroy() { cancelAnimationFrame(frame); observer.disconnect(); gl.deleteBuffer(buffer); gl.deleteProgram(program) }
    }

}
