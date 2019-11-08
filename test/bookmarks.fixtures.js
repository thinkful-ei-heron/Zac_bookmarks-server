function makeBookmarkArray() {
	return [
		{
		  id: 1,
		  title: 'Google',
		  url: 'http://www.google.com',
		  description: `The world's best known search-engine`,
		  rating: 4
		},
		{
			id: 2,
			title: 'Facebook',
			url: 'http://www.facebook.com',
			description: `The only reason anyone has a Facebook is because everyone else has a Facebook`,
			rating: 2
		},
		{
			id: 3,
			title: 'Netflix',
			url: 'http://www.netflix.com',
			description: `Streaming movies all weekend long`,
			rating: 5
		}  
	];
}

module.exports = {
	makeBookmarkArray
}