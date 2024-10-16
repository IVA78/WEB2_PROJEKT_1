
Cilj ovog projekta je demonstrirati prethodno predznanje vezano za izradu web-aplikacije koja komunicira s **bazom podataka**, omogućiti isporuku aplikacije u oblak, a zatim u nju ugraditi autentifikacijske i autorizacijske mehanizme iz prvog bloka predavanja.

Aplikacija će služiti za generiranje QR kodova za određenu namjenu (npr. ulaznice, pokloni paketi i slično, u daljnjem tekstu ulaznice) te za prikaz informacija pohranjenih u bazi podataka vezanih uz pojedinu ulaznicu.

Rješenje mora imati sljedeće funkcionalnosti:

- Javno dostupna početna stranica koja prikazuje broj dosad generiranih ulaznica.
- Pristupna točka (engl. endpoint) za generiranje ulaznice.
    - Pristupna točka u tijelu zahtjeva prima json sa svojstvima `vatin, firstName, lastName`, koji predstavljaju OIB osobe ili tvrtke koja "kupuje" ulaznicu te ime i prezime na koga će ulaznica glasiti.
    - Za jedan OIB se smiju generirati do (uključivo) 3 ulaznice.
    - Identifikator ulaznice ne smije biti numerička vrijednosti, već npr. UUID iz PostgreSQL-a. Za svaku generiranu ulaznicu u bazi podataka osim prethodno navedenih podataka pospremiti i vrijeme kad je ulaznica kreirana.
    - Rezultat uspješnog poziva je slika s QR kodom koji sadrži URL stranice određene identifikatorom ulaznici na kojoj se mogu doznati ostale informacije o ulaznici. U URL-u se ne smiju nalaziti podaci o OIB-u, imenu ili prezimenu, već samo identifikator ulaznice.
    - U slučaju pogreške vratiti status 400 ili 500 s odgovarajućim opisom pogreške. Status 400 se treba vratiti ako ulazni json ne sadrži sve tražene podatke ili su za navedeni OIB već kupljene 3 ulaznice, pa nije dozvoljeno generirati dodatne ulaznice.
    - Pristupna točka mora koristiti autorizacijski mehanizam OAuth2 Client Credentials (machine-to-machine) koji nije vezan za konkretnog korisnika, već za pojedinu aplikaciju. Detaljnije za ovaj mehanizam i Auth0 se može naći na https://auth0.com/blog/using-m2m-authorization
- Stranica koja je jednoznačno određena identifikatorom ulaznice i prikazuje podatke o OIB-u, imenu, prezimenu te vremenu nastanka ulaznice.
    - Pristup ovoj stranici imaju samo prijavljeni korisnici.
    - Na stranici ispisati ime trenutno prijavljenog korisnika koristeći OpenId Connect protokol.

Upravljanje korisnicima odvija se korištenjem protokola *OAuth2* i *OpenId Connect (OIDC)* i servisa *Auth0*. Korisnike na servisu *Auth0* možete dodati kroz opciju *User management/Users* na *Auth0*. Za pohranu podataka koristiti *PostgreSQL* na *Renderu* ili neku drugu bazu podataka po izboru (npr. *Firebase*).
