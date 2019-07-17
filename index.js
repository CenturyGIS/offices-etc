require('dotenv').config();
const util = require('util');
const request = util.promisify(require('request'));
const fs   = require('fs');
const yaml = require('js-yaml');

const fileContents = fs.readFileSync('./offices.yml', 'utf8');
const { offices } = yaml.safeLoad(fileContents);

const geoJson = {
  type: 'FeatureCollection',
  features: [],
};
const promises = offices.map((o) => {

  // NOTE: filter statement is akin to _.compact
  const address = [
    o.street,
    o.zip,
  ]
    .filter(Boolean)
    .join(', ');

  return request({
    url: 'https://maps.googleapis.com/maps/api/geocode/json',
    qs: {
      address,
      key: process.env.GOOGLE_GEOCODER_API_KEY,
    },
  });
});

Promise.all(promises)
  .then((results) => {
    results.forEach(({ body }, i) => {
      const { results: [ { geometry: { location } } ]} = JSON.parse(body);
      const o = offices[i];
      geoJson.features.push({
        type: 'Feature',
        properties: Object.assign({}, o),
        geometry: {
          type: "Point",
          coordinates: [
            location.lng,
            location.lat,
          ]
        },
      });
    });
    fs.writeFileSync('offices.geojson', JSON.stringify(geoJson, null, 2), 'utf8');
  });
