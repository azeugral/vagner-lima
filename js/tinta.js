/* Hero: a peça seguinte cobre a anterior com tinta, como no hero do Veríssimo (mesmo shader de cobertura):
   1ª onda com borda molhada traz a peça em cinza (aro escuro + brilho de tinta fresca), 2ª onda traz o tom final.
   tinta(canvas, [Image...]) -> {desenha(t)}; tempo periódico: P s por peça, a troca dura TR s. */
(function () {
  var P = 10, TR = 6.8;
  var RUIDO = 'float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}' +
    'float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}' +
    'float fb(vec2 p){float a=.5,r=0.;for(int k=0;k<5;k++){r+=a*n(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return r;}';
  var VS = 'attribute vec2 p;varying vec2 uv;void main(){uv=p*.5+.5;uv.y=1.-uv.y;gl_Position=vec4(p,0.,1.);}';
  var FS = ['precision highp float;varying vec2 uv;uniform sampler2D A,B;uniform float s;uniform vec2 c0;', RUIDO,
    'const vec3 LUM=vec3(.299,.587,.114);',
    'vec3 cinza(vec3 c){float l=dot(c,LUM);l=smoothstep(-.02,1.03,l);return vec3(pow(l,1.1))*vec3(1.,.985,.96);}',
    'void main(){vec2 u=uv; vec3 a=texture2D(A,u).rgb;',
    ' if(s<0.){gl_FragColor=vec4(a,1.);return;}',
    ' vec3 b=texture2D(B,u).rgb;',
    ' vec2 q=(u-c0)*vec2(.8,1.); float di=length(q)*2.;',
    ' float r1=pow(clamp(s/4.6,0.,1.),.85)*2.15, r2=pow(clamp((s-1.9)/4.6,0.,1.),.85)*2.15;',
    ' float e1=di+(fb(q*3.6+vec2(2.,7.))-.5)*.42+(fb(q*16.)-.5)*.07;',
    ' float e2=di+(fb(q*3.1+vec2(9.,1.))-.5)*.46+(fb(q*14.+3.)-.5)*.08;',
    ' float m1=(1.-smoothstep(r1-.045,r1,e1))*step(.001,r1);',
    ' float m2=(1.-smoothstep(r2-.07,r2,e2))*step(.001,r2);',
    ' vec3 o=mix(a,cinza(b),m1); o=mix(o,b,m2);',
    ' float viva=step(.001,r1)*(1.-smoothstep(1.85,2.15,r1));',
    ' float rim=exp(-pow((e1-r1+.03)/.028,2.))*viva, bri=exp(-pow((e1-r1+.012)/.006,2.))*viva;',
    ' o*=1.-.5*rim; o+=bri*.1;',
    ' float vc=step(.001,r2)*(1.-smoothstep(1.85,2.15,r2)); float rc=exp(-pow((e2-r2+.04)/.05,2.))*vc;',
    ' o+=(o-vec3(dot(o,LUM)))*.25*rc;',
    ' gl_FragColor=vec4(o,1.);}'].join('\n');

  window.tinta = function (cv, imgs) {
    var gl = cv.getContext('webgl', { antialias: false, premultipliedAlpha: false, preserveDrawingBuffer: true });
    if (!gl) return null;
    function sh(t, src) { var s = gl.createShader(t); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw gl.getShaderInfoLog(s); return s; }
    var pr = gl.createProgram();
    gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS));
    gl.bindAttribLocation(pr, 0, 'p'); gl.linkProgram(pr); gl.useProgram(pr);
    var bf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, bf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    var U = {}; ['A', 'B', 's', 'c0'].forEach(function (k) { U[k] = gl.getUniformLocation(pr, k); });
    gl.uniform1i(U.A, 0); gl.uniform1i(U.B, 1); gl.uniform2f(U.c0, .5, .44);
    var TX = imgs.map(function (im) {
      var t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, im);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      return t;
    });
    var N = imgs.length, CICLO = N * P;
    return {
      P: P, TR: TR, CICLO: CICLO,
      desenha: function (t) {
        var r = cv.getBoundingClientRect(), k = Math.min(window.devicePixelRatio || 1, 2);
        var W = Math.max(2, Math.round(r.width * k)), H = Math.max(2, Math.round(r.height * k));
        if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
        gl.viewport(0, 0, W, H);
        var sl = ((t % CICLO) + CICLO) % CICLO, i = Math.floor(sl / P), si = sl - i * P;
        var a = (i + N - 1) % N, b = i;   /* durante a peça i, a troca vem da anterior para ela */
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, TX[si < TR ? a : b]);
        gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, TX[b]);
        gl.uniform1f(U.s, si < TR ? si : -1);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      }
    };
  };
})();
