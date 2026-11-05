/* Efectos de imagen: WebGL (un solo shader) con respaldo 2D. VE.efectos */
(function (g) {
  var VS = 'attribute vec2 p;varying vec2 v;void main(){v=p*.5+.5;gl_Position=vec4(p,0.,1.);}';
  var FS = 'precision mediump float;varying vec2 v;uniform sampler2D tx;uniform vec2 res;uniform float br,co,sa,te,vi,bn,se,vh,tm,ckOn,ckT,ckS;uniform vec2 ckC;' +
    'float h(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}' +
    'void main(){vec2 uv=v;' +
    'if(vh>0.){float l=floor(uv.y*res.y/3.);float j=(h(vec2(l,floor(tm*24.)))-.5)*.03*vh*step(.9,h(vec2(l*.13,floor(tm*10.))));uv.x+=j;}' +
    'vec4 c=texture2D(tx,uv);' +
    'if(vh>0.){vec4 r=texture2D(tx,uv+vec2(.005*vh,0.));vec4 b=texture2D(tx,uv-vec2(.005*vh,0.));c.r=r.r;c.b=b.b;c.a=max(c.a,max(r.a,b.a));}' +
    'float a=c.a;vec3 rgb=a>.001?c.rgb/a:vec3(0.);float lum=dot(rgb,vec3(.299,.587,.114));' +
    'if(ckOn>.5){vec2 cc=vec2(-.168736*rgb.r-.331264*rgb.g+.5*rgb.b,.5*rgb.r-.418688*rgb.g-.081312*rgb.b);float d=distance(cc,ckC);float m=smoothstep(ckT,ckT+ckS+.001,d);a*=m;rgb=mix(vec3(lum),rgb,clamp(m*1.5,0.,1.));}' +
    'rgb+=br;rgb=(rgb-.5)*(1.+co)+.5;lum=dot(rgb,vec3(.299,.587,.114));rgb=mix(vec3(lum),rgb,1.+sa);rgb.r+=te*.09;rgb.g+=te*.02;rgb.b-=te*.09;' +
    'rgb=mix(rgb,vec3(lum),bn);vec3 s=vec3(dot(rgb,vec3(.393,.769,.189)),dot(rgb,vec3(.349,.686,.168)),dot(rgb,vec3(.272,.534,.131)));rgb=mix(rgb,s,se);' +
    'rgb*=1.-vi*smoothstep(.25,.85,distance(v,vec2(.5))*1.4);' +
    'if(vh>0.){rgb+=(h(v*res+tm)-.5)*.16*vh;rgb*=1.-.1*vh*step(.5,fract(v.y*res.y/4.));}' +
    'gl_FragColor=vec4(clamp(rgb,0.,1.)*a,a);}';

  function cromaYC(hex) {
    var r = parseInt(hex.slice(1, 3), 16) / 255, gg = parseInt(hex.slice(3, 5), 16) / 255, b = parseInt(hex.slice(5, 7), 16) / 255;
    return [-0.168736 * r - 0.331264 * gg + 0.5 * b, 0.5 * r - 0.418688 * gg - 0.081312 * b];
  }
  function FxGL() {
    this.cv = document.createElement('canvas'); this.cv.width = 16; this.cv.height = 16;
    var gl = this.gl = this.cv.getContext('webgl', { premultipliedAlpha: true, alpha: true, preserveDrawingBuffer: false });
    if (!gl) throw new Error('sin webgl');
    function sh(t, s) { var o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o)); return o; }
    var pr = this.pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error('enlace');
    gl.useProgram(pr);
    var b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    this.tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, this.tex);
    [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]].forEach(function (q) { gl.texParameteri(gl.TEXTURE_2D, q[0], q[1]); });
    this.u = {}; var self = this; ['tx', 'res', 'br', 'co', 'sa', 'te', 'vi', 'bn', 'se', 'vh', 'tm', 'ckOn', 'ckT', 'ckS', 'ckC'].forEach(function (n) { self.u[n] = gl.getUniformLocation(pr, n); });
    this.perdido = false; var me = this; this.cv.addEventListener('webglcontextlost', function (e) { e.preventDefault(); me.perdido = true; });
  }
  FxGL.prototype.aplicar = function (src, P, c, t) {
    var gl = this.gl, w = src.width, h = src.height;
    if (this.cv.width !== w || this.cv.height !== h) { this.cv.width = w; this.cv.height = h; }
    gl.viewport(0, 0, w, h); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.bindTexture(gl.TEXTURE_2D, this.tex); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
    var u = this.u, ck = c.croma && c.croma.on ? c.croma : null, yc = ck ? cromaYC(ck.color || '#00ff00') : [0, 0];
    gl.uniform1i(u.tx, 0); gl.uniform2f(u.res, w, h); gl.uniform1f(u.br, P.brillo * 0.5); gl.uniform1f(u.co, P.contraste); gl.uniform1f(u.sa, P.sat);
    gl.uniform1f(u.te, P.temp); gl.uniform1f(u.vi, P.vineta); gl.uniform1f(u.bn, P.bn); gl.uniform1f(u.se, P.sepia); gl.uniform1f(u.vh, P.vhs); gl.uniform1f(u.tm, t % 100);
    gl.uniform1f(u.ckOn, ck ? 1 : 0); gl.uniform1f(u.ckT, ck ? (ck.tol == null ? 0.3 : ck.tol) * 0.5 : 0); gl.uniform1f(u.ckS, ck ? (ck.suave == null ? 0.1 : ck.suave) * 0.5 : 0); gl.uniform2f(u.ckC, yc[0], yc[1]);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    return this.cv;
  };

  function Fx2D() { this.cv = document.createElement('canvas'); this.cx = this.cv.getContext('2d', { willReadFrequently: true }); this.ruido = document.createElement('canvas'); this.ruido.width = this.ruido.height = 128; this.ultimoRuido = -1; }
  Fx2D.prototype.aplicar = function (src, P, c, t) {
    var w = src.width, h = src.height, cx = this.cx;
    if (this.cv.width !== w || this.cv.height !== h) { this.cv.width = w; this.cv.height = h; }
    cx.globalCompositeOperation = 'source-over'; cx.globalAlpha = 1; cx.clearRect(0, 0, w, h);
    var f = [];
    if (P.brillo) f.push('brightness(' + (1 + P.brillo * 0.5) + ')');
    if (P.contraste) f.push('contrast(' + (1 + P.contraste) + ')');
    if (P.sat) f.push('saturate(' + (1 + P.sat) + ')');
    if (P.bn) f.push('grayscale(' + P.bn + ')');
    if (P.sepia) f.push('sepia(' + P.sepia + ')');
    cx.filter = f.length ? f.join(' ') : 'none'; cx.drawImage(src, 0, 0); cx.filter = 'none';
    cx.globalCompositeOperation = 'source-atop';
    if (P.temp) { cx.fillStyle = P.temp > 0 ? 'rgba(255,150,40,' + Math.min(0.5, P.temp * 0.2) + ')' : 'rgba(40,120,255,' + Math.min(0.5, -P.temp * 0.2) + ')'; cx.fillRect(0, 0, w, h); }
    if (P.vineta) { var gr = cx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.25, w / 2, h / 2, Math.hypot(w, h) * 0.55); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,' + P.vineta * 0.9 + ')'); cx.fillStyle = gr; cx.fillRect(0, 0, w, h); }
    if (P.vhs) {
      var k = Math.floor(t * 24); if (k !== this.ultimoRuido) { this.ultimoRuido = k; var nc = this.ruido.getContext('2d'), im = nc.createImageData(128, 128); for (var i = 0; i < im.data.length; i += 4) { var v = Math.random() * 255; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; } nc.putImageData(im, 0, 0); }
      cx.globalAlpha = 0.14 * P.vhs; cx.fillStyle = cx.createPattern(this.ruido, 'repeat'); cx.fillRect(0, 0, w, h);
      cx.globalAlpha = 0.12 * P.vhs; cx.fillStyle = '#000'; for (var y = 0; y < h; y += 4) cx.fillRect(0, y, w, 1.5);
      cx.globalAlpha = 1;
    }
    cx.globalCompositeOperation = 'source-over';
    if (c.croma && c.croma.on) {
      var im2 = cx.getImageData(0, 0, w, h), d = im2.data, yc = cromaYC(c.croma.color || '#00ff00'), tol = (c.croma.tol == null ? 0.3 : c.croma.tol) * 0.5, su = (c.croma.suave == null ? 0.1 : c.croma.suave) * 0.5 + 0.001;
      for (var j = 0; j < d.length; j += 4) {
        if (!d[j + 3]) continue; var r = d[j] / 255, gg = d[j + 1] / 255, b = d[j + 2] / 255;
        var dist = Math.hypot(-0.168736 * r - 0.331264 * gg + 0.5 * b - yc[0], 0.5 * r - 0.418688 * gg - 0.081312 * b - yc[1]), m = Math.max(0, Math.min(1, (dist - tol) / su)); m = m * m * (3 - 2 * m);
        d[j + 3] *= m;
      }
      cx.putImageData(im2, 0, 0);
    }
    return this.cv;
  };
  g.VE = g.VE || {};
  g.VE.efectos = {
    crear: function () { try { var f = new FxGL(); f.tipo = 'webgl'; return f; } catch (e) { var f2 = new Fx2D(); f2.tipo = '2d'; return f2; } },
    crear2D: function () { var f = new Fx2D(); f.tipo = '2d'; return f; }
  };
})(window);
