const express = require('express')
const uuid = require('uuid/v4')
const logger = require('./logger')
const store = require('./store')

const listRouter = express.Router()
const bodyParser = express.json()

listRouter
  .route('/bookmarks')
  .get((req, res) => {
	return res.json(store);
  })
  .post(bodyParser, (req, res) => {
	const { title, url, description, rating } = req.body

	if (!title) {
		logger.error('Title is required');
		return res
			.status(400)
			.send('Invalid data');
	}
	if (!url) {
		logger.error('URL is required');
		return res
			.status(400)
			.send('Invalid data');
	}
	if (!rating) {
		logger.error('Rating is required');
		return res
			.status(400)
			.send('Invalid data');
	}

	const id = uuid();
	const bookmark = { id, title, url, description, rating };
	store.push(bookmark);

	logger.info(`Bookmark with id ${id} created`);
	res
		.status(201)
		.location(`http://localhost:8000/bookmarks/${id}`)
		.json(bookmark);
  });

listRouter
  .route('/bookmarks/:id')
  .get((req, res) => {
    const { id } = req.params;
	const bookmark = store.find(item => item.id === id);

	if (!bookmark) {
		logger.error(`Bookmark with id ${i} not found.`);
		return res
			.status(404)
			.send('Bookmark not found');
	}

	res.json(bookmark);
  })
  .delete((req, res) => {
    const { id } = req.params;
    let deleteIndex = store.findIndex(item => item.id === id);

    if (deleteIndex === -1) {
       logger.error(`Bookmark with id ${id} not found.`);
        return res
        .status(404)
        .send('Not found');
    }
    store.splice(deleteIndex, 1);
    logger.info(`Bookmark with id ${id} deleted.`);

    res
      .status(204)
      .end();
  });


module.exports = listRouter;