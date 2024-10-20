import express, { NextFunction, Request, Response } from "express";
import path from "path";
import dotenv from "dotenv";
import cors from "cors";
import { Pool, PoolClient, QueryResult } from "pg";
import { BIGINT } from "sequelize";
import axios from "axios";
import fs from "fs";
import request from "request";
import { v4 as uuidv4 } from "uuid";
import QRCode from "qrcode";
import { auth, requiresAuth } from "express-openid-connect";
import { UUID } from "crypto";

//definiranje porta
const port = process.env.PORT || 3000;

//konfiguracija env
dotenv.config({
  path: path.join(__dirname, "environments/.env.development"),
});
console.log("dirname: ", __dirname);

//konfiguracija za autentifikaciju
const config = {
  authRequired: false,
  idpLogout: true,
  secret: process.env.SECRET,
  baseURL: `https://web2-projekt-1-10ez.onrender.com`, //PROMIJENITI KOD DEPLOYA
  clientID: process.env.CLIENT_ID,
  issuerBaseURL: process.env.AUTH_SERVER,
  clientSecret: process.env.CLIENT_SECRET,
  authorizationParams: {
    response_type: "code",
    //scope: "openid profile email"
  },
};

//konfiguracija aplikacije
const app = express();
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(auth(config));

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
  //await connect("DROP TABLE ticket_owner");
  //await connect("DROP TABLE ticket");
  const queryText1 = `CREATE TABLE IF NOT EXISTS ticket_owner (
                        vatin VARCHAR(100) PRIMARY KEY, --OIB
                        firstName VARCHAR(100) NOT NULL,
                        lastName VARCHAR(100) NOT NULL);`;
  const queryText2 = `CREATE TABLE IF NOT EXISTS ticket (
                        ticket_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                        owner_oib VARCHAR(100) NOT NULL,
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
      //console.log("Token: ", req.firstFunctionData.data.access_token);

      //generiranje ulaznice
      console.log("Generiram ulaznicu!");

      //dohvat podataka iz forme
      const { OIB, firstName, lastName } = req.body;
      console.log("Received form data:", { OIB, firstName, lastName });
      //provjera podataka iz forme
      if (!OIB || !firstName || !lastName) {
        res.status(400).json({
          message: "All fields are required: vatin, firstName, and lastName.",
        });
        return;
      }

      //spremi novog vlasnika ulaznice u bazu (ako vec ne postoji sa istim OIB-om)
      const queryText1 = `INSERT INTO ticket_owner (vatin, firstName, lastName)
                         VALUES ('${OIB}', '${firstName}', '${lastName}')
                         ON CONFLICT (vatin) DO NOTHING;`;
      await connect(queryText1);

      //provjera broja ulaznica sa istim OIB-om (max 3)
      const queryText2 = `SELECT COUNT(*)
                          FROM ticket
                          WHERE owner_oib = '${OIB}';`;
      const result = await connect(queryText2);
      const count: number = result ? parseInt(result.rows[0].count, 10) : -1;

      if (count != -1) {
        if (count >= 3) {
          res
            .status(400)
            .json({ message: "Vatin already used for three tickets!" });
          return;
        } else {
          //generiranje nove ulaznice

          const queryText3 = `INSERT INTO ticket (owner_oib)
                              VALUES ( ${OIB})
                              RETURNING ticket_id`;
          const result = await connect(queryText3);
          const ticket_id = result ? result.rows[0].ticket_id : 0;
          const created_at = result ? result.rows[0].created_at : 0;
          console.log(`(${ticket_id}, ${created_at}, ${OIB})`);

          try {
            const ticketURL = `${req.protocol}://${req.get(
              "host"
            )}/ticket/${ticket_id}`;

            const qrCodeImage = await QRCode.toBuffer(ticketURL);

            // Konvertiranje buffera u Base64 string
            const base64QRCode = qrCodeImage.toString("base64");

            // slanje qr koda u pug template koji ce se renderirati
            res.render("qr-code", {
              qrCode: base64QRCode,
            });
          } catch (error) {
            console.error("Error generating QR code:", error);
            res.status(500).json({
              message: "An error occurred while generating the QR code",
            });
          }
        }
      }
    } catch (error) {
      res
        .status(500)
        .json({ message: "An error occurred while generating the ticket" });
    }
  }
);

//stranica koja pokazuje podatke o ulaznici prijavljenim korisnicima
app.get(
  "/ticket/:ticketId",
  requiresAuth(),
  async (req: Request, res: Response) => {
    const user = JSON.stringify(req.oidc.user);
    const userName = req.oidc.user?.name ?? req.oidc.user?.sub;

    //fetch ticket info
    const ticket_id = req.params.ticketId;
    const queryText1 = "SELECT * FROM ticket WHERE ticket_id = $1";
    const params1 = [ticket_id];
    const result1 = await connect(queryText1, params1);

    const owner_oib = result1 ? result1.rows[0].owner_oib : 0;
    const created_at = result1 ? result1.rows[0].created_at : 0;

    //fetch owner info
    const queryText2 = `SELECT * FROM ticket_owner WHERE vatin = $1`;
    const params2 = [owner_oib];
    const result2 = await connect(queryText2, params2);
    const firstName = result2 ? result2.rows[0].firstname : 0;
    const lastName = result2 ? result2.rows[0].lastname : 0;
    //console.log("userinfo: ", firstName, lastName);
    //console.log(result2);

    res.render("ticket-info", {
      userName,
      owner_oib,
      firstName,
      lastName,
      created_at,
    });
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

//pokretanje klijentskog servera lokalno

/*
https
  .createServer(
    {
      key: fs.readFileSync("server.key"),
      cert: fs.readFileSync("server.cert"),
    },
    app
  )
  .listen(port, () => {
    console.log(`Klijentski server je pokrenut, port: ${port}!`);
  });
 */

//pokretanje klijentskog servera na renderu

app.listen(port, () => {
  console.log(`Klijentski server je pokrenut, port: ${port}!`);
});
