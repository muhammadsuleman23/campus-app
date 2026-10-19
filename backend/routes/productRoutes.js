const express = require("express");
const router = express.Router();
const { 
  createProduct, 
  getProducts, 
  getProductById, 
  deleteProduct, 
  updateProduct 
} = require("../controllers/productController");
const { protect } = require("../middleware/authMiddleware");

// Route: /api/products
router.route("/")
  .get(getProducts)
  .post(protect, createProduct);

// Route: /api/products/:id
router.route("/:id")
  .get(getProductById)
  .delete(protect, deleteProduct)
  .put(protect, updateProduct); // ✅ Make sure yeh line mojood ho!

module.exports = router;