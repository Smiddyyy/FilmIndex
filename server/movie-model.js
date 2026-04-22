const express = require('express')
const path = require('path')
const fs = require('fs/promises');
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
    const files = await fs.readdir('data');
    const jsonFiles = files.filter(file => file.endsWith('.json'));
    
    const loadedMovies = {};
    
    for (const file of jsonFiles) {
      try {
        const raw = await fs.readFile(`data/${file}`, 'utf-8');
        const movie = JSON.parse(raw);
        if (movie && movie.imdbID) {
          loadedMovies[movie.imdbID] = movie;
        }
      } catch (err) {
        console.error("Failed to load movie from file:", file, err);
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
function getAllMovies() {
  return Object.values(movieCache);
}

// Get a single movie from cache by imdbID
function getMovie(imdbID) {
  return movieCache[imdbID] || null;
}

// Update/add a movie in cache (used after writeJSON)
function setMovie(imdbID, movie) {
  movieCache[imdbID] = movie;
}

// ---------------
// helpers methods
// ---------------

async function writeJSON(filename, data) {
  await fs.mkdir('data', { recursive: true });
  await fs.writeFile(`data/${filename}`, JSON.stringify(data, null, 2));
  // Update cache after writing
  if (data.imdbID) {
    movieCache[data.imdbID] = data;
  }
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
  listStoredMovies,
  normalizeMovieData
};