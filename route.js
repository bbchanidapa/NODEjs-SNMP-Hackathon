var express = require('express')
var router = express.Router()
module.exports = function () {
	var sw4503 = require('./sw4503/sw4503.route.js')
	router.use('/', sw4503)
	return router
}