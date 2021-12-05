const { createClient } = require('pexels');
const client = createClient('563492ad6f91700001000001e1dade5cc314438294bf4799806e33b5');

const canvas = require('canvas');
const { createCanvas, loadImage } = canvas;

const axios = require('axios');
const fs = require('fs');

(async () => {
    let citationOfDay = await axios.get('https://citations.ouest-france.fr/apis/export.php?json&lite=1&key=464fzer5&t=day')

    let citations = [ 
        'alcool',
        'ambition',
        'amitie', 
        'amour',
        'animaux', 
        'anniversaire',
        'apprendre',
        'argent',
        'art',       
        'attente',
        'autorite',
        'aventure',
        'aveugle',
        'beaute',    
        'besoin',  
        'betise',  
        'blessure',
        'bonheur',
        'changement',
        'choix',
        'comique',
        'communication',
        'compliment',
        'confort',
        'connaissance',
        'conscience',
        'corps' ,
        'couleur',
        'crise',
        'critique',
        'croire',
        'cuisine',
        'culture',
        'danger',
        'deception',
        'decision',
        'defauts',
        'depart',
        'deprime',
        'destin',
    ]
    let theme = citations[Math.floor(Math.random() * citations.length)];
    let citationWithTheme = await axios.get(`https://citations.ouest-france.fr/apis/export.php?json&lite=1&key=464fzer5&t=theme&theme=${theme}`)

    let textCount = citationWithTheme.data.quote.length
    if (textCount >= 127) {
        return console.log("Texte trop grand !")
    }

    const params = {
        query: 'Nature',
        page: Math.floor(Math.random() * 50),
        per_page: Math.floor(Math.random() * 10), 
        orientation: 'square'
    }
    
    client.photos.search(params).then(photos => {
        //console.log(photos)
        client.photos.show({ id: photos.photos[0].id }).then(photo => {
            //console.log(photo)
            drawImage(citationWithTheme.data.quote, photo.src.original).then(async canvas => {

                if (!canvas) return

                // save as jpeg
                const out = fs.createWriteStream(__dirname + '/out.jpg');
                const stream = canvas.createJPEGStream();
                stream.pipe(out);
                out.on('finish', async () => {
                  //const media = await post(__dirname + '/out.jpg', quote + '\n' + `📷 @${r[1]} via Unsplash`);
                  // delete file
                  //fs.unlinkSync(__dirname + '/out.jpg');
                });
            
            })
        });
    });
    
})();

function drawImage(quoteString, url) {
    const canvas = createCanvas(1080, 1080);
    const ctx = canvas.getContext('2d')
  
    return loadImage(url).then((image) => {
      const imgSize = Math.min(image.width, image.height);
    
      const left = (image.width - imgSize) / 2;
      const top = (image.height - imgSize) / 2;
      
      ctx.drawImage(image, left, top, imgSize, imgSize, 0, 0, ctx.canvas.width, ctx.canvas.height);
  
      // Dessine un rectangle noir transparent sur l'image
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  
  
      // Dessine le texte le plus gros possible au centre de l'image, avec un padding de 10px et des retours à la ligne

      let textWidth = ctx.measureText(quoteString).width;

      let name = 'already.json';
      let file = JSON.parse(fs.readFileSync(name).toString());
      let arrayPhrases = file.phrases

      let find = arrayPhrases.find(phrase => phrase === quoteString);
      if (find) {
          console.log('already text')
          return false
      }

      arrayPhrases.push(quoteString)
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
      
      wrapText(ctx, quoteString, ctx.canvas.width / 2, ctx.canvas.height / 3, ctx.canvas.width - 20, 100); 
      
      console.log('Image drawn');
  
      return canvas;
    })
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = text.split(' ');
    let line = '';

    for(let n = 0; n < words.length; n++) {
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
        }
        else {
            line = testLine;
        }
    }
    ctx.fillText(line, x, y);

    const temp = ctx.fillStyle;
    ctx.fillStyle = 'black';
    ctx.strokeText(line, x, y);
    ctx.fillStyle = temp;
}
