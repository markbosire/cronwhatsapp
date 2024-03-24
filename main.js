const axios = require('axios');
const cheerio = require('cheerio');
const cron = require('node-cron');
const cron = require('node-cron');
const moment = require('moment-timezone');

// Set Nairobi timezone
const nairobiTimezone = 'Africa/Nairobi';

async function scrapeMoonPhases(url) {
  try {
    const response = await axios.get(url, {
      headers: {
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });
    const $ = cheerio.load(response.data);

    const currentPhase = $('#qlook a').text().trim();
    const currentPhasePercentage = $('#cur-moon-percent').text().trim();
    const currentPhaseImageSrc = $('#cur-moon').attr('src');

    const previousPhaseName = $('.bk-focus__info table tr:nth-child(4) th a').text().trim();
    const previousPhaseDetails = $('.bk-focus__info table tr:nth-child(4) td').text().trim();

    const nextPhaseName = $('.bk-focus__info table tr:nth-child(3) th a').text().trim();
    const nextPhaseDetails = $('.bk-focus__info table tr:nth-child(3) td').text().trim();

    const phases = [];

    $('.moon-phases-card').each((index, element) => {
      const name = $(element).find('h3 a').text().trim();
      const date = $(element).find('.moon-phases-card__date').text().trim();
      const time = $(element).find('.moon-phases-card__time').text().trim();

      phases.push({
        name,
        date,
        time
      });
    });

    return {
      currentPhase,
      currentPhasePercentage,
      currentPhaseImageSrc: `https://www.timeanddate.com/${currentPhaseImageSrc}`,
      previousPhase: {
        name: previousPhaseName,
        details: previousPhaseDetails,
      },
      nextPhase: {
        name: nextPhaseName,
        details: nextPhaseDetails,
      },
      phases
    };
  } catch (error) {
    console.error(error);
    throw new Error('An error occurred while scraping the moon phases.');
  }
}

async function scrapeMoonPosition(url) {
  try {
    const response = await axios.get(url, {
      headers: {
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });
    const $ = cheerio.load(response.data);

    const moonPosition = {
      moonRises: $('.hl td.pdr0.sep[title*="rises"]').text().trim(),
      moonSets: $(' .hl td.pdr0.sep[title*="sets"]').text().trim(),
      moonHighestPoint: $('.hl td.pdr0[title*="crosses the local meridian"]').text().trim(),
    };
    const nextFullMoonDate = $('th:contains("Next Full Moon")').next('td').text().trim();
    moonPosition.nextFullMoonDate = nextFullMoonDate;
    return moonPosition;
  } catch (error) {
    console.error(error);
    throw new Error('An error occurred while scraping the moon position.');
  }
}

async function scrapeSunInfo(url) {
  try {
    const response = await axios.get(url, {
      headers: {
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });
    const $ = cheerio.load(response.data);

    const sunInfo = {
      sunrise: $('th:contains("Sunrise Today")').next('td').text().trim(),
      sunset: $('th:contains("Sunset Today")').next('td').text().trim(),
    };

    return sunInfo;
  } catch (error) {
    console.error(error);
    throw new Error('An error occurred while scraping sun information.');
  }
}

async function scrapeVisiblePlanets(url) {
  try {
    const response = await axios.get(url, {
      headers: {
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });
    const $ = cheerio.load(response.data);

    const visiblePlanets = {};

    $('.bk-focus__info table').each((index, table) => {
      const planetTable = $(table);

      planetTable.find('tr').each((index, row) => {
        const planetName = $(row).find('th').text().replace(': ', '').trim();
        const visibilityTime = $(row).find('td').text().trim();

        if (!visiblePlanets[planetName]) {
          visiblePlanets[planetName] = visibilityTime;
        }
      });
    });

    return visiblePlanets;
  } catch (error) {
    console.error(error);
    throw new Error('An error occurred while scraping visible planets information.');
  }
}

const emojis = {
  'New Moon': '🌑',
  'Waning Crescent': '🌘',
  'Waxing Crescent': '🌒',
  'Waxing Gibbous': '🌖',
  'Full Moon': '🌕',
  'Waning Gibbous': '🌔',
  'First Quarter': '🌓',
  'Third Quarter': '🌗',
  'Last Quarter': '🌗',
  'Mercury': '☿',
  'Venus': '♀️',
  'Earth': '🜨',
  'Mars': '♂️',
  'Jupiter': '♃',
  'Saturn': '♄',
  'Uranus': '♅',
  'Neptune': '♆',
};

function addEmojis(text) {
  const replacements = Object.entries(emojis).flatMap(([key, value]) => [
    {
      pattern: new RegExp(`\\b${key}\\b`, 'gi'),
      replacement: `${value} ${key}`,
    },
    {
      pattern: new RegExp(`^${key}\\b`, 'gi'),
      replacement: `${value} ${key}`,
    },
  ]);

  return replacements.reduce((modifiedText, { pattern, replacement }) => {
    return modifiedText.replace(pattern, replacement);
  }, text);
}

async function sendWhatsAppMessage(apiEndpoint, requestBody) {
  try {
    const response = await axios.post(apiEndpoint, requestBody);
    if (response.data.success) {
     
      return 'successful';
    } else {
    
      throw new Error('Failed to send WhatsApp message');
    }

 
  } catch (error) {
    console.error(error);
    throw new Error('An error occurred while sending the WhatsApp message.');
  }
}

async function main() {
  try {
    const moonPhases = await scrapeMoonPhases('https://www.timeanddate.com/moon/phases/kenya/nairobi');
    const moonPosition = await scrapeMoonPosition('https://www.timeanddate.com/moon/kenya/nairobi');
    const sunInfo = await scrapeSunInfo('https://www.timeanddate.com/sun/kenya/nairobi');
    const visiblePlanets = await scrapeVisiblePlanets('https://www.timeanddate.com/astronomy/night/kenya/nairobi');

    const apiEndpoint = 'http://54.92.161.201:3000/client/sendMessage/ABCD';
    const requestBody = {
      chatId: '254703914693@c.us', // Replace with the actual chat ID
      contentType: 'string',
      content: addEmojis(`Moon Phases 🌝 :\nCurrent Phase: ${moonPhases.currentPhase}\nCurrent Phase Percentage: ${moonPhases.currentPhasePercentage}\nCurrent Phase visualization: ${moonPhases.currentPhaseImageSrc}\nMoon Phase Schedule:\n${moonPhases.phases.map(phase => `${phase.name} - ${phase.date} ${phase.time}`).join('\n')}\nThe Next Full Moon Date: ${moonPosition.nextFullMoonDate}\nThe Moon Rises at around ${moonPosition.moonRises} and it will set at around ${moonPosition.moonSets}\nThe Moon will be at its Highest Point at around ${moonPosition.moonHighestPoint}\n\nSun Information 🌞:\nThe sun will rise at around ${sunInfo.sunrise} and it will set at around ${sunInfo.sunset}\n\nVisible Planets 👽:\n${Object.entries(visiblePlanets).map(([planet, time]) => `${planet}: ${time}`).join('\n')}`),
    };
    const requestBody2 = {
      chatId: '254700445075@c.us', // Replace with the actual chat ID
      contentType: 'string',
      content: addEmojis(`Moon Phases 🌝 :\nCurrent Phase: ${moonPhases.currentPhase}\nCurrent Phase Percentage: ${moonPhases.currentPhasePercentage}\nCurrent Phase visualization: ${moonPhases.currentPhaseImageSrc}\nMoon Phase Schedule:\n${moonPhases.phases.map(phase => `${phase.name} - ${phase.date} ${phase.time}`).join('\n')}\nThe Next Full Moon Date: ${moonPosition.nextFullMoonDate}\nThe Moon Rises at around ${moonPosition.moonRises} and it will set at around ${moonPosition.moonSets}\nThe Moon will be at its Highest Point at around ${moonPosition.moonHighestPoint}\n\nSun Information 🌞:\nThe sun will rise at around ${sunInfo.sunrise} and it will set at around ${sunInfo.sunset}\n\nVisible Planets 👽:\n${Object.entries(visiblePlanets).map(([planet, time]) => `${planet}: ${time}`).join('\n')}`),
    };

    const messageStatus = await sendWhatsAppMessage(apiEndpoint, requestBody);
    const messageStatus2 = await sendWhatsAppMessage(apiEndpoint, requestBody2);

    console.log({ message: 'Message', status: messageStatus });
    console.log({ message: 'Message 2.0', status: messageStatus2 });
  } catch (error) {
    console.error(error);
  }
}



main()
