const router = require('express').Router();
const { sendMessage, sendPublicMessage } = require('../controllers/chatbot.controller');
const { protect } = require('../middleware/auth.middleware');

router.post('/message', protect, sendMessage);
router.post('/public', sendPublicMessage);

module.exports = router;
