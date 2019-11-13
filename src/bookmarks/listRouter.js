const express = require('express')
const uuid = require('uuid/v4')
const logger = require('../logger')
const xss = require('xss')

const BookmarkService = require('./bookmark-service')

const listRouter = express.Router()
const bodyParser = express.json()

const serializedBookmark = bookmark => ({
	id: bookmark.id,
	title: xss(bookmark.title),
	url: xss(bookmark.url),
	description: xss(bookmark.description),
	rating: Number(bookmark.rating)
})

listRouter
  	.route('/bookmarks')
  	.get((req, res, next) => {
		BookmarkService.getAllBookmarks(
			req.app.get('db')
		)
		.then(bookmarks => {
			res.json(bookmarks.map(serializedBookmark))
		})
		.catch(next)
  	})
  	.post(bodyParser, (req, res, next) => {
		for (const field of ['title', 'url', 'rating']) {
			if (!req.body[field]) {
				logger.error(`${field} is required`)
				return res.status(400).send({
					error: { message: `${field} is required` }
				})
			}
		}

	const { title, url, description, rating } = req.body
	const newBookmark = { title, url, description, rating };

	const ratingNum = Number(rating);

	if (!Number.isInteger(ratingNum) || ratingNum < 0 || ratingNum > 5) {
		logger.error(`Invalid rating '${rating}' supplied`);
		return res.status(400).send({
			error: { message: 'rating must be a number between 0 and 5' }
		});
	}

	for (const [key, value] of Object.entries(newBookmark)) {
		if (value == null) {
			return res.status(400).json({
				error: { message: `Missing ${key} in request body` }
			});
		}
	}

	const id = uuid();
	BookmarkService.insertBookmark(
		req.app.get('db'),
		newBookmark
	)
		.then(bookmark => {
			logger.info(`Bookmark with id ${id} created`);
			res
				.status(201)
				.location(`/bookmarks/${bookmark.id}`)
				.json(serializedBookmark(bookmark))
		})
      	.catch(next)
	});

listRouter
  	.route('/bookmarks/:bookmark_id')
  	.all((req, res, next) => {
		const { bookmark_id } = req.params
		BookmarkService.getById(
			req.app.get('db'),
			bookmark_id
		)
		.then(bookmark => {
			if (!bookmark) {
				logger.error(`Bookmark with id ${bookmark_id} not found.`);
				return res.status(404).json({
					error: { message: `Bookmark doesn't exist` }
				})
			}
			res.bookmark = bookmark
			next()
		})
	   .catch(next)
	})
	.get((req, res) => {
		res.json(serializedBookmark(res.bookmark))
	})
	.delete((req, res, next) => {
		const { id } = req.params;
		BookmarkService.deleteBookmark(
			req.app.get('db'),
			id
		)
		.then(() => {
			logger.info(`Bookmark with id ${id} deleted.`)
			res.status(204).end()
		})
		.catch(next)
	})

module.exports = listRouter