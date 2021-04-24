const chai = require('chai');
const should = chai.should();
const expect = chai.expect;
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
const moment = require('moment');
this.reader = new Reader();

const mocks = {
 backtest:  {
    roundtrips : {},
    trades : {},
    performanceReport : {}
  },
  config :  {
    backtest : {daterange : {
      from: "2020-01-1",
      to: "2020-02-1"
    }},
    tradingAdvisor : {method: "RES_SUP"},
    watch: { exchange: 'Bitstamp', asset: "BTC", currency: "USD"},
    mysql : {
      path: 'plugins/mysql',
      version: 0.1,
      host: 'localhost',
      database: 'cryptodbtest',
      user: 'crypto',
      password :'123456'
    }
  }, 
  performanceReport : { perfomance : 100 }
}

const gekko_test_id = 'test_123_gekko';

describe('routes : /api', () => {
  before(async () => {

    await this.writer.writeBacktest(mocks.backtest, mocks.config, mocks.performanceReport);
    
    const indicatorResult = { date: '2021-01-01', indicators : [{res : 10}]};
    await this.writer.writeIndicatorResult(gekko_test_id, indicatorResult, false);

  })

  after(async()=> {
    await server.close();
  })

  describe.only('api /', () => {
    it('should get backtests', (done) => {
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

    it('should update ', done => {
      this.writer.writeBacktest({ ...mocks.backtest, roundtrips : { a : 1, b : 2}}, mocks.config, mocks.performanceReport).then(()=> {
        this.reader.getBacktests((err, rows)=> {
          expect(rows.length).to.equal(1)
          const id = rows[0].id;
          chai.request(server)
          .get('/api/backtests/'+id)
          .end((err, res) => {
            should.not.exist(err);
            res.status.should.eql(200);
            done();
          });
        });
      })
    })
    it('should get indictor results', (done) => {
      const from = moment('2021-01-01').unix();
      const to = moment('2021-01-02').unix();

      this.reader.getIndicatorResults(gekko_test_id, from, to, (err, rows)=> {
        const id = rows[0].id;
        const config = { gekko_id: gekko_test_id, daterange : {from: '2020-01-01', to: '2021-01-02'}}
        chai.request(server)
        .post('/api/getIndicatorResults')
        .send({...mocks.config, ...config})
        .end((err, res) => {
          should.not.exist(err);
          res.should.be.json;
          res.body.should.be.a('array');
          res.body.length.should.equal(1)
          res.status.should.eql(200);
          done();
        });
      });
    });    
  
  })
})