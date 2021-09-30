require('dotenv').config()

const ethereum_address = require('ethereum-address')
const bitcore = require('bitcore-lib-cash')
const BITBOX = require('bitbox-sdk').BITBOX
const bitbox = new BITBOX();
const bchaddr = require('bchaddrjs-slp')

const seedBuffer = bitbox.Mnemonic.toSeed(process.env.SEED);
const hdNode = bitbox.HDNode.fromSeed(seedBuffer);
const masterNode = hdNode.derivePath("m/44'/245'/0'");

function getNthAddress(id) {
  const childNode = masterNode.derivePath("0/"+id);
  const wif = bitbox.HDNode.toWIF(childNode);
  return bitcore.PrivateKey.fromWIF(wif).toAddress().toString();
}

const sqlite3 = require('sqlite3').verbose()
const db = new sqlite3.Database('./deposits.db', (err) => {
  if (err) {
    console.error(err.message);
  }

  console.log('Connected to misty lake database');
})
db.run(`CREATE TABLE IF NOT EXISTS deposits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  smartbch TEXT,
  slp TEXT,
  dtime INTEGER
)`)

const express = require('express')
const bodyParser = require('body-parser');

const app = express()
const port = process.env.PORT

app.use(express.static('public'))
app.use(bodyParser.json());

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '/public/index.html'))
})

app.get('/report', (req, res) => {
  db.all('SELECT id, smartbch, slp, dtime FROM deposits', (err, rows) => {
    return res.json(rows);
  });
});

app.post('/request-address', (req, res) => {
  try {
    const data = req.body;
    if (data.account === '') {
      return res.json({
        success: false,
        message: e,
      });
    }

    if (! ethereum_address.isAddress(data.account)) {
      return res.json({
        success: false,
        message: 'bad eth address',
      });
    }

    db.get('SELECT MAX(id) AS mid FROM deposits', (err, result) => {
      const mid = result.mid === null ? 0 : result.mid;
      const bchAddress = getNthAddress(mid);
      const slpAddress = bchaddr.toSlpAddress(bchAddress.split(':')[1])

      db.run(`INSERT INTO deposits (smartbch, slp, dtime) VALUES (?, ?, ?)`, [
        data.account,
        slpAddress,
        (+new Date)/1000|0,
      ])

      return res.json({
        success: true,
        address: slpAddress,
      });
    })
  } catch (e) {
    return res.json({
      success: false,
      message: JSON.stringify(e),
    });
  }
})

app.listen(port, () => {
  console.log(`MistyLake app listening at http://localhost:${port}`)
})
