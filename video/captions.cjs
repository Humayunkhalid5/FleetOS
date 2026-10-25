// Writes an .srt caption file (same line breaks as the on-screen captions).
//   node video/captions.cjs   → docs/FleetOS-Showcase.srt
const fs = require('fs');
const path = require('path');

const timeline = JSON.parse(fs.readFileSync(path.join(__dirname, 'build', 'timeline.json'), 'utf8'));
// Balanced caption lines: roughly equal length, breaking at commas when one is near.
function splitCaption(text) {
  const words = text.replace(/\s+/g, ' ').trim().split(' ');
  const count = words.length <= 10 ? 1 : Math.ceil(words.length / 8);
  const cuts = [];
  for (let i = 1; i < count; i += 1) {
    let cut = Math.round((i * words.length) / count);
    for (const delta of [0, 1, -1, 2, -2]) {
      const candidate = cut + delta;
      if (candidate > (cuts.at(-1) || 0) + 2 && candidate < words.length - 2 && /[,;:—]$/.test(words[candidate - 1])) { cut = candidate; break; }
    }
    cuts.push(cut);
  }
  return [0, ...cuts].map((start, index) => words.slice(start, cuts[index] ?? words.length).join(' '));
}
const chunks = [];
timeline.scenes.forEach((scene) => scene.sentences.forEach((line) => {
  const groups = splitCaption(line.text);
  const total = groups.reduce((sum, group) => sum + group.length, 0);
  let cursor = line.start;
  groups.forEach((group) => { const length = (line.end - line.start) * (group.length / total); chunks.push({ text: group, start: cursor, end: cursor + length }); cursor += length; });
}));
const stamp = (seconds) => {
  const ms = Math.round(seconds * 1000);
  const pad = (value, size = 2) => String(value).padStart(size, '0');
  return `${pad(Math.floor(ms / 3600000))}:${pad(Math.floor(ms / 60000) % 60)}:${pad(Math.floor(ms / 1000) % 60)},${pad(ms % 1000, 3)}`;
};
const srt = chunks.map((chunk, index) => `${index + 1}\n${stamp(chunk.start)} --> ${stamp(Math.min(chunk.end + 0.2, chunks[index + 1]?.start ?? chunk.end + 0.2))}\n${chunk.text}\n`).join('\n');
const output = path.resolve(__dirname, '..', 'docs', 'FleetOS-Showcase.srt');
fs.writeFileSync(output, srt, 'utf8');
console.log('wrote', output, chunks.length, 'captions');
