const chai = require('chai');
const should = chai.should();
const chaiHttp = require('chai-http');
const sinon = require('sinon');
const faker = require("faker");
chai.use(chaiHttp);

const dotenv = require("dotenv");
dotenv.config({ path: ".env" });

const server = require('../../web/server');

const Writer = require('../../plugins/mysql/writer');
this.writer = new Writer(()=> {});

const Reader = require('../../plugins/mysql/reader');
this.reader = new Reader();


describe('routes : /api', () => {
  before(async () => {
    // create DB fields.
    return await this.writer.writeBacktest({
        roundtrips : {},
        trades : {},
        performanceReport : {}
    }, {
      backtest : {daterange : {
        from: "2020-01-1",
        to: "2020-02-1"
      }},
      tradingAdvisor : {method: "RES_SUP"},
      watch: { asset: "ETH", currency: "EUR"}
    });
    
  })

  after(async()=> {
    await server.close();
  })

  describe.only('api /', () => {
    it('should get backtest', (done) => {
      this.reader.getBacktests((err, rows)=> {
        const id = rows[0].id;
        chai.request(server)
        .get('/api/backtests/'+id)
        .end((err, res) => {
          should.not.exist(err);
          res.status.should.eql(200);
          done();
        });
      });
    });

    it('should delete backtest', (done) => {
      this.reader.getBacktests((err, rows)=> {
        const id = rows[0].id;

        chai.request(server)
        .delete('/api/backtests/'+id)
        .end((err, res) => {
          should.not.exist(err);
          res.status.should.eql(200);
          done();
        });
      });
   });
  });
});