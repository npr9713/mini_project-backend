const router = require('express').Router();
const teacher_controller = require('../controllers/teacher_controller');
const assign_test = require("../controllers/assign_test");
router.post('/t-login',teacher_controller.login);
router.post("/t-signup",teacher_controller.sign_up);
router.post("/t-addgroup",teacher_controller.addGroup);
router.post("/find_groups",assign_test.getGroupsByOwner);
router.post("/assign_tests",assign_test.insertQuizQuestions)
module.exports=router