import express, { Request, Response } from "express";
import path from "path";
import dotenv from "dotenv";
import cors from "cors";
import { Pool, PoolClient } from "pg";

//konfiguracija env
dotenv.config({
  path: path.join(__dirname, "environments/.env.development"),
});
console.log("dirname: ", __dirname);

//konfiguracija aplikacije
const app = express();
const port = process.env.PORT || 3000;
app.use(cors());

//konfiguracija baze
const pool = new Pool({
  connectionString: process.env.DB_URL,
  ssl: {
    rejectUnauthorized: false, // Set to true in production for security
  },
});

//postavljanje direktorija za staticke datoteke
app.use(express.static(path.join(__dirname, "./public")));
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "pug");

//definiranje osnovne rute za posluzivanje pocetne stranice
app.get("/", (req: Request, res: Response) => {
  res.render("index");
});

//definiranje rute za prikaz podataka
app.get("/data", (req: Request, res: Response) => {
  const exampleData = {
    message: "Ovo je neki podatak",
    value: 33,
  };
  res.json(exampleData);
});

//povezivanje s bazom - instanciranje veze
async function connect(): Promise<PoolClient | null> {
  const client = await pool.connect();
  try {
    console.log("Connected to the database successfully");
    const { rows } = await client.query("SELECT current_user");
    const currentUser = rows[0]["current_user"];
    console.log(`Current user: ${currentUser}`);
    return client;
  } catch (error) {
    console.error("Failed to connect to the database:", error);
    return null;
  } finally {
    client.release();
  }
}
connect();

//pokretanje klijentskog servera
app.listen(port, () => {
  console.log(`Klijentski server je pokrenut!`);
});
