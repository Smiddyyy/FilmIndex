const express = require('express')
const path = require('path')
const fs = require('fs/promises');
const { writer } = require('repl');

require('dotenv').config();

const app = express()

// ---------------
// helpers methods
// ---------------

async function writeJSON(filename, data) {
  await fs.mkdir('data', { recursive: true });
  await fs.writeFile(`data/${filename}`, JSON.stringify(data, null, 2));
}

async function readJSON(filename) {
  try {
    const raw = await fs.readFile(`data/${filename}`, 'utf-8');
    const data = JSON.parse(raw);
    return data;
  } catch (err) {
    console.error("Invalid JSON in file:", filename);
    return null;
  }
}

async function listStoredMovies() {
  return fs.readdir('data')
    .then(files => files.filter(file => file.endsWith('.json')))
    .catch(err => {
      console.error("Error reading directory:", err);
      return [];
    });
}

function normalizeMovieData(movie) {
  return {
    title: movie.Title,
    released: new Date(movie.Released).toISOString().split('T')[0], // in ISO 8601 format
    runtime: parseInt(movie.Runtime), // as number ("142 min" -> 142)
    genres: movie.Genre.split(', ').map(s => s.trim()), // as array of strings ("Action, Adventure, Sci-Fi" -> ["Action", "Adventure", "Sci-Fi"])
    directors: movie.Director.split(', ').map(s => s.trim()), // as array of strings ("Lana Wachowski, Lilly Wachowski" -> ["Lana Wachowski", "Lilly Wachowski"])
    actors: movie.Actors.split(', ').map(s => s.trim()), // as array of strings ("Keanu Reeves, Laurence Fishburne, Carrie-Anne Moss" -> ["Keanu Reeves", "Laurence Fishburne", "Carrie-Anne Moss"])
    writers: movie.Writer.split(', ').map(s => s.trim()), // as array of strings ("Lana Wachowski, Lilly Wachowski" -> ["Lana Wachowski", "Lilly Wachowski"])
    plot: movie.Plot,
    poster: movie.Poster,
    metascore: parseInt(movie.Metascore), // as number
    imdbRating: parseFloat(movie.imdbRating) // as number
  }
}

// ---------------
// Main server code
// ---------------

// Serve static content in directory 'files'
app.use(express.static(path.join(__dirname, 'files')));

// Configure a 'get' endpoint for data..
app.get('/movies', async function (req, res) {
  // This endpoint will return a list of all movies stored in the JSON files (returns json data as list).
  try {
    const files = await listStoredMovies();

    const movies = (await Promise.all(
      files.map(file => readJSON(file))
    )).filter(movie => movie !== null) // filter out any files that failed to read;

    res.json(movies);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'internal: failed to read movies' });
  }
});

app.post('/fetch-new-movie', async (req, res) => {
  //This endpoint will fetch a new movie from the OMDB API and save it to a JSON file.
  try {
    const title = req.query.title;

    if (!title) {
      return res.status(400).send('missing query parameter: title');
    }

    // sanitize filename
    const safeTitle = title.replace(/[^a-z0-9]/gi, '_').toLowerCase();

    // check if movie already exists in JSON files
    if (await fs.access(`data/${safeTitle}.json`)
      .then(() => true)
      .catch(() => false)) {
      return res.status(200).json({ "status": "success", "msg": "Movie already exists" });
    }

    // Call OMDB API
    const apiKey = process.env.OMDb_apikey;
    if (!apiKey) {
      return res.status(500).json({ error: 'internal: OMDb API key not configured' });
    }

    const response = await fetch(
      `https://www.omdbapi.com/?t=${encodeURIComponent(title)}&apikey=${apiKey}`
    );
    const data = await response.json();

    if (data.Response === 'False') {
      return res.status(404).json({
        error: data.Error // Movie not found});
      });
    }

    // normalize and save movie data to JSON file
    movie = normalizeMovieData(data);
    await writeJSON(`${safeTitle}.json`, movie);

    res.status(201).json({ "status": "success", "msg": "Movie added successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
})

app.listen(3000)

console.log("Server now listening on http://localhost:3000/")

