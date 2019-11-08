require('dotenv').config()
const express = require('express')
const morgan = require('morgan')
const cors = require('cors')
const helmet = require('helmet')
const { NODE_ENV } = require('./config')
const logger = require('./logger')
const listRouter = require('./listRouter')


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

app.use(function validateBearerToken(req, res, next) {
  const apiToken = process.env.API_KEY
  const authToken = req.get('Authorization')

  if (!authToken || authToken.split(' ')[1] !== apiToken) {
    logger.error(`Unauthorized request to ${req.path}`)
    return res.status(401).json({ error: 'Unauthorized request' })
  }
  // move to the next middleware
  next()
})

app.use(listRouter)

// app.get('/', (req, res) => {
//   return res.status(200).send('Hello, world!')
// })
app.get('/test', (req, res) => {
  return res.send('working')
})

module.exports = app