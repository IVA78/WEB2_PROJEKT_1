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

//pokretanje klijentskog servera
app.listen(port, () => {
  console.log(`Klijentski server je pokrenut na http://localhost:${port}/`);
});
