const { buildModel } = require("./_ownedModel");

const base = buildModel({
  table: "products",
  ownerColumn: "seller",
  ownerProp: "seller",
  defaultSort: "created_at DESC",
  // Hide sold items from the public marketplace feed...
  activeWhere: "is_sold = false",
  // ...and hard-delete them 24h after being marked sold (grace period so the
  // seller/buyer can still reference the chat/listing briefly).
  expireWhere: "is_sold = true AND updated_at < NOW() - INTERVAL '24 hours'",
  columns: [
    { col: "title", prop: "title" },
    { col: "description", prop: "description" },
    { col: "price", prop: "price" },
    { col: "category", prop: "category" },
    { col: "condition", prop: "condition" },
    { col: "images", prop: "images", json: true, array: true },
    { col: "location", prop: "location" },
    { col: "contact", prop: "contact" },
    { col: "is_sold", prop: "isSold" },
  ],
});

// Allow `new Product({...})` then `.save()`
function Product(data) { return base._make(data); }
Product.find = base.find.bind(base);
Product.findActive = () => base.find({ _activeOnly: true }); // hides sold items
Product.findById = base.findById.bind(base);
Product.create = base.create.bind(base);
Product.count = base.count.bind(base);
Product.adminDelete = base.adminDelete.bind(base);
Product.cleanupExpired = base.cleanupExpired.bind(base);

module.exports = Product;
