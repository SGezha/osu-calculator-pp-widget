const express = require('express'),
  app = express(),
  osuToken = "<osu! TOKEN>",
  fs = require("fs"),
  readline = require('readline'),
  ojsama = require('ojsama'),
  axios = require('axios');

app.use(express.static('assets'));
let last = { id: 0 };

app.get('/', function (request, response) {
  if (request.query.b) {
    response.sendFile(__dirname + '/calc.html');
  } else {
    response.redirect(`/?b=1718489`)
  }
});

app.get('/calc', async (req, res) => {
  if (last.id == req.query.id) {
    let parser = new ojsama.parser();
    readline.createInterface({ input: fs.createReadStream("map.osu") }).on("line", parser.feed_line.bind(parser)).on("close", async () => {
      let map = parser.map,
        miss = 0,
        acc = 100,
        combo = map.max_combo();
      if (req.query.combo != -1) combo = req.query.combo;
      if (req.query.miss != -1) miss = req.query.miss;
      if (req.query.acc != 100) acc = req.query.acc;
      let star = new ojsama.diff().calc({ map: map, mods: req.query.mods }),
        pp = ojsama.ppv2({ stars: star, combo: parseInt(combo), nmiss: parseInt(miss), acc_percent: parseFloat(acc) }).total,
        stats = new ojsama.std_beatmap_stats({ ar: map.ar, od: map.od, cs: map.cs, hp: map.hp }).with_mods(req.query.mods);
      res.json({ id: req.query.id, stats: { star: Math.round(star.total * 100) / 100, ar: Math.round(stats.ar * 10) / 10, cs: stats.cs, od: Math.round(stats.od * 10) / 10, hp: stats.hp, bpm: last.stats.rawbpm * parseFloat(stats.speed_mul) }, pp: Math.round(pp * 100) / 100, miss: miss, combo: combo, title: { artist: map.artist, title: map.title, diff: map.version }, acc: acc, bmid: last.bmid });
    })
  } else {
    let osu = await axios.get(`https://osu.ppy.sh/osu/${req.query.id}`);
    fs.writeFileSync("map.osu", osu.data);
    let parser = new ojsama.parser();
    readline.createInterface({ input: fs.createReadStream("map.osu") }).on("line", parser.feed_line.bind(parser)).on("close", async () => {
      let map = parser.map,
        miss = 0,
        acc = 100,
        combo = map.max_combo();
      if (req.query.combo != -1) combo = req.query.combo;
      if (req.query.miss != -1) miss = req.query.miss;
      if (req.query.acc != 100) acc = req.query.acc;
      let osuapi = await axios.get(`https://osu.ppy.sh/api/get_beatmaps?k=${osuToken}&b=${req.query.id}`);
      let star = new ojsama.diff().calc({ map: map, mods: req.query.mods }),
        pp = ojsama.ppv2({ stars: star, combo: parseInt(combo), nmiss: parseInt(miss), acc_percent: parseFloat(acc) }).total,
        stats = new ojsama.std_beatmap_stats({ ar: map.ar, od: map.od, cs: map.cs, hp: map.hp }).with_mods(req.query.mods);
      last = { id: req.query.id, stats: { star: Math.round(star.total * 100) / 100, ar: Math.round(stats.ar * 10) / 10, cs: stats.cs, od: Math.round(stats.od * 10) / 10, hp: stats.hp, rawbpm: parseInt(osuapi.data[0].bpm), bpm: parseInt(osuapi.data[0].bpm) * parseFloat(stats.speed_mul) }, pp: Math.round(pp * 100) / 100, miss: miss, combo: combo, title: { artist: map.artist, title: map.title, diff: map.version }, acc: acc, bmid: osuapi.data[0].beatmapset_id };
      res.json(last);
    })
  }
});

const listener = app.listen(process.env.PORT, function () {
  console.log('Работает');
});
