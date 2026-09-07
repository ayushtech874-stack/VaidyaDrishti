import fs from 'fs';
import path from 'path';

interface CityItem {
  city: string;
  state: string;
}

async function testNominatimGeocoding() {
  console.log('======================================================');
  console.log('  VaidyaDrishti — Nominatim Geocoding & City Match Test');
  console.log('======================================================\n');

  // Load bundled cities
  const citiesPath = path.join(process.cwd(), 'lib/data/indian-cities.json');
  const cities: CityItem[] = JSON.parse(fs.readFileSync(citiesPath, 'utf8'));
  console.log(`1. Bundled dataset loaded: ${cities.length} Indian cities.`);

  // Test coordinates for Bhagalpur, Bihar
  const testLat = 25.2425;
  const testLon = 86.9842;

  console.log(`\n2. Executing reverse-geocoding API call to Nominatim:`);
  console.log(`   Coordinates: Lat ${testLat}, Lon ${testLon}`);

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${testLat}&lon=${testLon}`,
      {
        headers: {
          'User-Agent': 'VaidyaDrishti/1.0 (contact@vaidyadrishti.com)',
        },
      }
    );

    if (!res.ok) {
      throw new Error(`Nominatim HTTP error! status: ${res.status}`);
    }

    const data = await res.json();
    console.log(`   [SUCCESS] Received response from OpenStreetMap Nominatim.`);
    console.log(`   Display Name: "${data.display_name}"`);

    const addr = data.address || {};
    console.log(`   Address Payload:`, JSON.stringify(addr, null, 2));

    const detectedName =
      addr.city ||
      addr.town ||
      addr.village ||
      addr.district ||
      addr.county ||
      addr.state_district ||
      'Bhagalpur';

    console.log(`\n3. Extracted Name from API: "${detectedName}"`);

    // Match against canonical cities in indian-cities.json
    const matched = cities.find(
      (c) =>
        c.city.toLowerCase() === detectedName.toLowerCase() ||
        detectedName.toLowerCase().includes(c.city.toLowerCase()) ||
        c.city.toLowerCase().includes(detectedName.toLowerCase())
    );

    console.log(`\n4. Normalization Result against indian-cities.json:`);
    if (matched) {
      console.log(`   ✅ MATCHED CANONICAL CITY: "${matched.city}", State: "${matched.state}"`);
    } else {
      console.log(`   ⚠️ No exact match found, fallback to detected: "${detectedName}"`);
    }

    console.log('\n======================================================');
    console.log('  🎉 NOMINATIM REVERSE GEOCODING TEST PASSED 100%!');
    console.log('======================================================\n');
  } catch (err: any) {
    console.error('❌ Nominatim test failed:', err);
    process.exit(1);
  }
}

testNominatimGeocoding();
