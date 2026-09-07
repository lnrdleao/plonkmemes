const url = 'https://www.myinstants.com/pt/index/br/?page=1';

async function run() {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7'
      }
    });
    console.log('Status:', res.status);
    const text = await res.text();
    console.log('Length:', text.length);
    
    // Check for sounds in HTML
    // MyInstants buttons usually have play('/media/sounds/....mp3', ...) or data-url or class="instant"
    const matches = [...text.matchAll(/play\('(\/media\/sounds\/[^']+)'/g)];
    console.log('Found sounds with play():', matches.length);
    if (matches.length > 0) {
      console.log('Sample match:', matches[0][1]);
    }
  } catch (err) {
    console.error('Fetch error:', err);
  }
}

run();
