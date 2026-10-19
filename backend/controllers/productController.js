const Product = require("../models/Product");

// 1. Create Product
const createProduct = async (req, res) => {
  try {
    const { title, description, price, category, condition, images, contact, location } = req.body;

    if (!title || !description || !price || !contact) {
      return res.status(400).json({ message: "Please fill all required fields" });
    }

    const product = new Product({
      title, description, price, category, condition,
      images: images || [],
      contact, location,
      seller: req.user._id,
    });

    const savedProduct = await product.save();
    if (req.io) req.io.emit("global_notification", { message: `🛍️ New Item: ${title} listed!` });
    
    res.status(201).json(savedProduct);
  } catch (error) {
    console.error("Create Error:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

// 2. Get All Products (sold items auto-hidden — see Product.activeWhere)
const getProducts = async (req, res) => {
  try {
    const products = await Product.findActive().populate("seller", "name email").sort({ createdAt: -1 });
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};

// 3. Get Single Product
const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate("seller", "name email");
    if (product) res.json(product);
    else res.status(404).json({ message: "Product not found" });
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};

// 4. Delete Product
const deleteProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ message: "Product not found" });

        if (product.seller.toString() !== req.user._id.toString()) {
            return res.status(401).json({ message: "Not authorized" });
        }

        await product.deleteOne();
        res.json({ message: "Product removed" });
    } catch (error) {
        console.error("Delete Error:", error);
        res.status(500).json({ message: "Server Error" });
    }
};

// ✅ 5. UPDATE Product (FIXED: Added Location & Other Fields)
const updateProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        
        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }

        // Security Check
        if (product.seller.toString() !== req.user._id.toString()) {
            return res.status(401).json({ message: "You are not the owner!" });
        }

        // ✅ AB SAARI CHEEZEIN UPDATE HONGI
        product.title = req.body.title || product.title;
        product.description = req.body.description || product.description;
        product.price = req.body.price || product.price;
        product.category = req.body.category || product.category;    // Added
        product.condition = req.body.condition || product.condition; // Added
        product.location = req.body.location || product.location;    // Added (Yeh missing tha)
        product.contact = req.body.contact || product.contact;       // Added
        product.images = req.body.images || product.images;
        
        if (req.body.isSold !== undefined) product.isSold = req.body.isSold;

        const updatedProduct = await product.save();
        res.json(updatedProduct);

    } catch (error) { 
        console.error("Update Error:", error);
        res.status(500).json({ message: "Server Error inside Update" }); 
    }
};

module.exports = { createProduct, getProducts, getProductById, deleteProduct, updateProduct };