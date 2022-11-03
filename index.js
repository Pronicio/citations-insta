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

const FormData = require('form-data');
const fs = require('fs');
const themes = require("./themes.json")

const { IgApiClient } = require('instagram-private-api')

class Main {
    constructor() {
        this.instaConnect().then(async () => {
            await this.randomCitation()
        })
    }

    async instaConnect() {
        this.ig = new IgApiClient();
        this.ig.state.generateDevice(process.env.INSTA_USERNAME);

        await this.ig.simulate.preLoginFlow();
        await this.ig.account.login(process.env.INSTA_USERNAME, process.env.INSTA_PASSWORD);
        console.log("Instagram connected !");
    }

    async citationOfTheDay() {
        const scrap = await axios({
            url: "https://www.dicocitations.com/citationdujour.php",
            method: "get"
        })

        const $ = cheerio.load(scrap.data);

        const text = $("blockquote span b")
        const author = $("blockquote span div a")

        const photo = await getPhoto("nature")

        await this.makeImage(text.text(), author.text(), photo.src.original, photo.avg_color)
    }

    async randomCitation() {
        const theme = themes[Math.floor(Math.random() * themes.length)]
        const pageNumber = Math.floor(Math.random() * 155) //TODO: Get the last page !!

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
        if (find) return await this.randomCitation(theme)

        arrayPhrases.push(citation)
        fs.writeFileSync('already.json', JSON.stringify(file));

        console.log("Scrap the citation !")

        const photo = await this.getPhoto(theme)

        console.log("Photo get !")

        await this.makeImage(citation.text, citation.author, photo.src.original, photo.avg_color)
    }

    async getPhoto(theme, page) {
        const themeTranslated = await translate(theme, { from: 'fr', to: 'en' })

        const params = {
            query: themeTranslated,
            page: page || Math.floor(Math.random() * 80),
            per_page: 50,
            orientation: 'square'
        }

        const { photos, prev_page } = await pexels.photos.search(params)

        if (!photos[0]) {
            try {
                const cut = (prev_page.substring(prev_page.indexOf('&page='), prev_page.lastIndexOf('&per') + 1))
                    .replace("&page=", "")
                    .replace("&", "")
                    .trim()

                return this.getPhoto(theme, cut)
            } catch (e) {
                console.log(prev_page, theme)
                return this.getPhoto(theme)
            }
        }

        const randomItem = photos[Math.floor(Math.random() * photos.length)];
        return await pexels.photos.show({ id: randomItem.id })
    }

    async makeImage(citation, author, photo, avg_color) {
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
            <foreignObject width="100%" height="100%" style="background: url('${photo}?w=${width}') no-repeat;">
                <div id="content" xmlns="http://www.w3.org/1999/xhtml"
                     style="height: 100%; width: 100%; display: flex; flex-flow: column wrap; align-items: center; place-content: center;">
                    <div class="box" style="margin: auto 3rem; text-align: center;">
                        <h1 style="color: white; font-size: 250%; line-height: 5rem; margin: 0;">
                            <span style="background-color: ${avg_color}; font-family: sans-serif; box-shadow: ${avg_color} 1rem 0 0, ${avg_color} -1rem 0 0; padding: 0.5rem 0;">
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

            await page.screenshot({
                path: 'out.jpeg',
                type: 'jpeg',
                quality: 100
            });
            console.log("Screenshot take !")
            await browser.close();

            await this.publish(citation, author)

        } catch (err) {
            console.error(err);
        }
    }

    async publish(citation, author) {
        const caption = `${citation} | ${author} \n\n\n #citation #proverbe #quoteoftheday #motivate #successful #sketchart #illustrationart #illustrate #graphic_designer #organism #photocaption #livingthings #happymoment #instaart #happy #font #brand #graphics #event #logo #happythoughts #happymood #graphic_arts #niceatmosphere`;

        await this.ig.publish.photo({
            file: fs.readFileSync("out.jpeg"),
            caption: caption,
        });

        console.log("Photo published !");
    }
}

new Main()
