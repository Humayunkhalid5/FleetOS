// Mixes the voiceover, ducked music and effects onto the rendered frames.
//   node video/mix.cjs   → docs/FleetOS-Showcase.mp4
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const BUILD = path.join(__dirname, 'build');
const OUTPUT = path.resolve(__dirname, '..', 'docs', process.argv.slice(2).find((arg) => !arg.startsWith('--')) || 'FleetOS-Showcase.mp4');
const timeline = JSON.parse(fs.readFileSync(path.join(BUILD, 'timeline.json'), 'utf8'));

const inputs = ['-i', path.join(BUILD, 'frames.mp4'), '-i', path.join(BUILD, 'music.wav'), '-i', path.join(BUILD, 'sfx.wav')];
const voiceLabels = [];
const filters = [];
timeline.scenes.forEach((scene, index) => {
  inputs.push('-i', path.join(BUILD, scene.audio));
  const delay = Math.round(scene.voiceStart * 1000);
  filters.push(`[${index + 3}:a]aresample=44100,aformat=channel_layouts=stereo,adelay=${delay}|${delay}[v${index}]`);
  voiceLabels.push(`[v${index}]`);
});
filters.push(`${voiceLabels.join('')}amix=inputs=${voiceLabels.length}:normalize=0,highpass=f=70,acompressor=threshold=-18dB:ratio=3:attack=5:release=120,volume=1.6[voice]`);
filters.push('[voice]asplit=2[voiceOut][voiceKey]');
filters.push('[1:a]volume=0.30[music]');
filters.push('[music][voiceKey]sidechaincompress=threshold=0.03:ratio=8:attack=40:release=500[ducked]');
filters.push('[2:a]aformat=channel_layouts=stereo,volume=0.32[sfx]');
filters.push(`[voiceOut][ducked][sfx]amix=inputs=3:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=11,afade=t=out:st=${(timeline.duration - 2).toFixed(2)}:d=2[aout]`);

if (process.argv.includes('--audio-only')) {
  // Level check without video: write the mixed soundtrack only.
  inputs.splice(0, 2, '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo');
  execFileSync('ffmpeg', ['-y', ...inputs, '-filter_complex', filters.join(';'), '-map', '[aout]', '-t', String(timeline.duration), path.join(BUILD, 'mix-preview.wav')], { stdio: 'inherit' });
  process.exit(0);
}
execFileSync('ffmpeg', ['-y', ...inputs, '-filter_complex', filters.join(';'), '-map', '0:v', '-map', '[aout]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-ar', '44100', '-shortest', '-movflags', '+faststart', OUTPUT], { stdio: 'inherit' });
console.log('wrote', OUTPUT);
