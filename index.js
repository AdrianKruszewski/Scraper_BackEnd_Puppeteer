const puppeteer = require("puppeteer");

// setInterval
(async () => {
  // tablica obiektów z których korzystamy przy zbieraniu inf o kartach
  const urls = [
    //  id potrzebne do odniesienia się do odpowiedniego obiektu aby zapisać zebrane dane, link do strony szukanej karty
    {
      id: "606242414b031f27bcd1cdb7",
      url: "https://www.morele.net/karta-graficzna-gigabyte-geforce-rtx-2060-oc-6gb-gddr6-gv-n2060oc-6gd-2-0-5801846/",
    },

    {
      id: "606242414b031f27bcd1cdb9",
      url: "https://www.morele.net/karta-graficzna-palit-geforce-gtx-1660-dual-6gb-gddr5-ne51660018j9-1161a-5887557/",
    },

    {
      id: "606242414b031f27bcd1cdbc",
      url: "https://www.morele.net/karta-graficzna-zotac-geforce-rtx-3080-trinity-oc-10gb-gddr6x-zt-a30800j-10p-5946596/",
    },

    {
      id: "606242414b031f27bcd1cdbd",
      url: "https://www.morele.net/karta-graficzna-xfx-radeon-rx-6700-xt-swft-309-gaming-12gb-gddr6-rx-67xtyjfdv-8494341/",
    },
  ];

  // ################################   kod do scrapowania po stronach   #################################################

  // uruchomienie przegladarki chromium
  const browser = await puppeteer.launch({
    slowMo: 10,
    headless: false,
    defaultViewport: null,
  }); //.lunch({headless: false}) patrzenie co się zmienia na stronie

  // włączenie nowej strony w przeglądarce
  const page = await browser.newPage();

  // pętla przechodząca po wszystkich obiektach tablicy urls - zaczynamy scrapowac
  for (let i = 0; i < urls.length; i++) {
    const url = urls[i].url;
    const id = urls[i].id;

    // przejście pod podany adres
    await page.goto(url);

    // pobieranie danych ze strony którą przeszukujemy
    let data = await page.evaluate(async (url) => {
      let isAvailable;
      let price;
      let productURL;
      let shopName;

      if (url.includes("x-kom")) {
        if (document.querySelector(".jHeaik")) {
          isAvailable = document.querySelector(".jHeaik").innerHTML;
        } else {
          isAvailable = document.querySelector(".fmqOOM").innerHTML;
        }
        let pr = document.querySelector(".jFbqvs").innerText;
        price = pr.split(" ").join("");
        productURL = url;
        shopName = "x-kom";
      }

      if (url.includes("mediaexpert")) {
        // jeśli jest jakaś cena to sprawdza dostępność
        if (document.querySelector(".a-price_price")) {
          if (document.querySelector(".is-starred")) {
            isAvailable = document.querySelector(".is-starred").innerHTML;
          } else {
            isAvailable = "dostępna";
          }
          let pr = document.querySelector(".a-price_price").innerHTML;
          price = pr.split(" ").join("");
        }
        productURL = url;
        shopName = "Media Expert";
      }

      if (url.includes("morele")) {
        // pobranie ceny
        let pr = document.querySelector("#product_price_brutto").innerText;
        pr = pr.split(" ").join("");
        price = pr.replace("zł", "");
        if (price !== null) {
          isAvailable = "dostępna";
        }
        productURL = url;
        shopName = "Morele";
      }
      const date = new Date();

      if (isAvailable === "dostępna" || isAvailable === "dostępny") {
        isAvailable = true;
      } else {
        isAvailable = false;
      }

      let obj = {
        ProductURL: productURL,
        ShopName: shopName,
        IsAvailable: isAvailable,
        Price: parseFloat(price.replace("zł", "")),
        SnapshotDate: date.toISOString(),
      };

      return obj;
    }, url);

    // po sprawdzeniu info na temat karty
    // #############################################   wysyłamy zapytanie do bazy o zapisanie snapshota   #################################################
    const browserSend = await puppeteer.launch();
    const pageSend = await browserSend.newPage();

    await pageSend.setRequestInterception(true);

    // utworzenie zapytania do bazy
    pageSend.once("request", (interceptedRequest) => {
      interceptedRequest.continue({
        method: "GET",
        postData: JSON.stringify(data),
        // body: JSON.stringify(data),
        headers: {
          ...interceptedRequest.headers(),
          "Content-Type": "application/json",
        },
      });
    });

    // wysłanie zapytania o zapis do bazy
    const response = await pageSend.goto(
      "https://gpustocksapi.azurewebsites.net/api/gpu/addsnapshot?id=" + id
    );

    // wyświetlenie zwrotki po zapisie do bazy
    console.log({
      url: response.url(),
      statusCode: response.status(),
      body: await response.text(),
    });

    // zamknięcie przegladarki po zapisaniu danych do bazy
    await browserSend.close();
    // ###############################   KONIEC ZAPISU SNAPA DO BAZY  #################################

    console.log(data);
  }
  // zamknięcie przeglądarki scrapującej
  await browser.close();
})();
