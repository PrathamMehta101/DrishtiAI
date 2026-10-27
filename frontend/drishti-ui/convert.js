import ffmpeg from 'ffmpeg-static';
import { exec } from 'child_process';
import path from 'path';

const input = path.resolve('sample', 'Seat No. 12 was seen taking a piece of paper from the desk.mkv');
const output = path.resolve('public', 'demo.mp4');

console.log(`Using ffmpeg at: ${ffmpeg}`);
console.log(`Converting ${input} to ${output}...`);

const command = `"${ffmpeg}" -y -i "${input}" -c:v libx264 -c:a aac "${output}"`;

const proc = exec(command, (error, stdout, stderr) => {
  if (error) {
    console.error(`Error: ${error.message}`);
    return;
  }
  console.log('Conversion successful!');
});

proc.stderr.on('data', (data) => {
  // ffmpeg logs progress to stderr
  console.log(data.toString().trim());
});
