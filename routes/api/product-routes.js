const router = require('express').Router();
const { Product, Category, Tag, ProductTag } = require('../../models');

// The `/api/products` endpoint
/////////////////////////////////////////////////////////////////////////////////
// findAll products
router.get('/', (req, res) => {
  Product.findAll({
    attributes: ["id", "product_name", "price", "stock", "category_id"],
    include: [
      {
        model: Category,
        attributes: ['id', 'category_name'] // includes category row data
      },
      {
        model: Tag,
        attributes: ['id', 'tag_name'] // includes tag row data
      }]
  }).then(proDat => res.json(proDat))
    .catch(err => {
      console.log(err);
      res.status(500).json(err);
    });
});

/////////////////////////////////////////////////////////////////////////////////
// findOne product by it's id
router.get('/:id', (req, res) => {
  Product.findOne({
    where: {
      id: req.params.id,
    },
    include: [
      {
        model: Category,
        attributes: ['id', 'category_name'] // includes category row data
      },
      {
        model: Tag,
        attributes: ['id', 'tag_name'] // includes tag row data
      }]
  }).then(proDat => {
    if (!proDat) {
      res.status(404).json({ message: 'No products associated with this ID!'}); 
      return; 
    }
    res.json(proDat);
  })
  .catch(err => {
    console.log(err);
    res.status(500).json(err);
  });
});

/////////////////////////////////////////////////////////////////////////////////
// create new product (product_name, price, stock, category_id.. added tag_id because it's referenced below)
router.post('/', (req, res) => {
  Product.create ({
    product_name: req.body.product_name,
    price: req.body.price,
    stock: req.body.stock,
    category_id: req.body.category_id,
    // tag_id: req.body.tag_id
  }).then((product) => {
      // if there's product tags, we need to create pairings to bulk create in the ProductTag model
      if (req.body.tagIds.length) {
        const productTagIdArr = req.body.tagIds.map((tag_id) => {
          return {
            product_id: product.id,
            tag_id,
          };
        });
        return ProductTag.bulkCreate(productTagIdArr);
      }
      // if no product tags, just respond
      res.status(200).json(product);
    })
    .then((productTagIds) => res.status(200).json(productTagIds))
    .catch((err) => {
      console.log(err);
      res.status(400).json(err);
    });
});

/////////////////////////////////////////////////////////////////////////////////
// update product
router.put('/:id', (req, res) => {
  // update product data
  Product.update(req.body, {
    where: {
      id: req.params.id,
    },
  }).then((product) => {
      // find all associated tags from ProductTag
      return ProductTag.findAll({ where: { product_id: req.params.id } });
    }).then((productTags) => {
      // get list of current tag_ids
      const productTagIds = productTags.map(({ tag_id }) => tag_id);
      // create filtered list of new tag_ids
      const newProductTags = req.body.tagIds
        .filter((tag_id) => !productTagIds.includes(tag_id))
        .map((tag_id) => {
          return {
            product_id: req.params.id,
            tag_id,
          };
        });
      // figure out which ones to remove
      const productTagsToRemove = productTags
        .filter(({ tag_id }) => !req.body.tagIds.includes(tag_id))
        .map(({ id }) => id);

      // run both actions
      return Promise.all([
        ProductTag.destroy({ where: { id: productTagsToRemove } }),
        ProductTag.bulkCreate(newProductTags),
      ]);
    })
    .then((updatedProductTags) => res.json(updatedProductTags))
    .catch((err) => {
      // console.log(err);
      res.status(400).json(err);
    });
});
/////////////////////////////////////////////////////////////////////////////////
// delete products by ID
router.delete('/:id', (req, res) => {
  Product.destroy({
    where: {
      id: req.params.id
    }
  }).then(proDat => {
    if (!proDat) {
      res.status(404).json({ message: "No products associated with this ID!" });
      return;
    }
    res.json(proDat);
  })
  .catch(err => {
    console.log(err);
    res.status(500).json(err);
  });
});

module.exports = router;
