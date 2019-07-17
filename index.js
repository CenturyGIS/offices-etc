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
  return request({
    url: 'https://maps.googleapis.com/maps/api/geocode/json',
    qs: {
      address: `${o.street}, ${o.zip}`,
      key: process.env.GOOGLE_GEOCODER_API_KEY,
    },
  });
});

Promise.all(promises)
  .then((results) => {
    results.forEach(({ body }, i) => {
      const { results: [ { geometry: { location } }, ...others ]} = JSON.parse(body);
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
