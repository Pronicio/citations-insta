<template>
  <section>

    <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" fill="none"
         :viewBox="`0 0 ${width} ${width}`" :width="width" :height="width">
      <foreignObject width="100%" height="100%" :style="`background: url('${photo}?w=${width}&h=${width}') no-repeat`">
        <div id="content" xmlns="http://www.w3.org/1999/xhtml"
             style="height: 100%;width: 100%;display: flex;flex-direction: column;flex-wrap: wrap;align-items: center;justify-content: center;align-content: center;">
          <div class="box" style="margin: auto 3rem;text-align: center;">
            <h1 style="color: white;font-size: 250%;line-height: 5rem;margin: 0;">
              <span
                  :style="`background-color: ${avg_color}; font-family: ${font}; box-shadow: 1rem 0 0 ${avg_color}, -1rem 0 0 ${avg_color}; padding: 0.5rem 0; box-decoration-break: clone;`">
                {{ citation }}
              </span>
            </h1>
          </div>
        </div>
      </foreignObject>
    </svg>

  </section>
</template>

<script>
import cheerio from 'cheerio'

export default {
  data: function () {
    return {
      width: 750,
      citation: "La vraie richesse d'un homme en ce monde se mesure au bien qu'il a fait autour de lui.",
      author: "Sabrina Desquiens-Mékhloufi",
      photo: "https://images.pexels.com/photos/755858/pexels-photo-755858.jpeg",
      avg_color: "#a5a395",
      fonts: [
        "Amatic SC", "Cantata One", "Graduate", "Kaushan Script", "Lora", "Montserrat", "PT Mono", "Raleway"
      ],
      font: null
    }
  },
  async mounted() {
    this.font = this.fonts[Math.floor(Math.random() * this.fonts.length)]
    await this.delay(5000)
    this.exportSvg()
  },
  methods: {
    delay: ms => new Promise(res => setTimeout(res, ms)),
    exportSvg: function () {
      const svg = document.querySelector("section")
      const $ = cheerio.load(svg.innerHTML, null, false);
      $("svg").append(`<style>@import url("https://fonts.googleapis.com/css2?family=${this.font.replace(' ', '+')}");</style>`)
      console.log($.html())
    },
    invertColor: function (hex, bw) {
      if (hex.indexOf('#') === 0) {
        hex = hex.slice(1);
      }

      if (hex.length === 3) {
        hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
      }

      if (hex.length !== 6) {
        throw new Error('Invalid HEX color.');
      }

      let r = parseInt(hex.slice(0, 2), 16),
          g = parseInt(hex.slice(2, 4), 16),
          b = parseInt(hex.slice(4, 6), 16);

      if (bw) {
        return (r * 0.299 + g * 0.587 + b * 0.114) > 186
            ? '#000000'
            : '#FFFFFF';
      }

      r = (255 - r).toString(16);
      g = (255 - g).toString(16);
      b = (255 - b).toString(16);

      return "#" + this.padZero(r) + this.padZero(g) + this.padZero(b);
    },
    padZero: function (str, len) {
      len = len || 2;
      const zeros = new Array(len).join('0');
      return (zeros + str).slice(-len);
    }
  }
}

</script>
