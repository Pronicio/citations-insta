const dotenv = require('dotenv').config().parsed;

const axios = require('axios');
const cheerio = require('cheerio');

const { createClient } = require('pexels');
const pexels = createClient(process.env.PEXELS_TOKEN);

const canvas = require('canvas');
const { createCanvas, loadImage } = canvas;

const fs = require('fs');
const { readFile } = require('fs');
const { promisify } = require('util');
const readFileAsync = promisify(readFile);

const { IgApiClient } = require('instagram-private-api');
const ig = new IgApiClient();

main().then()

async function main() {

    const citation = await randomCitation("art")

    const now = new Date();
    let millisTill10 = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 0, 0, 0) - now;

    if (millisTill10 < 0) {
        millisTill10 += 86400000;
    }

    setInterval(citationOfTheDay, millisTill10);
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

    return {
        text: text.text(),
        author: author.text()
    }
}

async function randomCitation(word) {
    const page = Math.floor(Math.random() * 100)

    const scrap = await axios({
        url: `https://www.dicocitations.com/citation/${word}/1/${page}.php`,
        method: "get"
    })

    const $ = cheerio.load(scrap.data, { decodeEntities: true });

    const data = []

    $('blockquote').each((index, element) => {
        const el = $(element)
        const text = el.text()
        console.log(text);

        const parent = el.next().next().next()
        const author = parent.children().children().text()

        data.push({ text, author })
    });

    const citation = data[Math.floor(Math.random() * data.length)];
    const photo = await getPhoto(word)

    await makeImage(citation.text, citation.author, photo.src.original, photo.avg_color)
}

async function getPhoto(theme, page) {
    const params = {
        query: theme,
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

async function makeImage(citation, author, photo, avg_color) {
    const canvas = createCanvas(1080, 1080);
    const ctx = canvas.getContext('2d')

    const image = await loadImage(photo)

    const imgSize = Math.min(image.width, image.height);
    const left = (image.width - imgSize) / 2;
    const top = (image.height - imgSize) / 2;

    ctx.drawImage(image, left, top, imgSize, imgSize, 0, 0, ctx.canvas.width, ctx.canvas.height);

    // Dessine un rectangle noir transparent sur l'image
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // Dessine le texte le plus gros possible au centre de l'image, avec un padding de 10px et des retours à la ligne
    let textWidth = ctx.measureText(citation).width;

    let name = 'already.json';
    let file = JSON.parse(fs.readFileSync(name).toString());
    let arrayPhrases = file.phrases

    let find = arrayPhrases.find(phrase => phrase === citation);
    if (find) return false

    arrayPhrases.push(citation)
    fs.writeFileSync(name, JSON.stringify(file));

    // use font
    ctx.font = 'bold 100px "Helvetica Neue", Helvetica, Arial, sans-serif';

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'white';
    ctx.shadowColor = "black";
    ctx.shadowOffsetX = 10;
    ctx.shadowOffsetY = 10;
    ctx.shadowBlur = 25;

    wrapText(ctx, citation, ctx.canvas.width / 2, ctx.canvas.height / 3, ctx.canvas.width - 20, 100);

    const out = fs.createWriteStream(__dirname + '/out.jpg');
    const stream = canvas.createJPEGStream();
    stream.pipe(out);
    out.on('finish', async () => {
        console.log("Finish !")
        //let resultPhoto = await insta(citation.data, photo, __dirname + '/out.jpg');
        // delete file
        //fs.unlinkSync(__dirname + '/out.jpg');
    });
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = text.split(' ');
    let line = '';

    for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = ctx.measureText(testLine);
        const testWidth = metrics.width;
        if (testWidth > maxWidth && n > 0) {
            ctx.fillText(line, x, y);

            const temp = ctx.fillStyle;
            ctx.fillStyle = 'black';
            ctx.strokeText(line, x, y);
            ctx.fillStyle = temp;

            line = words[n] + ' ';
            y += lineHeight;
        } else {
            line = testLine;
        }
    }
    ctx.fillText(line, x, y);

    const temp = ctx.fillStyle;
    ctx.fillStyle = 'black';
    ctx.strokeText(line, x, y);
    ctx.fillStyle = temp;
}

async function insta(citation, photo, path) {

    let caption = `${citation.quote} | ${citation.name} \n\n #citation #proverbe #quoteoftheday #motivate #successful #sketchart #illustrationart #illustrate #graphic_designer #organism #photocaption #livingthings #happymoment #instaart #happy #font #brand #graphics #event #logo #happythoughts #happymood #graphic_arts #niceatmosphere`;

    const publishResult = await ig.publish.photo({
        file: await readFileAsync(path),
        caption: caption
    });

    return publishResult
}
