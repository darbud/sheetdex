// Web server

import { spawn } from 'child_process';
import express from 'express';
import bodyParser from 'body-parser';
import querystring from 'querystring';

const {PORT = 8080} = process.env;

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.enable('trust proxy');

app.get('/', (req, res) => {
  console.log(`[${(new Date()).toISOString()}] ${req.ip} ${req.get('User-Agent')}: ${req.query.query || '(empty)'}`);
  spawnExpress('npm', ['run', 'query', req.query.query || ''], (code, output) => {
    res.set('Content-Type', 'text/plain');
    res.send(output);
  });
});

function spawnExpress(pgm, args, done) {
  const run = spawn(pgm, args);

  let output = '';
  run.stdout.on('data', (data) => {
    output += `${data}`;
  });

  run.stderr.on('data', (data) => {
    output += `${data}`;
  });

  run.on('close', (code) => {
    done(code, output);
  });
}

const server = app.listen(PORT, function() {
  console.log(`Sheetdex is listening on port ${PORT}...`);
});