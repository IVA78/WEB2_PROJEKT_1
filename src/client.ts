import express, { Request, Response } from "express";
import path from "path";

//konfiguracije klijentske aplikacije
const app = express();
const port = 3000;

//postavljanje direktorija za staticke datoteke
app.use(express.static(path.join(__dirname, "./public")));
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "pug");

//definiranje osnovne rute za posluzivanje pocetne stranice
app.get("/", (req: Request, res: Response) => {
  res.render("index");
});

//dohvat poruke sa backenda
async function fetchMessage() {
  // Delay for 2 seconds before trying to fetch
  await new Promise((resolve) => setTimeout(resolve, 2000));

  try {
    const response = await fetch(
      "https://web2-projekt-1-10ez.onrender.com/data"
    );
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const data = await response.json();
    console.log(data.message);
  } catch (error) {
    console.error("Error fetching message:", error);
  }
}

fetchMessage();

//pokretanje klijentskog servera
app.listen(port, () => {
  console.log(`Klijentski server je pokrenut!`);
});
