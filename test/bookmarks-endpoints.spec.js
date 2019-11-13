require('dotenv').config;
const { expect } = require('chai');
const knex = require('knex');
const app = require('../src/app');
const { makeBookmarkArray } = require('./bookmarks.fixtures')

const maliciousBookmark = {
	id: 666,
	title: 'L337 H4x0rz <script>alert("xss");</script>',
	url: 'http://example.com',
	description: `Bad <img src="https://url.to.file.which/does-not.exist" onerror="alert(document.cookie);"> but not <strong>all</strong> bad.`,
	rating: 1
};

const sanitizedBookmark = {
	id: 666,
	title: 'L337 H4x0rz &lt;script&gt;alert(\"xss\");&lt;/script&gt;',
	url: 'http://example.com',
	description: `Bad <img src="https://url.to.file.which/does-not.exist"> but not <strong>all</strong> bad.`,
	rating: 1
};

describe('Bookmarks Endpoints', function() {
	let db;

	before('make knex instance', () => {
		db = knex({
			client: 'pg',
			connection: process.env.TEST_DB_URL
		})
		app.set('db', db)
	})

	after('disconnect from db', () => db.destroy())

	before('clean the table', () => db('bookmarks').truncate())

	afterEach('cleanup', () => db('bookmarks').truncate())

	describe('GET /bookmarks', () => {
		context('Given there are no bookmarks', () => {
			it('responds with 200 and an empty list', () => {
				return supertest(app)
					.get('/bookmarks')
					.expect(200, []);
			})
		})

		context('Given there are bookmarks in the database', () => {
			const testBookmarks = makeBookmarkArray();
		
			beforeEach('insert bookmarks', () => {
			return db
				.into('bookmarks')
				.insert(testBookmarks)
			})
			
			it('GET /bookmarks responds with 200 and all of the bookmarks', () => {
				return supertest(app)
					.get('/bookmarks')
					.expect(200, testBookmarks)
			})

			context(`Given an XSS attack bookmark`, () => {
				beforeEach('insert malicious bookmark', () => {
					return db
						.into('bookmarks')
						.insert([ maliciousBookmark ])
				})
			
				it('removes XSS attack content', () => {
					return supertest(app)
						.get(`/bookmarks`)
						.expect(200)
						.expect(res => {
							expect(res.body[3].title).to.eql(sanitizedBookmark.title)
							expect(res.body[3].description).to.eql(sanitizedBookmark.description)
						})
				})
			})
		})
	})
	
	describe('GET /bookmarks/:bookmark_id', () => {
		context('Given no bookmarks', () => {
			it('responds with 404', () => {
				const bookmarkId = 1234;
				return supertest(app)
					.get(`/bookmarks/${bookmarkId}`)
					.expect(404, { error: {message: `Bookmark doesn't exist` } })
			})
		})

		context('Given there are bookmarks in the database', () => {
			const testBookmarks = makeBookmarkArray();
		
			beforeEach('insert bookmarks', () => {
			return db
				.into('bookmarks')
				.insert(testBookmarks)
			})
			
			it('GET /bookmarks/:bookmark_id responds with 200 and the specified bookmark', () => {
				const bookmarkId = 2;
				const expectedBookmark = testBookmarks[bookmarkId - 1];
				return supertest(app)
					.get(`/bookmarks/${bookmarkId}`)
					.expect(200, expectedBookmark);
			})

			context(`Given an XSS attack bookmark`, () => {
				beforeEach('insert malicious bookmark', () => {
				  	return db
						.into('bookmarks')
						.insert([maliciousBookmark])
				})
		  
				it('removes XSS attack content', () => {
				  	return supertest(app)
						.get(`/bookmarks/${maliciousBookmark.id}`)
						.expect(200)
						.expect(res => {
							expect(res.body.title).to.eql(sanitizedBookmark.title)
							expect(res.body.description).to.eql(sanitizedBookmark.description)
						})
				})
			})
		})	
	})

	describe('DELETE /bookmarks/:bookmark_id', () => {
		context('Given no bookmarks', () => {
		  it('responds 404 when bookmark doesn\'t exist', () => {
			return supertest(app)
			  .delete('/bookmarks/1234')
			  .expect(404, {
				error: { message: 'Bookmark doesn\'t exist' }
			  })
		  })
		})
	
		context('Given there are bookmarks in the database', () => {
		  const testBookmarks = makeBookmarkArray();
	
		  beforeEach('insert bookmarks', () => {
			return db
			  .into('bookmarks')
			  .insert(testBookmarks)
		  })
	
		  it('removes the bookmark by ID from the store', () => {
			const idToRemove = 2;
			const expectedBookmarks = testBookmarks.filter(bookmark => bookmark.id !== idToRemove);
			return supertest(app)
			  .delete(`/bookmarks/${idToRemove}`)
			  .expect(204)
			  .then(() =>
				supertest(app)
				  .get('/bookmarks')
				  .expect(expectedBookmarks)
			  )
		  })
		})
	  })
	
	  describe('POST /bookmarks', () => {
		it('responds with 400 missing title if not supplied', () => {
		  const newBookmarkMissingTitle = {
			url: 'https://www.example.com',
			rating: 1,
		  }
		  return supertest(app)
			.post('/bookmarks')
			.send(newBookmarkMissingTitle)
			.expect(400, {
			  error: { message: 'title is required' }
			})
		})
	
		it('responds with 400 missing url if not supplied', () => {
		  const newBookmarkMissingUrl = {
			title: 'Test Title',
			rating: 1,
		  }
		  return supertest(app)
			.post(`/bookmarks`)
			.send(newBookmarkMissingUrl)
			.expect(400, {
			  error: { message: 'url is required' }
			})
		})
	
		it('responds with 400 missing rating if not supplied', () => {
		  const newBookmarkMissingRating = {
			title: 'Test Title',
			url: 'https://www.example.com',
		  }
		  return supertest(app)
			.post('/bookmarks')
			.send(newBookmarkMissingRating)
			.expect(400, {
			  error: { message: 'rating is required' }
			})
		})
	
		it('responds with 400 invalid rating if not between 0 and 5', () => {
		  const newBookmarkInvalidRating = {
			title: 'test-title',
			url: 'https://test.com',
			rating: 'three',
		  }
		  return supertest(app)
			.post('/bookmarks')
			.send(newBookmarkInvalidRating)
			.expect(400, {
			  error: { message: 'rating must be a number between 0 and 5' }
			})
		})
	
		it('adds a new bookmark to the store', () => {
		  const newBookmark = {
			title: 'test-title',
			url: 'https://test.com',
			description: 'test description',
			rating: 1,
		  }
		  return supertest(app)
			.post('/bookmarks')
			.send(newBookmark)
			.expect(201)
			.expect(res => {
			  expect(res.body.title).to.eql(newBookmark.title)
			  expect(res.body.url).to.eql(newBookmark.url)
			  expect(res.body.description).to.eql(newBookmark.description)
			  expect(res.body.rating).to.eql(newBookmark.rating)
			  expect(res.body).to.have.property('id')
			  expect(res.headers.location).to.eql(`/bookmarks/${res.body.id}`)
			})
			.then(res =>
			  supertest(app)
				.get(`/bookmarks/${res.body.id}`)
				.expect(res.body)
			)
		})
	
		it('removes XSS attack content from response', () => {
		  return supertest(app)
			.post('/bookmarks')
			.send(maliciousBookmark)
			.expect(201)
			.expect(res => {
			  expect(res.body.title).to.eql(sanitizedBookmark.title)
			  expect(res.body.description).to.eql(sanitizedBookmark.description)
			})
		})
	  })
})