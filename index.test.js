const request = require('supertest');
const app = require('./index');
const chai = require('chai');
const expect = chai.expect;

describe('Chat API', function () { 
  describe('POST /messages', function () {
    it('should store a new message in Redis and emit it via socket.io', function (done) {

      this.timeout(10000);

      const message = {
                sender: 'user1',
                content: 'Test message',
                timestamp: new Date().toISOString(),
              };
        
              const res = request(app)
                .post('/messages')
                .send(message)
                .expect(200);
        

              expect(res.body).to.have.property('sender', message.sender);
              expect(res.body).to.have.property('content', message.content);
              expect(res.body).to.have.property('timestamp', message.timestamp);
    });

    it('should return 429 if rate limit is exceeded', function (done) {

      this.timeout(10000);

      for (let i = 0; i < 20; i++) {
        request(app)
          .post('/messages')
          .send({
            sender: 'user2',
            content: `Message ${i}`,
            timestamp: new Date().toISOString(),
          })
          .expect(429);
      }

    });
  });

  describe('GET /messages', function () { // Change Arrow function to traditional function
    it('should retrieve the last 50 messages', function (done) {

      this.timeout(10000);
      const res = request(app).get('/messages').expect(200);

    });
  });
});
