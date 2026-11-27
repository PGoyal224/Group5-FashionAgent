# Group5-FashionAgent
This is Team 5's Software Development project repository for Fall 2026.

<!-- 1. Brief Application Description -->
### Naxos   
  
Even when a closet is physically organized, it can be hard to plan outfits and make the most out of every item. Naxos is a digital closet and outfit planning platform designed to help users organize their wardrobes, create outfits, and make better use of the clothing they already own.

Users will be able to upload images of their clothing items and organize them into categories such as tops, bottoms, dresses, shoes, and accessories. Each item can be saved with relevant details, allowing users to easily browse and manage their virtual wardrobe. We will use AI assistance to pre-tag items and save users time. 

In addition to adding/modifying clothing items, users will also be able to combine items into saved outfits, keep track of frequency of item wear, and plan ahead on what they want to wear. The AI assistant will also be able to generate outfit reccomendations using items in the wardrobe. 

With the prevalance of fast fashion, Naxos is different because it encourages users to make the most of what they already have. Our goal is to not only help users stay organized and elevate their style, but also to encourage less consumption and benefit the environment. 


<!-- 2. Contributors -->
| Team Member | Email | Username |
| --- | --- | --- |
| Prisha Goyal | prisha.goyal@colorado.edu | PGoyal224 |
| Jaden Cohavi | jaden.cohavi@colorado.edu | Jadencoh |
| Ethan Guirguis | ethan.guirguis@colorado.edu | etexcelebt |
| Sofia Antal | sofia.antal@colorado.edu | soan1217 |
| Aryan Choudhary | arch9012@colorado.edu | AryanFlick |


<!-- 3. Technology Stack used for the project -->

### Technology Stack

- Node.js and Express for the web server
- Handlebars and Bootstrap for the website pages
- PostgreSQL for users, clothing items, and outfits
- Docker Compose for running the app locally
- Mocha, Chai, and Chai HTTP for automated tests
- Render for hosting the deployed website



<!-- 4. Prerequisites to run the application -->

### Prerequisites

- Git
- Node.js and npm
- Docker Desktop with Docker Compose

Docker Desktop must be running before starting the containers.



<!-- 5. Instructions on how to run the application locally -->

### Running Locally

1. Clone the repository and open the application folder:

   ```sh
   git clone https://github.com/PGoyal224/Group5-FashionAgent.git
   cd Group5-FashionAgent/ProjectSourceCode
   ```

2. Create your local environment file:

   ```sh
   cp .env.example .env
   ```

   In `.env`, replace the example database password and session secret
   with your own values. Keep this file private and do not commit it.

3. Install the dependencies:

   ```sh
   npm install
   ```

4. Start the database and website:

   ```sh
   docker compose up -d
   ```

5. Open [localhost:3000](http://localhost:3000) in your browser.

The database tables are created automatically when the database starts
with an empty data volume.

To view server logs:

```sh
docker compose logs --tail=50 web
```

To stop the website and database:

```sh
docker compose down
```

The normal database uses persistent storage, so stopping the containers
does not delete saved users, clothing, or outfits.

After pulling changes, run `npm install` again if dependencies changed.
Restart the website container to load updated server code:

```sh
docker compose restart web
```

Existing database tables are not automatically updated when
`src/init_data/create.sql` changes. Schema changes may require a separate
database migration.



<!-- 6. How to run the tests -->


<!-- 7. Link to the deployed application -->

### Deployed Application

[Naxos](https://group5-fashionagent.onrender.com/)

The deployed website currently requires a manual rebuild after changes
are pushed. Coordinate with Jaden to deploy the latest version.
