const dotenv = require('dotenv').config().parsed;

const axios = require('axios');
const cheerio = require('cheerio');
const sharp = require("sharp")

const puppeteer = require('puppeteer-extra')
const StealthPlugin = require('puppeteer-extra-plugin-stealth')
puppeteer.use(StealthPlugin())

const translate = require('translate-google')

const { createClient } = require('pexels');
const pexels = createClient(process.env.PEXELS_TOKEN);

const fs = require('fs');

main().then()

async function main() {
    const fonts = [ "Amatic SC", "Cantata One", "Graduate", "Kaushan Script", "Lora", "Montserrat", "PT Mono", "Raleway" ]
    const font = (fonts[Math.floor(Math.random() * fonts.length)]).replace(" ", "+")

    await makeImage("Le véritable amour ne meurt jamais. Seuls, les éphémères s'en vont, tels, un feu de paille issu d'une passion sans lendemain.", "Sabrina Desquiens-Mékhloufi", "https://images.pexels.com/photos/755858/pexels-photo-755858.jpeg", "#a5a395", font)
    //const citation = await randomCitation("art")

    const now = new Date();
    let millisTill10 = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 0, 0, 0) - now;

    if (millisTill10 < 0) {
        millisTill10 += 86400000;
    }

    //setInterval(citationOfTheDay, millisTill10);
    //setInterval(CitationTheme, 10800000); //3h
}

async function citationOfTheDay() {
    const scrap = await axios({
        url: "https://www.dicocitations.com/citationdujour.php",
        method: "get"
    })

    const $ = cheerio.load(scrap.data);

    const text = $("blockquote span b")
    const author = $("blockquote span div a")

    const photo = await getPhoto("nature")

    await makeImage(text.text(), author.text(), photo.src.original, photo.avg_color)
}

async function randomCitation(theme) {
    const pageNumber = Math.floor(Math.random() * 155)

    const browser = await puppeteer.launch({
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
        headless: true
    });
    const page = await browser.newPage();

    await page.goto(`https://citations.ouest-france.fr/theme/${theme}/?page=${pageNumber}`, { waitUntil: 'domcontentloaded' });
    const scrap = await page.content()

    await browser.close();

    const $ = cheerio.load(scrap, { decodeEntities: true });

    const data = []

    $('blockquote').each((index, element) => {
        const el = $(element)

        const text = el.find('a').text()
        const author = el.next().text()

        data.push({ text, author })
    });

    const citation = data[Math.floor(Math.random() * data.length)];

    const file = JSON.parse(fs.readFileSync('already.json').toString());
    const arrayPhrases = file.phrases;

    const find = arrayPhrases.find(phrase => phrase === citation);
    if (find) return await randomCitation(theme)

    arrayPhrases.push(citation)
    fs.writeFileSync('already.json', JSON.stringify(file));

    const photo = await getPhoto(theme)

    await makeImage(citation.text, citation.author, photo.src.original, photo.avg_color)
}

async function getPhoto(theme, page) {
    const themeTranslated = await translate(theme, { from: 'fr', to: 'en' })

    const params = {
        query: themeTranslated,
        page: page || Math.floor(Math.random() * 80),
        per_page: 50,
        orientation: 'square'
    }

    const { photos, prev_page } = await pexels.photos.search(params)

    if (!photos[0]) {
        const cut = (prev_page.substring(prev_page.indexOf('&page='), prev_page.lastIndexOf('&per') + 1))
            .replace("&page=", "")
            .replace("&", "")
            .trim()

        return getPhoto(theme, cut)
    }

    const randomItem = photos[Math.floor(Math.random() * photos.length)];
    return await pexels.photos.show({ id: randomItem.id })
}

async function makeImage(citation, author, photo, avg_color, font) {
    const width = 750
    const html = `
    <!doctype html>
    <html>
    <head>
        <title>Document</title>
        <style>
            body { margin: 0; width: ${width}px; height: ${width}px; }
        </style>
    </head>
    <body>
        <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" fill="none" viewBox="0 0 ${width} ${width}" width="${width}" height="${width}">
            <style>@import url("https://fonts.googleapis.com/css2?family=${font}");</style>
            <foreignObject width="100%" height="100%" style="background: url('${photo}?w=${width}') no-repeat;">
                <div id="content" xmlns="http://www.w3.org/1999/xhtml"
                     style="height: 100%; width: 100%; display: flex; flex-flow: column wrap; align-items: center; place-content: center;">
                    <div class="box" style="margin: auto 3rem; text-align: center;">
                        <h1 style="color: white; font-size: 250%; line-height: 5rem; margin: 0;">
                            <span style="background-color: ${avg_color}; font-family: '${font}', sans-serif; box-shadow: ${avg_color} 1rem 0 0, ${avg_color} -1rem 0 0; padding: 0.5rem 0;">
                                ${citation}
                            </span>
                        </h1>
                    </div>
                </div>
            </foreignObject>
        </svg>
    </body>
    </html>
    `

    try {
        console.log("Launching browser... !")

        const browser = await puppeteer.launch({
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
            headless: true
        });
        const page = await browser.newPage();

        await page.setViewport({
            width: width,
            height: width
        });

        await page.setContent(html, { waitUntil: 'networkidle0' });
        console.log("Content set !")

        await page.screenshot({ path: 'out.png' });
        console.log("Screenshot take !")
        await browser.close();

    } catch (err) {
        console.error(err);
    }
}

/*
async function insta(citation, photo, path) {

    let caption = `${citation.quote} | ${citation.name} \n\n #citation #proverbe #quoteoftheday #motivate #successful #sketchart #illustrationart #illustrate #graphic_designer #organism #photocaption #livingthings #happymoment #instaart #happy #font #brand #graphics #event #logo #happythoughts #happymood #graphic_arts #niceatmosphere`;

    const publishResult = await ig.publish.photo({
        file: await readFileAsync(path),
        caption: caption
    });

    return publishResult
}
 */
