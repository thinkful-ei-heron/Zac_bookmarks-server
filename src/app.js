require('dotenv').config()
const express = require('express')
const morgan = require('morgan')
const cors = require('cors')
const helmet = require('helmet')
const { NODE_ENV } = require('./config')
const logger = require('./logger')
const BookmarkService = require('./bookmark-service')

const app = express()

const morganOption = (NODE_ENV === 'production')
  ? 'tiny'
  : 'common';

app.use(morgan(morganOption))
app.use(cors())
app.use(helmet())
app.use(express.json())

app.use(function errorHandler(error, req, res, next) {
  let response
  if (NODE_ENV === 'production') {
    response = { error: { message: 'server error' } }
  } else {
    console.error(error)
    response = {message: error.message, error}
  }
  res.status(500).json(response)
})

// app.use(function validateBearerToken(req, res, next) {
//   const apiToken = process.env.API_KEY
//   const authToken = req.get('Authorization')

//   if (!authToken || authToken.split(' ')[1] !== apiToken) {
//     logger.error(`Unauthorized request to ${req.path}`)
//     return res.status(401).json({ error: 'Unauthorized request' })
//   }
//   // move to the next middleware
//   next()
// })

app.get('/', (req, res) => {
	res.send('Hello beautiful!');
})

app.get('/bookmarks', (req, res, next) => {
	const knexInstance = req.app.get('db');
	BookmarkService.getAllBookmarks(knexInstance)
		.then(bookmarks => {
			res.json(bookmarks)
		})
		.catch(next);
})

app.get('/bookmarks/:bookmark_id', (req, res, next) => {
	const knexInstance = req.app.get('db');
	BookmarkService.getById(knexInstance, req.params.bookmark_id)
		.then(bookmark => {
			if (!bookmark) {
				return res.status(404).json({
					error: { message: `Bookmark doesn't exist` }
				})
			}
			res.json(bookmark)
		})
		.catch(next);
})

// app.use(listRouter)

module.exports = app