const express = require('express');
const redis = require('redis');
const socketio = require('socket.io');

const app = express();
const redisPort = "127.0.0.1:"
const redisHost = "6379"
const client = redis.createClient(redisPort, redisHost);
const server = require('http').Server(app);
const io = socketio(server);

app.use(express.json());

app.post('/messages', (req, res) => {
  const { sender, content, timestamp } = req.body;

  client.lPush('messages', JSON.stringify({ sender, content, timestamp }), (error) => {
    if (error) {
      console.error('Error storing message:', error);
      return res.status(500).json({ error: 'An error occurred while storing the message.' });
    }
    io.emit('message', { sender, content, timestamp });

    res.sendStatus(200);
  });
});


app.get('/messages', (req, res) => {
  client.lRange('messages', 0, 49, (error, messages) => {
    if (error) {
      console.error('Error retrieving messages:', error);
      return res.status(500).json({ error: 'An error occurred while retrieving the messages.' });
    }

    const parsedMessages = messages.map((message) => JSON.parse(message));
    res.json(parsedMessages);
  });
});

// Rate limiting middleware
function rateLimit(limit, interval) {
  const limiter = {};

  return function (req, res, next) {
    const { ip } = req;
    const key = `rate-limit:${ip}`;
    const now = Date.now();

    client.multi()
      .incr(key)
      .expire(key, interval)
      .exec((error, results) => {
        if (error) {
          console.error('Error updating rate limit:', error);
          return res.status(500).json({ error: 'An error occurred while updating the rate limit.' });
        }

        const count = results[0];

        if (count > limit) {
          return res.status(429).json({ error: 'Rate limit exceeded. Please try again later.' });
        }

        next();
      });
  };
}


app.post('/messages', rateLimit(15, 60000), (req, res, next) => {
  next();
});


io.on('connection', (socket) => {

  client.lRange('messages', 0, 49, (error, messages) => {
    if (error) {
      console.error('Error retrieving messages:', error);
      return;
    }

    const parsedMessages = messages.map((message) => JSON.parse(message));
    socket.emit('initialMessages', parsedMessages);
  });
});

// Start the server
server.listen(8000, () => {
  console.log('Server listening on port 8000');
});


module.exports = app;