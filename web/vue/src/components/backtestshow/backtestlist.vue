<template lang='pug'>
  .contain
    .center
      h2 Backtests List
   
    table.full(v-if='backtests.length')
      thead
        tr
          th pair
          th date range
          th method
          th candlesize
          th profit
          th action
      tbody
        tr(v-for='backtest in backtests', v-on:click='$router.push({path: `/backtests/${backtest.id}`})'  )
          td {{ backtest.currency }}-{{ backtest.asset }}
          td {{ fmt(backtest.datefrom) }} - {{ fmt(backtest.dateto) }}
          td {{ backtest.method }}
          td {{ backtest.config.tradingAdvisor.candleSize }}
          td
            div {{ round(profit(backtest.performance)) }} %
          td
            a(v-on:click.stop='deleteBacktest(backtest.id)', class='w100--s my1 btn--red') delete
</template>

<script>
  import { get, deleteRes } from '../../tools/ajax'

  export default {
    name: 'backtestlist',
    data: () => {
      return {
       backtests: {}
      }
    },
    created: function() {
      this.getBacktests();
    },
    methods: {
        moment: mom => moment.utc(mom),
        fmt: mom => moment.unix(mom).format('YYYY-MM-DD HH:mm'),
        round: n => (+n).toFixed(3),
        profit : performanceReport => {
          if (performanceReport){
            return performanceReport.relativeProfit;
          }else {
            return 0;
          }
        },
        deleteBacktest: function(id) {
          console.log("clicked");
          deleteRes('backtests/'+id, () => {
            this.getBacktests();
          });
        },        
        getBacktests: function() {
          get('backtests', (error, response) => {
                  this.backtests = response;
                  });
        }
    },
  }
</script>