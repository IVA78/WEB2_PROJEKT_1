import express, { NextFunction, Request, Response } from "express";
import path from "path";
import dotenv from "dotenv";
import cors from "cors";
import { Pool, PoolClient, QueryResult } from "pg";
import { BIGINT } from "sequelize";
import axios from "axios";
import { auth } from "express-oauth2-jwt-bearer";
import https from "https";
import fs from "fs";
import request from "request";

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

//slanje upita u bazu
async function connect(
  queryText: string,
  params: any[] = []
): Promise<QueryResult | null> {
  let client: PoolClient | null = null;
  try {
    //povezivanje s bazom - dohvat instance veze
    client = await pool.connect();
    console.log("Connected to the database successfully");

    const result = await client.query(queryText, params);
    return result;
  } catch (error) {
    console.error("Failed to execute query:", error);
    return null;
  } finally {
    if (client) {
      client.release();
    }
  }
}

//inicijalno postavljanje baze
async function databaseInit() {
  const queryText1 = `CREATE TABLE IF NOT EXISTS ticket_owner (
                        vatin BIGINT PRIMARY KEY, --OIB
                        firstName VARCHAR(100) NOT NULL,
                        lastName VARCHAR(100) NOT NULL
                      `;
  const queryText2 = `CREATE TABLE IF NOT EXISTS ticket (
                        ticket_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                        owner_oib BIGINT NOT NULL,
                        FOREIGN KEY (owner_oib) REFERENCES ticket_owner(vatin));`;
  const queryText3 = `SELECT table_name
                        FROM information_schema.tables
                        WHERE table_schema = 'public';`;
  //no params needed for any of the queries
  await connect(queryText1);
  await connect(queryText2);
  const result = await connect(queryText3);

  if (result) {
    console.log("Query result:", result.rows);
  } else {
    console.log("Query execution failed.");
  }
}
//databaseInit();

//dohvat broja generiranih ulaznica iz baze
async function getNumberOfTickets(): Promise<number | null> {
  const queryText = `SELECT count(*) FROM ticket`;
  const result = await connect(queryText);

  if (result && result.rows.length > 0) {
    const count = parseInt(result.rows[0].count, 10);
    return count;
  } else {
    console.log("Failed to get the number of tickets.");
    return null;
  }
}

//definiranje sucelja koje prosiruje Request
interface CustomRequest extends Request {
  firstFunctionData?: any; // dodavanje novog propertyja
}

//Client Credentials Flow sa OAuth2
const clientCredentialsFlow = async function (
  req: CustomRequest,
  res: Response,
  next: NextFunction
): Promise<string | any> {
  //dobijanje access tokena
  try {
    const response = await axios.post(
      `${process.env.AUTH_SERVER}/oauth/token`,
      {
        audience: process.env.AUDIENCE,
        grant_type: process.env.GRANT_TYPE,
        client_id: process.env.CLIENT_ID,
        client_secret: process.env.CLIENT_SECRET,
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    req.firstFunctionData = response;
    next();
  } catch (error) {
    console.error(
      "Error fetching access token:",
      error.response ? error.response.data : error.message
    );
    return res.status(500).json({ message: "Failed to obtain access token" });
  }
};

//definiranje osnovne rute za posluzivanje pocetne stranice
app.get("/", async (req: Request, res: Response) => {
  try {
    //dohvat broja generiranih ulaznica
    const count = await getNumberOfTickets();
    console.log("count:", count);

    //renderiranje broja ulaznica
    res.render("index", {
      ticketCount: count,
    });
  } catch (error) {
    console.error("Error fetching ticket count:", error);
    res.status(500).send("An error occurred while fetching the ticket count.");
  }
});

//pristupna tocka za generiranje ulaznice
app.post(
  "/generate-ticket",
  clientCredentialsFlow,
  async (req: CustomRequest, res: Response) => {
    try {
      //kontrolni ispis dobivenog tokena
      console.log("Token: ", req.firstFunctionData.data.access_token);

      //generiranje ulaznice
      console.log("Generiram ulaznicu!");
    } catch (error) {
      res
        .status(500)
        .json({ message: "An error occurred while generating the ticket" });
    }
  }
);

//definiranje rute za prikaz podataka
app.get("/data", (req: Request, res: Response) => {
  const exampleData = {
    message: "Ovo je neki podatak",
    value: 33,
  };
  res.json(exampleData);
});

//pokretanje klijentskog servera
https
  .createServer(
    {
      key: fs.readFileSync("server.key"),
      cert: fs.readFileSync("server.cert"),
    },
    app
  )
  .listen(port, () => {
    console.log(`Klijentski server je pokrenut!`);
  });
