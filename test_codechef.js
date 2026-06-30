const https = require('https');

function fetchHtml(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function run() {
  const html = await fetchHtml('https://www.codechef.com/users/sidhu_2512');
  
  // Rating
  const ratingMatch = html.match(/class="rating-number"[^>]*>\s*(\d+)/);
  // Stars
  const starsMatch = html.match(/class="rating-star"[^>]*>([\s\S]*?)<\/span>/);
  // Highest Rating
  const highestMatch = html.match(/Highest Rating\s*(?:<[^>]+>\s*)*(\d+)/i);
  // Global Rank
  const globalRankMatch = html.match(/Global Rank[\s\S]*?<a[^>]*>\s*([0-9]+)/i);
  // Country Rank
  const countryRankMatch = html.match(/Country Rank[\s\S]*?<a[^>]*>\s*([0-9]+)/i);
  // Name
  const nameMatch = html.match(/class="h2-style"[^>]*>([^<]+)<\/h2>/i) || html.match(/class="m-username--link"[^>]*>([^<]+)/i) || html.match(/<h1[^>]*>([^<]+)<\/h1>/i);

  // Contest Count (from ratingData or script)
  const contestsMatch = html.match(/"all":\[(.*?)\]/);
  let contestCount = 0;
  if (contestsMatch && contestsMatch[1]) {
    // Try to parse the json array inside 'all': [...]
    try {
      const arr = JSON.parse(`[${contestsMatch[1]}]`);
      contestCount = arr.length;
    } catch(e) {}
  }

  console.log({
    ratingMatch: ratingMatch ? ratingMatch[1] : null,
    highestMatch: highestMatch ? highestMatch[1] : null,
    starsMatch: starsMatch ? starsMatch[1] : null,
    globalRankMatch: globalRankMatch ? globalRankMatch[1] : null,
    countryRankMatch: countryRankMatch ? countryRankMatch[1] : null,
    nameMatch: nameMatch ? nameMatch[1] : null,
    contestCount
  });
}
run();
