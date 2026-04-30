const router = require('express').Router();
const { sendMessage } = require('../controllers/chatbot.controller');
const { protect } = require('../middleware/auth.middleware');

router.post('/message', protect, sendMessage);

module.exports = router;
