<template lang='pug'>
  .contain
    .center
      h2 Backtests List
   
    table.full(v-if='backtests.length')
      thead
        tr
          th cur
          th asset
          th from
          th to
          th method
          th profit
          th action
      tbody
        tr(v-for='backtest in backtests', v-on:click='$router.push({path: `/backtests/${backtest.id}`})'  )
          td {{ backtest.currency }}
          td {{ backtest.asset }}
          td {{ fmt(backtest.datefrom) }}
          td {{ fmt(backtest.dateto) }}
          td {{ backtest.method }}
          td
            div {{ round(profit(backtest.backtest.performanceReport)) }} %
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