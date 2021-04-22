<template lang='pug'>
  div(v-if = 'backtest')
    .hr.contain
    div.contain
      performanceSummary(:config='backtest.config', :roundtrips='backtest.backtest.roundtrips', :trades='backtest.backtest.trades', :report ='backtest.performance')
    .hr.contain
    div.contain
      chart(:roundtrips='backtest.backtest.roundtrips', :config='backtest.config')
    div.contain
      strong Parameters for {{backtest.config.tradingAdvisor.method}}
    div.contain {{parameters}}
</template>

<script>
  import _ from 'lodash'
  import { get } from '../../tools/ajax'
  import resultSummary from '../backtester/result/summary.vue'
  import chart from './chartSummary.vue'
  import performanceSummary from './performanceSummary.vue'


  export default {
    name: 'singleBacktest',
    data: () => {
      return {
       backtest: null 
      }
    },
    components: {
      resultSummary,
      chart,
      performanceSummary
    },
    computed: {
      id: function() {
        return this.$route.params.id;
      },
      config: function() {
        return _.get(this, 'backtest.config');
      },
      parameters: function() {
        const stratParameters = this.backtest.config[this.backtest.config.tradingAdvisor.method];
        return stratParameters;
      },
    },
    mounted: function() {
      get('backtests/'.concat(this.id), (error, response) => {
        this.backtest = response;
      });
    },
    methods: {
        moment: mom => moment.utc(mom),
        fmt: mom => moment.unix(mom).format('YYYY-MM-DD HH:mm'),
        round: n => (+n).toFixed(3)
    },
  }
</script>