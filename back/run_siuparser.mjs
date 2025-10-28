import { parseSIU } from "./siuparser.mjs";

process.stdin.setEncoding('utf8');

let rawdata = '';

// concatenamos los chunks de texto y se lo mandamos directo al parser
process.stdin.on('data', chunk => {
  rawdata += chunk;
});

process.stdin.on('end', () => {
  const result = parseSIU(rawdata);
  console.log(JSON.stringify(result, null, 2));
});
