var express = require('express');
var crypto = require('crypto');
var mongoose = require('mongoose');
var ChatModel = require('../models/chat');
var UserModel = require('../models/user');
var utils = require('../utils/auth');
var socketio = require('../socketio');
var router = express.Router();

router.use(utils.requireLogin);

router.get('/', function(req, res, next) {
  res.render('chat', { title: 'Minder' });
});

router.get('/conversations', function(req, res) {
  ChatModel.collection.aggregate([
      // Stage 1
      {
        $match: {
          $or: [
            { "sender.id": req.user._id },
            { "recipient.id": req.user._id }
          ]
        }
      },
  
      // Stage 2
      {
        $group: {
          _id: "$identifier",
          chat: { $last: "$$ROOT" }
        }
      },
  
    ],
    function(err, conversations) {
      if(err) return res.status(500).send(err);
      const chats = conversations.map(function(bah) {
        const conversation = bah.chat;
        let user = {}
        if (conversation.sender.id.toString() === req.user._id.toString()) {
          user = conversation.recipient;
        } else {
          user = conversation.sender;
        }
        return {
          user,
          message: conversation.message,
          date: conversation.date,
          identifier: conversation.identifier
        }
      })
      return res.json(chats);
  });
});

router.get('/:identifier', function(req, res) {
  ChatModel.find({ identifier: req.params.identifier })
    .then(function(chats) {
      if(socketio.sockets()[req.user._id]) {
        socketio.sockets()[req.user._id].join(`chat_${req.params.identifier}`);
      }
      res.json(chats);
    })
    .catch(function(err) {
      res.status(500).send(err);
    })
});

router.post('/:userId', function(req, res) {
  let recipientId = req.params.userId;
  let sender = {
    id: req.user._id,
    name: req.user.name,
  }
  UserModel.findById(recipientId)
    .then(function(recipientUser) {
      if (!recipientUser) return res.status(404).send('User no exista');

      let recipient = {
        id: recipientUser._id,
        name: recipientUser.name,
      }

      const ids = [sender.id, recipient.id];
      ids.sort();
      identifier = crypto.createHash('md5').update(ids.join('')).digest("hex");

      return ChatModel.create({
        sender,
        recipient,
        identifier,
        message: req.body.message.trim()
      });
    })
    .then(function(newChat) {
      socketio.instance().to(`chat_${identifier}`).emit('chat', newChat);
      socketio.sockets()[recipientId].emit('notifications', {
        type: 'new_message',
        data: newChat
      });
      return res.status(201).json(newChat);
    })
    .catch(function(err) {
      return res.status(500).send(err);
    });

});

module.exports = router;
