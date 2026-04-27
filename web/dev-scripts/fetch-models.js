const https = require('https');

const apiKey = "AIzaSyCbvKnyz5osqYqgvHQpKgFciLBljk2jgvM";
const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

https.get(url, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log(data);
  });
}).on('error', (err) => {
  console.error(err.message);
});
