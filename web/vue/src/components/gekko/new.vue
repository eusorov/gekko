<template lang='pug'>
  div.contain.my2
    div.mx1
      div.mx1
        h3 Start a new gekko
    div.grd
      div.grd-row-col-3-6.mx1
        div.mx1
          label(for='startFrom').wrapper Start Time for analyzing the data (UTC):
          input(v-model='startFrom')
      div.grd-row-col-3-6.mx1
        div.mx1
          label(for='startFrom').wrapper Current Time only for testing (UTC) (optional):
          input(v-model='currentTime')
    gekko-config-builder(v-on:config='updateConfig')
    .hr
    .txt--center(v-if='config.valid')
      a.w100--s.my1.btn--primary(href='#', v-on:click.prevent='start', v-if="!pendingStratrunner") Start
      spinner(v-if='pendingStratrunner')
</template>

<script>

import _ from 'lodash'
import Vue from 'vue'
import { post } from '../../tools/ajax'
import gekkoConfigBuilder from './gekkoConfigBuilder.vue'
import spinner from '../global/blockSpinner.vue'
import dataset from '../global/mixins/dataset'

export default {
  components: {
    gekkoConfigBuilder,
    spinner
  },
  data: () => {
    return {
      pendingStratrunner: false,
      config: {},
      startFrom: moment.utc('2018-10-01 00:00').format(),
      currentTime: moment.utc('2018-12-01 00:00').format()
    }
  },
  mixins: [ dataset ],
  computed: {
    gekkos: function() {
      return this.$store.state.gekkos;
    },
    watchConfig: function() {
      let raw = _.pick(this.config, 'watch', 'candleWriter');
      let watchConfig = Vue.util.extend({}, raw);
      watchConfig.type = 'market watcher';
      watchConfig.mode = 'realtime';
      return watchConfig;
    },
    requiredHistoricalData: function() {
      if(!this.config.tradingAdvisor || !this.config.valid)
        return;

      let stratSettings = this.config.tradingAdvisor;
      return stratSettings.candleSize * stratSettings.historySize;
    },
    gekkoConfig: function() {
      var startAt;

      if(!this.currentTime && !this.existingMarketWatcher)
        return;

      let startFrom = moment().utc();
      if (this.startFrom){
        startFrom = moment(this.startFrom).utc();
      }

      if(!this.requiredHistoricalData)
        startAt = startFrom.startOf('minute').format();
      else {
        // TODO: figure out whether we can stitch data
        // without looking at the existing watcher
        const optimal = startFrom.startOf('minute')
          .subtract(this.requiredHistoricalData, 'minutes')
          .hour(0).minute(0);

        startAt =  optimal.format();
      }

      let nodeipcEnabled  = true;
      if (this.currentTime){
        nodeipcEnabled = false;
      }
      const gekkoConfig = Vue.util.extend({
        market: {
          type: 'leech',
          from: startAt,
          currentTime : this.currentTime
        },
        mode: 'realtime',
        strategyUpdateWriter : { enabled: "true"},
        nodeipc : { enabled: nodeipcEnabled},
      }, this.config);

      gekkoConfig.candleWriter.enabled  = false;
      return gekkoConfig;
    },
    existingMarketWatcher: function() {
      const market = Vue.util.extend({}, this.watchConfig.watch);
      return _.find(this.gekkos, {config: {watch: market}});
    },
    exchange: function() {
      return this.watchConfig.watch.exchange;
    },
    existingTradebot: function() {
      return _.find(
        this.gekkos,
        g => {
          if(g.logType === 'tradebot' && g.config.watch.exchange === this.exchange) {
            return true;
          }

          return false;
        }
      );
    },
    availableApiKeys: function() {
      return this.$store.state.apiKeys;
    }
  },
  watch: {
    // start the stratrunner
    existingMarketWatcher: function(val, prev) {
      if(!this.pendingStratrunner)
        return;

      const gekko = this.existingMarketWatcher;

      if(gekko.events.latest.candle) {
        this.pendingStratrunner = false;

        this.startGekko((err, resp) => {
          this.$router.push({
            path: `/live-gekkos/${resp.id}`
          });
        });
      }
    }
  },
  methods: {
    updateConfig: function(config) {
      this.config = config;
    },
    checkAvailableHistoricalData: function() {
    // if we have anough historical data, just start the gekko.
      if (this.requiredHistoricalData){
        this.pendingStratrunner = true;
        const optimalUnix = moment().utc(this.startFrom).startOf('minute')
              .subtract(this.requiredHistoricalData, 'minutes')
              .hour(0).minute(0)
              .unix();

        const nowUnix = moment().utc().startOf('minute').subtract(4, 'hours').unix(); // allow max 4hours hole in our data, because we can get this from exchange

        return new Promise((resolve, reject)=> {
          this.scanDateRange(this.config, (sets)=> {
          //
          //console.log(sets);
          const setAvailable = sets.filter((set) => {
            //console.log((moment.unix(set.from).format()) + ' ' +moment.unix(optimalUnix).format()+ ' ' + moment.unix(set.to).format() +' '+ moment.unix(nowUnix).format());
            if((moment.unix(set.from)) <= moment.unix(optimalUnix) && moment.unix(set.to) >= moment.unix(nowUnix)){
              return true;
            }
          })

          if (setAvailable.length === 0){
              // promt enough historcal data!
            alert('You dont have enough historical data. Import first more data from exchange since: '+moment.unix(optimalUnix).format("YYYY-MM-DD"));
            reject();
          }else{
            console.log("alles super!")
            resolve();
          }
          });
        })
      }
    },
    start: function() {
      // if the user starts a tradebot we do some
      // checks first.
      if(this.config.type === 'tradebot') {
        if(this.existingTradebot) {
          let str = 'You already have a tradebot running on this exchange';
          str += ', you can only run one tradebot per exchange.';
          return alert(str);
        }

        if(!this.availableApiKeys.includes(this.exchange))
          return alert('Please first configure API keys for this exchange in the config page.')
      }

      // internally a live gekko consists of two parts:
      //
      // - a market watcher
      // - a live gekko (strat runner + (paper) trader)
      //
      // however if the user selected type "market watcher"
      // the second part won't be created
      if(this.config.type === 'market watcher') {

        // check if the specified market is already being watched
        if(this.existingMarketWatcher) {
          alert('This market is already being watched, redirecting you now...');
          this.$router.push({
            path: `/live-gekkos/${this.existingMarketWatcher.id}`
          });
        } else {
          this.startWatcher((error, resp) => {
            this.$router.push({
              path: `/live-gekkos/${resp.id}`
            });
          });
        }

      } else {
        this.checkAvailableHistoricalData().then((result)=>{
          if(this.existingMarketWatcher) {
            // the specified market is already being watched,
            // just start a gekko!

          } else {
            // the specified market is not yet being watched,
            // we need to create a watcher
            if (this.currentTime){ // if test currentTime is specified, start directly without watcher
              this.startGekko((err, resp) => {
                this.$router.push({
                  path: `/live-gekkos/${resp.id}`
                });
              });
            }else{
              this.startWatcher((err, resp) => {
                this.pendingStratrunner = resp.id;
              // now we just wait for the watcher to be properly initialized
              // (see the `watch.existingMarketWatcher` method)
              });
            }

            /*
            */
          }
        }).catch(()=> this.pendingStratrunner = false);
      }
    },
    routeToGekko: function(err, resp) {
      if(err || resp.error)
        return console.error(err, resp.error);

      this.$router.push({
        path: `/live-gekkos/${resp.id}`
      });
    },
    startWatcher: function(next) {
      post('startGekko', this.watchConfig, next);
    },
    startGekko: function(next) {
      post('startGekko', this.gekkoConfig, next);
    }
  }
}
</script>

<style>
</style>
