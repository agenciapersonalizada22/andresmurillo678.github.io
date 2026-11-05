const { prueba, cerca, igual, cierto, fin } = require('./ayuda.js');
const { execFileSync } = require('child_process');
const fs = require('fs'), os = require('os'), path = require('path');
const X = require('../js/muxer.js'), D = require('./demux.js');
const tmp = fs.mkdtempSync(path.join(process.env.TMPDIR || os.tmpdir(), 'mux-'));
const ff = (...a) => execFileSync('ffmpeg', ['-v', 'error', '-y', ...a]);
const probe = (f) => JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-count_frames', '-show_format', '-show_streams', '-of', 'json', f]).toString());
const tiene = (() => { try { execFileSync('ffprobe', ['-version']); return true; } catch (e) { return false; } })();
if (!tiene) { console.log('ffmpeg/ffprobe no disponibles: se omiten pruebas de muxer'); process.exit(0); }

prueba('MP4: remux H.264+AAC validado con ffprobe y decodificacion completa', () => {
  const src = path.join(tmp, 'src.mp4'), dst = path.join(tmp, 'dst.mp4');
  ff('-f', 'lavfi', '-i', 'testsrc=size=160x120:rate=25:duration=2', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=2', '-c:v', 'libx264', '-bf', '0', '-g', '10', '-pix_fmt', 'yuv420p', '-c:a', 'aac', src);
  const s = D.mp4(new Uint8Array(fs.readFileSync(src))), v = s.pistas.find(p => p.tipo === 'vide'), a = s.pistas.find(p => p.tipo === 'soun');
  cierto(v && a && v.tam.length === 50, 'muestras de video ' + v.tam.length);
  const m = new X.MP4({ ancho: v.w, alto: v.h, video: { description: v.desc }, audio: { sr: a.escala, canales: 2, description: a.desc } });
  const bytes = new Uint8Array(fs.readFileSync(src)), vm = s.muestras(v), am = s.muestras(a);
  let t = 0; vm.forEach((d, i) => { m.addVideo(t * 1e6 / v.escala, v.durs[i] * 1e6 / v.escala, !v.keys || v.keys.includes(i + 1), d); t += v.durs[i]; });
  t = 0; am.forEach((d, i) => { m.addAudio(t * 1e6 / a.escala, a.durs[i] * 1e6 / a.escala, d); t += a.durs[i]; });
  fs.writeFileSync(dst, m.finalizar());
  const p = probe(dst), sv = p.streams.find(x => x.codec_type === 'video'), sa = p.streams.find(x => x.codec_type === 'audio');
  igual([sv.codec_name, sv.width, sv.height, +sv.nb_read_frames], ['h264', 160, 120, 50]);
  igual(sa.codec_name, 'aac'); cerca(+p.format.duration, 2, 0.1, 'duracion');
  execFileSync('ffmpeg', ['-v', 'error', '-i', dst, '-f', 'null', '-']);
  const r = D.mp4(new Uint8Array(fs.readFileSync(dst))); igual(r.tipos, ['ftyp', 'moov', 'mdat']);
});
prueba('WebM: remux VP9+Opus validado con ffprobe y decodificacion', () => {
  const src = path.join(tmp, 'src.webm'), dst = path.join(tmp, 'dst.webm');
  ff('-f', 'lavfi', '-i', 'testsrc=size=128x96:rate=20:duration=3', '-f', 'lavfi', '-i', 'sine=frequency=330:duration=3', '-c:v', 'libvpx-vp9', '-g', '20', '-b:v', '200k', '-c:a', 'libopus', src);
  const s = D.webm(new Uint8Array(fs.readFileSync(src)));
  const vb = s.bloques.filter(b => b.pista === 1), ab = s.bloques.filter(b => b.pista === 2);
  cierto(vb.length === 60, 'frames ' + vb.length); cierto(ab.length > 100);
  const m = new X.WebM({ ancho: 128, alto: 96, video: { codec: 'vp9' }, audio: { sr: 48000, canales: 2, description: s.pistas[2].priv } });
  vb.forEach(b => m.addVideo(b.ts * 1000, 50000, b.key, b.data)); ab.forEach(b => m.addAudio(b.ts * 1000, 20000, b.data));
  fs.writeFileSync(dst, m.finalizar());
  const p = probe(dst), sv = p.streams.find(x => x.codec_type === 'video');
  igual([sv.codec_name, sv.width, sv.height, +sv.nb_read_frames], ['vp9', 128, 96, 60]);
  igual(p.streams.find(x => x.codec_type === 'audio').codec_name, 'opus'); cerca(+p.format.duration, 3, 0.15, 'duracion');
  execFileSync('ffmpeg', ['-v', 'error', '-i', dst, '-f', 'null', '-']);
  const r = D.webm(new Uint8Array(fs.readFileSync(dst))); cierto(r.cues >= 1, 'cues'); igual(r.bloques.length, vb.length + ab.length);
});
prueba('MP4 solo video (sin audio)', () => {
  const src = path.join(tmp, 's2.mp4'), dst = path.join(tmp, 'd2.mp4');
  ff('-f', 'lavfi', '-i', 'testsrc=size=64x64:rate=10:duration=1', '-c:v', 'libx264', '-bf', '0', '-pix_fmt', 'yuv420p', src);
  const s = D.mp4(new Uint8Array(fs.readFileSync(src))), v = s.pistas[0], m = new X.MP4({ ancho: 64, alto: 64, video: { description: v.desc } });
  s.muestras(v).forEach((d, i) => m.addVideo(i * 1e5, 1e5, i === 0, d)); fs.writeFileSync(dst, m.finalizar());
  igual(+probe(dst).streams[0].nb_read_frames, 10);
});

fin('muxer');
fs.rmSync(tmp, { recursive: true, force: true });
