import express, { Request, Response } from "express";
import fs from "fs";
import path from "path";
import https from "https";
import dotenv from "dotenv";
import { Client, Pool, PoolClient } from "pg";

//konfiguracija mikroservisne aplikacije (server)
const app = express();
const hostname = "127.0.0.1";
const port = 8080;

//konfiguracija baze podataka
dotenv.config({
  path: path.join(__dirname, "environments/.env.development"),
});
console.log("dirname: ", __dirname);

const pool = new Pool({
  user: process.env.USER as string,
  host: process.env.HOST as string,
  database: process.env.DATABASE as string,
  password: process.env.PASSWORD as string,
  port: parseInt(process.env.PORT as string, 10),
});
console.log("database: ", process.env.DATABASE);

//definiranje osnovne rute
app.get("/", (req: Request, res: Response) => {
  res.send("Zdravo, ovo je osnovna ruta!");
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

//pokretanje  mikroservisne aplikacije (server)
app.listen(port, hostname, () => {
  console.log(`Server je pokrenut na http://${hostname}:${port}`);
});