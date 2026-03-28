async function check() {
  const res = await fetch('https://openrouter.ai/api/v1/models');
  const data = await res.json();
  const whisper = data.data.filter(m => m.id.toLowerCase().includes('whisper'));
  console.log('Whisper models:', whisper);
  const audioOptions = data.data.filter(m => m.id.toLowerCase().includes('audio'));
  console.log('Audio models:', audioOptions);
}
check();
