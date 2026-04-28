const express = require('express')
const path = require('path')
const fs = require('fs/promises');
const userModel = require("./user-model.js");
require('dotenv').config();

// ---------------
// In-memory movie cache
// ---------------
// Key: movie imdbID, Value: movie object
let movieCache = {};

// ---------------
// Cache management
// ---------------

// Load all movies from data directory into memory
async function loadAllMovies() {
  try {
    const files = await fs.readdir('data/movies');
    const jsonFiles = files.filter(file => file.endsWith('.json'));
    
    const loadedMovies = {};
    
    for (const username in userModel){
      const user = userModel[username];
      loadedMovies[username] = {};

      for (const file of jsonFiles) {
        try {
          const raw = await fs.readFile(`data/movies/${file}`, 'utf-8');
          const movie = JSON.parse(raw);
          if (
            movie &&
            movie.imdbID &&
            (user.movies.includes(movie.imdbID) || user.movies == "__all__")
          ) {
              loadedMovies[username][movie.imdbID] = movie;
          }else{
          }
        } catch (err) {
          console.error("Failed to load movie from file:", file, err);
        }
      }  
    }
    movieCache = loadedMovies;
    console.log(`Loaded ${Object.keys(movieCache).length} movies into memory`);
    return movieCache;

  } catch (err) {
    console.error("Failed to load movies:", err);
    movieCache = {};
    return movieCache;
  }
}

// Get all movies from cache
function getAllMovies(username) {
  if (username) {
    return Object.values(movieCache[username] || {});
  }

  const allMovies = Object.values(movieCache).flatMap(userMovies =>
    Object.values(userMovies)
  );

  return Array.from(
    new Map(allMovies.map(movie => [movie.imdbID, movie])).values()
  );
}

// Get a single movie from cache by imdbID
function getMovie(username, imdbID) {
  if (username){
    return movieCache[username][imdbID] || null;
  }

  const allMovies = Object.values(movieCache).flatMap(userMovies =>
    Object.values(userMovies)
  );

  return Array.from(
    new Map(allMovies.map(movie => [movie.imdbID, movie])).values()
  )[imdbID] || null;
}

// Update/add a movie in cache (used after writeJSON)
function setMovie(imdbID, movie) {
  for (const username in userModel){
      const keys = Object.keys(movieCache[username]);
      if(keys.includes(imdbID)){
        movieCache[username][imdbID] = movie;
      }
  }
}

// ---------------
// helpers methods
// ---------------

async function writeJSON(filename, data) {
  await fs.mkdir('data', { recursive: true });
  await fs.writeFile(`data/movies/${filename}`, JSON.stringify(data, null, 2));
  // Update cache after writing
  if (data.imdbID) {
    setMovie(data.imdbID, data);
  }
}

async function readJSON(filename) {
  try {
    const raw = await fs.readFile(`data/movies/${filename}`, 'utf-8');
    const data = JSON.parse(raw);
    return data;
  } catch (err) {
    console.error("Invalid JSON in file:", filename);
    return null;
  }
}

function normalizeMovieData(movie) {
  return {
    imdbID: movie.imdbID,
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
  };
}

module.exports = {
  loadAllMovies,
  getAllMovies,
  getMovie,
  setMovie,
  writeJSON,
  readJSON,
  normalizeMovieData
};