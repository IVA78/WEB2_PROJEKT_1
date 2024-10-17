import express, { Request, Response } from "express";
import fs from "fs";
import path from "path";
import https from "https";
import dotenv from "dotenv";

//konfiguracija mikroservisne aplikacije (server)
const app = express();
const hostname = "127.0.0.1";
const port = 8080;

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

//pokretanje  mikroservisne aplikacije (server)
app.listen(port, hostname, () => {
  console.log(`Server je pokrenut na http://${hostname}:${port}`);
});
