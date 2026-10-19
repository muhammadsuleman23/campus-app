const express = require("express");
const router = express.Router();
const { search } = require("../controllers/searchController");

router.get("/", search); // http://localhost:5000/api/search?q=...

module.exports = router;
