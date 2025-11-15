const express = require('express');
const {getAllPackage,getPackageByUser} = require('../controllers/package'); 
const { verifyLogin, verifyPackageDisplay } = require('../midlewares/verify');
const router = express.Router();


router.get("/", getAllPackage); 
router.get("/user-buy",verifyLogin,verifyPackageDisplay, getPackageByUser);
module.exports = router;